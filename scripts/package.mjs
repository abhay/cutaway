import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packageFiles } from "./files.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
execFileSync("bun", ["run", "check"], { cwd: root, stdio: "inherit" });
const { name, version } = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
const paths = packageFiles(root);
const stage = mkdtempSync(join(tmpdir(), "cutaway-package-"));
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

try {
  const plugin = join(stage, "workspace-marketplace", "plugins", name);
  for (const path of paths) {
    mkdirSync(dirname(join(plugin, path)), { recursive: true });
    cpSync(join(root, path), join(plugin, path));
  }
  const archive = join(stage, `${name}-${version}.zip`);
  execFileSync("zip", ["-q", "-X", archive, "-@"], { cwd: plugin, input: paths.join("\n") + "\n" });
  execFileSync("unzip", ["-tq", archive], { stdio: "inherit" });

  const marketplace = join(stage, "workspace-marketplace", ".agents", "plugins");
  mkdirSync(marketplace, { recursive: true });
  writeFileSync(join(marketplace, "marketplace.json"), JSON.stringify({
    name: "cutaway-workspace",
    interface: { displayName: "Cutaway Workspace" },
    plugins: [{
      name,
      source: { source: "local", path: `./plugins/${name}` },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Productivity",
    }],
  }, null, 2) + "\n");

  const archiveTarget = join(dist, `${name}-${version}.zip`);
  cpSync(archive, archiveTarget);
  const workspaceTarget = join(dist, "workspace-marketplace");
  rmSync(workspaceTarget, { force: true, recursive: true });
  cpSync(join(stage, "workspace-marketplace"), workspaceTarget, { recursive: true });
  console.log(`Plugin ZIP: ${archiveTarget}\nWorkspace import source: ${workspaceTarget}`);
} finally {
  rmSync(stage, { force: true, recursive: true });
}
