import { readdirSync } from "node:fs";
import { join } from "node:path";

export function filesBelow(root, prefix = "") {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Package resources can't be symbolic links: ${path}`);
    return entry.isDirectory() ? filesBelow(root, path) : [path];
  }).sort();
}

export function packageFiles(root) {
  return ["plugin.json", "README.md", "LICENSE", "THIRD_PARTY.md", "upstream-files.json",
    ...filesBelow(join(root, "assets")).map((path) => `assets/${path}`),
    ...filesBelow(join(root, "skills")).filter((path) => !path.endsWith(".html")).map((path) => `skills/${path}`),
  ].sort();
}
