import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { filesBelow, packageFiles } from "./files.mjs";
import { hardwareArtifacts } from "../site/catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
const { name, version } = manifest;
const output = join(root, "dist/releases", version);
const source = join(output, "source");
if (existsSync(join(source, ".git"))) throw new Error("The release source contains a Git repository. Move it outside dist before rebuilding to preserve its history.");
for (const task of ["test", "examples", "hardware", "package"]) {
  execFileSync("bun", ["run", task], { cwd: root, stdio: "inherit" });
}

rmSync(source, { recursive: true, force: true });
mkdirSync(source, { recursive: true });
const sourcePaths = [...packageFiles(root), "package.json", "bun.lock", ".gitignore",
  ...filesBelow(join(root, "server")).map((path) => `server/${path}`),
  ...filesBelow(join(root, "app")).map((path) => `app/${path}`),
  ...filesBelow(join(root, "scripts")).map((path) => `scripts/${path}`),
  ...filesBelow(join(root, "tests")).map((path) => `tests/${path}`),
  ...filesBelow(join(root, "site")).map((path) => `site/${path}`),
];
for (const path of sourcePaths) {
  mkdirSync(dirname(join(source, path)), { recursive: true });
  cpSync(join(root, path), join(source, path));
}

const catalogPath = ".agents/plugins/marketplace.json";
mkdirSync(dirname(join(source, catalogPath)), { recursive: true });
writeFileSync(join(source, catalogPath), JSON.stringify({
  name: "cutaway-community",
  interface: { displayName: "Cutaway" },
  plugins: [{
    name,
    source: { source: "local", path: "./" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: manifest.extensions["com.openai"].interface.category,
  }],
}, null, 2) + "\n");

const artifacts = [];
function archive(filename, directory, paths) {
  const target = join(output, filename);
  rmSync(target, { force: true });
  execFileSync("zip", ["-q", "-X", target, "-@"], { cwd: directory, input: paths.sort().join("\n") + "\n" });
  execFileSync("unzip", ["-tq", target], { stdio: "inherit" });
  artifacts.push(filename);
}

const pluginZip = `${name}-${version}.zip`;
cpSync(join(root, "dist", pluginZip), join(output, pluginZip));
artifacts.push(pluginZip);
archive(`${name}-${version}-source.zip`, source, [...sourcePaths, catalogPath]);
const marketplace = join(root, "dist/workspace-marketplace");
archive(`${name}-${version}-marketplace.zip`, marketplace, filesBelow(marketplace));
const examples = join(root, "dist/examples");
archive(`${name}-${version}-examples.zip`, examples, filesBelow(examples).filter((path) => /\.(?:html|svg)$/.test(path)));
const hardware = join(root, "dist/hardware");
archive(`${name}-${version}-hardware.zip`, hardware, hardwareArtifacts);

const checksums = artifacts.map((filename) => `${createHash("sha256").update(readFileSync(join(output, filename))).digest("hex")}  ${filename}`);
writeFileSync(join(output, "SHA256SUMS"), checksums.join("\n") + "\n");
console.log(`Release artifacts and public source tree: ${output}`);
console.log("Release built locally. Browser checks and plugin submission are separate steps.");
