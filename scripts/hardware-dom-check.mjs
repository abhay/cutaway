import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { check as checkAviation } from "../tests/aviation-dom.mjs";
import { check as checkEspresso } from "../tests/espresso-dom.mjs";
import { check as checkPistons } from "../tests/piston-dom.mjs";

const root = resolve(import.meta.dir, "..");
const directory = resolve(process.argv[2] ?? join(root, "dist/hardware"));
const reports = [];
for (const check of [checkAviation, checkEspresso, checkPistons]) reports.push(await check(directory));
const output = join(root, "dist/verification");
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "hardware-report.json"), JSON.stringify({
  reports,
  limitations: ["DOM checks don't cover browser layout, native keyboard behavior, rendered SVG quality, or ChatGPT previews."],
}, null, 2) + "\n");
console.log("Hardware demo controls, drawing updates, offline operation, and animation lifecycle checks passed.");
