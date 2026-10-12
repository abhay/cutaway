import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { filesBelow, packageFiles } from "./files.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
assert.equal(manifest.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
assert.match(manifest.name, /^[a-z][a-z0-9-]{0,63}$/);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.ok(manifest.description.trim());
assert.equal(manifest.version, JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version, "Package and plugin versions must agree");
const listing = manifest.extensions["com.openai"].interface;
for (const [field, limit] of [["displayName", 30], ["shortDescription", 30], ["longDescription", 4000]]) {
  assert.equal(typeof listing[field], "string", `${field} must be text`);
  assert.ok(listing[field].trim().length > 0 && [...listing[field]].length <= limit, `${field} must contain 1–${limit} characters for public submission`);
}
assert.ok(!/[\r\n]/.test(listing.displayName + listing.shortDescription), "Listing titles must fit on 1 line");
const prompts = Array.isArray(listing.defaultPrompt) ? listing.defaultPrompt : [listing.defaultPrompt];
assert.ok(prompts.length > 0 && prompts.length <= 3, "Provide 1 to 3 starter prompts");
for (const prompt of prompts) {
  assert.equal(typeof prompt, "string");
  assert.ok(prompt.trim() && [...prompt].length <= 128 && !/[\r\n@]/.test(prompt), "Starter prompts must fit on 1 line within 128 characters, without mentions");
}
assert.equal(new Set(prompts.map((prompt) => prompt.normalize("NFKC").trim().replace(/\s+/g, " "))).size, prompts.length, "Starter prompts must be unique");
const resources = new Set(packageFiles(root));
for (const field of ["logo", "logoDark", "composerIcon", "composerIconDark"]) {
  const path = listing[field];
  if (path === undefined && field.endsWith("Dark")) continue;
  assert.equal(typeof path, "string", `${field} is required for distribution`);
  assert.ok(path.startsWith("./assets/") && !path.split("/").includes(".."), `${field} must reference a local asset`);
  assert.ok(resources.has(path.slice(2)), `${field} must be included in the package`);
  const bytes = readFileSync(join(root, path));
  assert.ok(bytes.length <= 5 * 1024 * 1024, `${field} exceeds the icon size limit`);
  const viewBox = bytes.toString("utf8").match(/<svg\b[^>]*\bviewBox="0 0 (\d+) (\d+)"/);
  assert.ok(viewBox && Number(viewBox[1]) >= 48 && viewBox[1] === viewBox[2], `${field} must be a square SVG of at least 48 units`);
}

const skillDir = join(root, "skills", "cutaway");
const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
assert.ok(frontmatter, "SKILL.md needs YAML frontmatter");
const metadata = Bun.YAML.parse(frontmatter[1]);
assert.equal(metadata.name, "cutaway");
assert.equal(typeof metadata.description, "string");
for (const [, target] of skill.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
  if (/^https?:/.test(target)) continue;
  assert.ok(existsSync(resolve(skillDir, target)), `Missing skill resource: ${target}`);
}

const inventory = JSON.parse(readFileSync(join(root, "upstream-files.json"), "utf8"));
const upstream = join(skillDir, "upstream");
const vendored = filesBelow(upstream).filter((path) => !path.endsWith(".html"));
assert.deepEqual(Object.keys(inventory.files).sort(), vendored, "Update the vendor inventory when changing bundled resources");
for (const [path, expected] of Object.entries(inventory.files)) {
  const actual = createHash("sha256").update(readFileSync(join(upstream, path))).digest("hex");
  assert.equal(actual, expected, `Vendored source changed: ${path}`);
}

for (const path of [...packageFiles(root), ...filesBelow(join(root, "scripts")).map((path) => `scripts/${path}`)]) {
  assert.ok(existsSync(join(root, path)), `Missing package file: ${path}`);
  if (path.endsWith(".mjs")) execFileSync("node", ["--check", join(root, path)], { stdio: "pipe" });
  if (!/\.(?:mjs|tsx|ts)$/.test(path)) continue;
  const text = readFileSync(join(root, path), "utf8");
  const loader = path.endsWith(".tsx") ? "tsx" : path.endsWith(".ts") ? "ts" : "js";
  for (const imported of new Bun.Transpiler({ loader }).scan(text).imports) {
    if (!imported.path.startsWith(".")) continue;
    const target = resolve(dirname(join(root, path)), imported.path);
    assert.ok([target, `${target}.ts`, `${target}.tsx`].some(existsSync), `Missing import ${imported.path} in ${path}`);
  }
}

const inliner = await import("../skills/cutaway/upstream/scripts/inline-kit.mjs");
for (const render of [inliner.kitScript, inliner.glScript, inliner.turnScript]) {
  assert.ok(render().length > 0);
}
console.log("Plugin metadata, skill resources, source digests, syntax, and imports checked.");
