import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { models } from "../app/models.mjs";

function dependencyNotices(root) {
  const seen = new Set();
  const notices = [];
  function visit(name, from) {
    let directory = from;
    while (!existsSync(join(directory, "node_modules", name, "package.json"))) {
      if (dirname(directory) === directory) throw new Error(`Missing dependency: ${name}`);
      directory = dirname(directory);
    }
    const folder = realpathSync(join(directory, "node_modules", name));
    if (seen.has(folder)) return;
    seen.add(folder);
    const manifest = JSON.parse(readFileSync(join(folder, "package.json"), "utf8"));
    const files = readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isFile() && /^(?:licen[cs]e|notice|copying)(?:\.|$)/i.test(entry.name));
    if (!files.length) throw new Error(`Missing license notice for ${name}`);
    notices.push(`${name}@${manifest.version}\n\n${files.map(({ name }) => readFileSync(join(folder, name), "utf8")).join("\n\n")}`);
    for (const dependency of Object.keys(manifest.dependencies ?? {})) visit(dependency, folder);
  }
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const name of Object.keys(manifest.dependencies)) visit(name, root);
  return notices.sort().join("\n\n");
}

export async function buildApp(root, output) {
  const directory = join(output, "app");
  mkdirSync(directory, { recursive: true });
  const scripts = {};
  for (const name of ["standalone", "widget"]) {
    const result = await Bun.build({ entrypoints: [join(root, `app/${name}.mjs`)], target: "browser", format: "iife", minify: true });
    if (!result.success) throw new AggregateError(result.logs, `Couldn't build ${name}`);
    scripts[name] = (await result.outputs[0].text()).replaceAll("</script", "<\\/script");
  }
  const styles = `<style>
    [hidden]{display:none!important}.cutaway-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:16px 0;margin:0;border-top:1px solid #46523f;font:12px system-ui,sans-serif}.cutaway-actions a{color:inherit}.cutaway-status{font:13px/1.5 system-ui,sans-serif;margin:0;padding:12px 18px}.cutaway-status:empty{display:none}
    html[data-cutaway-widget] main{padding:16px 18px;max-width:100%}html[data-cutaway-widget] header{margin-bottom:12px}html[data-cutaway-widget] header h1{font-size:22px;margin:0 0 8px}html[data-cutaway-widget] header p{font-size:13px}html[data-cutaway-widget] .back,html[data-cutaway-widget] footer{display:none}html[data-cutaway-widget] .drawing svg,html[data-cutaway-widget] .figure svg{max-height:340px}html[data-cutaway-widget] .drawing-layout{grid-template-columns:minmax(0,1fr) 210px}html[data-cutaway-widget] .notes{font-size:12px}html[data-cutaway-widget] .notes summary{cursor:pointer;padding:12px 0}html[data-cutaway-widget] .notes h2{margin-top:12px}
    @media(max-width:600px){html[data-cutaway-widget] .drawing-layout{grid-template-columns:1fr}html[data-cutaway-widget] main{padding:12px}.cutaway-actions{gap:10px}}
  </style>`;
  for (const id of Object.keys(models)) {
    const original = readFileSync(join(root, `dist/hardware/${id}.html`), "utf8");
    const links = `<nav class="cutaway-actions" aria-label="Cutaway downloads"><a data-cutaway-link="view" target="_blank" rel="noreferrer">Open in browser</a><a data-cutaway-link="html" target="_blank" rel="noreferrer">Download HTML</a><a data-cutaway-link="svg" target="_blank" rel="noreferrer">Download SVG</a></nav>`;
    const base = original.replace('<html lang="en">', `<html lang="en" data-cutaway-model="${id}">`).replace("</head>", `${styles}</head>`).replace("</main>", `${links}</main>`);
    writeFileSync(join(directory, `${id}.html`), base.replace("</body>", `<script id="cutaway-initial" type="application/json">null</script><script>${scripts.standalone}</script></body>`));
    const widget = base.replace('data-cutaway-model=', 'data-cutaway-widget="true" data-cutaway-model=')
      .replace(/<section class="notes([^\"]*)">([\s\S]*?)<\/section>/, '<details class="notes$1"><summary>About this model and sources</summary>$2</details>')
      .replace('<nav class="cutaway-actions"', '<button id="cutaway-discuss" type="button" hidden>Discuss this view</button><nav class="cutaway-actions"')
      .replace("<body>", '<body><p id="cutaway-status" class="cutaway-status" role="status">Opening cutaway…</p>')
      .replace("</body>", `<script>${scripts.widget}</script></body>`);
    writeFileSync(join(directory, `${id}-widget.html`), widget);
  }
  const worker = await Bun.build({ entrypoints: [join(root, "server/worker.mjs")], target: "browser", format: "esm", minify: true });
  if (!worker.success) throw new AggregateError(worker.logs, "Couldn't build the Pages worker");
  const licenses = ["LICENSE", "skills/cutaway/upstream/LICENSE", "skills/cutaway/glow/LICENSE"].map((path) => readFileSync(join(root, path), "utf8")).join("\n\n") + "\n\n" + dependencyNotices(root);
  writeFileSync(join(output, "server-licenses.txt"), licenses);
  writeFileSync(join(output, "_worker.js"), `/*\n${licenses.replaceAll("*/", "* /")}\n*/\n${await worker.outputs[0].text()}`);
  writeFileSync(join(output, "_routes.json"), JSON.stringify({ version: 1, include: ["/mcp", "/health", "/view/*", "/export/*"], exclude: [] }, null, 2) + "\n");
}
