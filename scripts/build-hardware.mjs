import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { hardwareTopics } from "../site/catalog.mjs";

const root = resolve(import.meta.dir, "..");
const output = resolve(process.argv[2] ?? join(root, "dist/hardware"));
mkdirSync(output, { recursive: true });
for (const topic of hardwareTopics) {
  const { build } = await import(pathToFileURL(join(root, "site/hardware", `${topic.id}.mjs`)).href);
  await build(output);
}
const escape = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const cards = hardwareTopics.map(({ id, title, description, alt }) => `<article><a href="${id}.html"><img src="${id}.svg" width="820" height="500" alt="${escape(alt)}"><h2>${escape(title)} ↗</h2></a><p>${escape(description)}</p><a class="download" href="${id}.svg" download>Download SVG ↓</a></article>`).join("\n");
writeFileSync(join(output, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cutaway: hardware demos</title><style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#101210;color:#eeeee7;line-height:1.7}*{box-sizing:border-box}body{max-width:1080px;margin:auto;padding:45px 24px}h1{font-size:40px;font-weight:500;letter-spacing:-1px;line-height:1.2}h2{font-size:20px;font-weight:500;margin:12px 0 4px}p{color:#a5aca3}a{color:inherit;text-decoration:none}a:hover{color:#eed09a}a:focus-visible{outline:2px solid #eed09a;outline-offset:5px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:40px 0}img{display:block;width:100%;height:auto;aspect-ratio:820/500;object-fit:contain;background:#171b17;border:1px solid #343d30;border-radius:6px}article p{margin:0 0 12px}.download{font-size:12px;color:#eed09a}footer{border-top:1px solid #343d30;margin-top:35px;padding-top:20px;font-size:12px}@media(max-width:650px){.grid{grid-template-columns:1fr}h1{font-size:32px}}
</style></head><body><header><p>Cutaway · /anatomy, adapted for ChatGPT</p><h1>Learn how machines work.</h1><p>Open a demo and use its controls to study the parts. These files work offline. Each demo explains its assumptions and links to its references.</p></header><main class="grid">${cards}</main><footer>Cutaway by Abhay Kumar. Drawing toolkit: <a href="https://github.com/wheresryan22/anatomy">Ryan’s Anatomy</a>. Optional glow: <a href="https://isoglow.dev/">April Zhu’s iso-glow</a>, based on Tolga Cohce’s iso-figure. Applicable MIT notices are included in the demo files.</footer></body></html>\n`);
console.log(`Hardware demos built at ${output}`);
