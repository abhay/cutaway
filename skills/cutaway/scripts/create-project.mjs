import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exampleIds } from "../examples/models.mjs";

const supported = ["dial-indicator", "desk-computer", ...exampleIds];
const usage = `Usage: bun create-project.mjs <new-directory> [--example ${supported.join("|")}]`;

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log(usage);
  process.exit(0);
}

const [destination, flag, selected] = args;
if (!destination || destination.startsWith("-") || (args.length !== 1 && (args.length !== 3 || flag !== "--example"))) {
  throw new Error(usage);
}
const example = selected ?? "dial-indicator";
if (!supported.includes(example)) {
  throw new Error(`Unknown example: ${example}`);
}
const output = resolve(destination);
if (existsSync(output)) throw new Error(`Destination already exists: ${output}`);

const upstream = resolve(dirname(fileURLToPath(import.meta.url)), "../upstream");
mkdirSync(output, { recursive: true });
cpSync(resolve(upstream, "../glow"), join(output, "glow"), { recursive: true });
const original = exampleIds.includes(example);
if (original) {
  cpSync(join(upstream, "kit"), join(output, "upstream", "kit"), { recursive: true });
  cpSync(join(upstream, "LICENSE"), join(output, "upstream", "LICENSE"));
  cpSync(resolve(upstream, "../examples"), join(output, "examples"), { recursive: true });
  writeFileSync(join(output, "build.mjs"), `import { buildExample } from "./examples/build.mjs";\nimport { dirname } from "node:path";\nimport { fileURLToPath } from "node:url";\nawait buildExample(${JSON.stringify(example)}, dirname(fileURLToPath(import.meta.url)), process.argv.includes("--light") ? "light" : "dark");\n`);
} else {
  for (const name of ["kit", "scripts"]) {
    cpSync(join(upstream, name), join(output, name), { recursive: true });
  }
  mkdirSync(join(output, "examples", example), { recursive: true });
  cpSync(join(upstream, "examples", example, "build.mjs"), join(output, "examples", example, "build.mjs"));
}
const licenses = ["../examples/LICENSE", "LICENSE"].map((path) => readFileSync(join(upstream, path), "utf8")).join("\n\n");
writeFileSync(join(output, "LICENSE"), licenses);
const build = original ? "build.mjs" : `examples/${example}/build.mjs`;
writeFileSync(join(output, "package.json"), JSON.stringify({
  private: true,
  type: "module",
  scripts: {
    build: `bun ${build} --light`,
    "build:dark": `bun ${build}`,
  },
}, null, 2) + "\n");
console.log(`Created ${output}\nBuild entry point: ${join(output, build)}`);
