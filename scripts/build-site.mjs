import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hardwareTopics, hardwareArtifacts } from "../site/catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "site");
const output = join(root, "dist/site");
const { version } = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
const release = join(root, "dist/releases", version);
const checksums = readFileSync(join(release, "SHA256SUMS"), "utf8");
const downloads = checksums.trim().split("\n").map((line) => {
  const [digest, filename] = line.split(/\s+/);
  if (!/^cutaway-\d+\.\d+\.\d+(?:-(?:source|marketplace|examples|hardware))?\.zip$/.test(filename)) throw new Error(`Unexpected release asset: ${filename}`);
  const bytes = readFileSync(join(release, filename));
  if (createHash("sha256").update(bytes).digest("hex") !== digest) throw new Error(`Release checksum mismatch: ${filename}`);
  return filename;
});
const bundle = await Bun.build({ entrypoints: [join(source, "app.mjs")], target: "browser", format: "iife", minify: true });
if (!bundle.success) throw new AggregateError(bundle.logs, "Website JavaScript failed to build");
const licenses = ["LICENSE", "skills/cutaway/upstream/LICENSE", "skills/cutaway/glow/LICENSE"].map((path) => readFileSync(join(root, path), "utf8")).join("\n\n");
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const cards = hardwareTopics.map(({ id, title, description, category, alt }, index) => `<article class="example-card"><a class="example-image" href="examples/${id}.html" aria-label="Open ${escape(title)} demo"><img src="examples/${id}.svg" width="820" height="500" alt="${escape(alt)}" loading="lazy" decoding="async"><span class="example-open" aria-hidden="true">↗</span></a><h3><span>${String(index + 1).padStart(2, "0")}</span><a href="examples/${id}.html">${escape(title)}</a></h3><p>${escape(description)}</p><div class="example-meta"><span>${escape(category)}</span><a href="examples/${id}.svg" download>SVG ↓</a></div></article>`).join("\n");
const substitutions = {
  version,
  cards,
  promptOptions: hardwareTopics.map(({ id, title }) => `<option value="${id}"${id === "espresso" ? " selected" : ""}>${escape(title)}</option>`).join(""),
  defaultPrompt: escape(hardwareTopics.find(({ id }) => id === "espresso").prompt),
};
const html = readFileSync(join(source, "index.html"), "utf8").replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in substitutions)) throw new Error(`Missing website value: ${key}`);
  return substitutions[key];
});

rmSync(output, { recursive: true, force: true });
for (const directory of ["downloads", "examples"]) mkdirSync(join(output, directory), { recursive: true });
writeFileSync(join(output, "index.html"), html);
writeFileSync(join(output, "app.js"), `/*\n${licenses.replace(/\*\//g, "* /")}\n*/\n${await bundle.outputs[0].text()}`);
for (const path of ["styles.css", "404.html", "social.png"]) cpSync(join(source, path), join(output, path));
cpSync(join(root, "assets/icon-dark.svg"), join(output, "icon.svg"));
for (const filename of downloads) cpSync(join(release, filename), join(output, "downloads", filename));
writeFileSync(join(output, "downloads/SHA256SUMS"), checksums);
for (const filename of hardwareArtifacts) {
  cpSync(join(root, "dist/hardware", filename), join(output, "examples", filename));
}
writeFileSync(join(output, "credits.txt"), readFileSync(join(root, "THIRD_PARTY.md"), "utf8") + "\n\n" + licenses);
writeFileSync(join(output, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://cutaway.abhay.gg/sitemap.xml\n");
writeFileSync(join(output, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://cutaway.abhay.gg/</loc></url></urlset>\n');
writeFileSync(join(output, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/downloads/*\n  Content-Disposition: attachment\n");
console.log(`Website built at ${output}; release ${version} downloads verified.`);
