import { boxerSpec } from "./boxer-scene.mjs";
import { writeEngineDemo } from "./boxer-document.mjs";

export async function build(outputDirectory) {
  return writeEngineDemo(boxerSpec(), outputDirectory);
}
