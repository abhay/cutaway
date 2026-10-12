import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..", "kit");
const strip = (file) => readFileSync(join(KIT, file), "utf8").replace(/^export /gm, "");

export function kitScript() {
  const source = readFileSync(join(KIT, "iso-kit.mjs"), "utf8");
  const pageHelpers = source.indexOf("export function figureSvg(");
  if (pageHelpers < 0) throw new Error("Cannot locate the kit's build-only page helpers");
  // Inline-preview validators also inspect script text, including unused page templates.
  return source.slice(0, pageHelpers).replace(/^export /gm, "");
}

export function glScript() {
  return strip("gl.mjs");
}

export function turnScript() {
  return strip("turn.mjs");
}
