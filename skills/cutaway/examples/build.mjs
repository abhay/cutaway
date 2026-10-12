import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ISO_CSS } from "../upstream/kit/iso-kit.mjs";
import { examples } from "./catalog.mjs";
import { createModel } from "./models.mjs";
import { drawing, projectionFor } from "./drawings.mjs";
import { presentation } from "./view.mjs";
import { appearance, appearanceStyle, palettes } from "../glow/palettes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const credit = 'Cutaway · <a href="https://github.com/wheresryan22/anatomy">Ryan’s /anatomy</a> · Glow adapted from <a href="https://isoglow.dev/">April Zhu’s iso-glow</a>, based on Tolga Cohce’s iso-figure';
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const button = (action, label, value, primary = false) => `<button type="button" data-action="${action}"${value === undefined ? "" : ` data-value="${value}"`}${primary ? ' class="primary"' : ""}>${label}</button>`;
const licenses = ["LICENSE", "../upstream/LICENSE", "../glow/LICENSE"].map((path) => readFileSync(join(here, path), "utf8")).join("\n\n");

function standaloneSvg(id, settings) {
  const { theme, variables: colors } = settings;
  const base = ISO_CSS.match(/\.iso\{([^}]+)\}/)[1];
  const light = theme === "light" ? ISO_CSS.match(/\.iso\[data-theme="light"\]\{([^}]+)\}/)[1] : "";
  const variables = Object.fromEntries([...`${base};${light}`.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)].map(([, key, value]) => [key, value.trim()]));
  Object.assign(variables, colors);
  if (theme === "dark") Object.assign(variables, { "--anatomy-top": "#38433e", "--anatomy-shade-0": "#1d2420", "--anatomy-shade-1": "#252d28", "--anatomy-shade-2": "#2d3730", "--anatomy-shade-3": "#344037", "--anatomy-mid": "#91a195", "--anatomy-lo": "#69796e", "--anatomy-faint": "#424e46" });
  return drawing(id, theme, snapshot(id), settings)
    .replace("><style>", `><metadata>${escape(licenses)}</metadata><rect width="100%" height="100%" fill="${colors["--anatomy-paper"]}"/><style>`)
    .replace(/var\((--[\w-]+)\)/g, (match, key) => variables[key] ?? match);
}

function appearanceControls(settings) {
  const option = (value, label, selected) => `<option value="${escape(value)}"${value === selected ? " selected" : ""}>${escape(label)}</option>`;
  const groups = [...new Set(palettes.map((item) => item.family))].map((family) => `<optgroup label="${family}">${palettes.filter((item) => item.family === family).map((item) => option(item.id, item.name, settings.palette)).join("")}</optgroup>`).join("");
  return `<div class="appearance" role="group" aria-label="Appearance"><label for="presentation">Style<select id="presentation" name="presentation">${option("technical", "Technical", settings.presentation)}${option("glow", "Glow", settings.presentation)}</select></label><label for="theme">Theme<select id="theme" name="theme">${option("light", "Light", settings.theme)}${option("dark", "Dark", settings.theme)}</select></label><label for="palette">Palette<select id="palette" name="palette">${groups}</select></label><p>Glow lights active parts in dark mode; light mode uses flat accents.</p></div>`;
}

function controls(id) {
  let content = "";
  if (id === "token-bucket") {
    content = `<div class="actions">${button("request", "Send request", undefined, true)}${button("burst", "Burst of 11")}</div>`;
    content += `<label for="capacity">Capacity <output id="capacity-value">10</output><input id="capacity" data-action="capacity" type="range" min="2" max="20" value="10"></label>`;
    content += `<label for="rate">Tokens per second <output id="rate-value">2</output><input id="rate" data-action="rate" type="range" min="0" max="5" step="0.5" value="2"></label>`;
  } else if (id === "lru-cache") {
    content = `<div class="actions">${["A", "B", "C", "D"].map((key) => button("request", `Request ${key}`, key, true)).join("")}</div>`;
  } else if (id === "connection-pool") {
    content = `<div class="actions">${button("request", "Submit job", undefined, true)}</div>`;
    content += [0, 1, 2].map((index) => `<div class="slot"><span><strong>TOOL ${index + 1}</strong><span id="slot-${index}">Available</span></span>${button("release", "Return", index)}</div>`).join("");
  } else {
    content = `<div class="actions">${button("request", "Send request", undefined, true)}${button("service", "Fail downstream")}${button("resolve", "Resolve probe")}</div>`;
  }
  if (id !== "lru-cache") content += `<div class="clock"><div class="clock-head"><output id="time">0.0 s</output><span id="clock-state">Paused · manual steps</span></div><div class="actions">${button("step", "+1 second")}${button("play", "Run clock")}${button("reset", "Reset")}</div></div>`;
  else content += `<div class="actions">${button("reset", "Reset cabinet")}</div>`;
  return content;
}

function snapshot(id) {
  const model = createModel(id);
  if (id === "token-bucket") { model.act("burst"); model.advance(1); }
  if (id === "lru-cache") for (const key of ["A", "B", "C", "A", "D"]) model.act("request", key);
  if (id === "connection-pool") for (let i = 0; i < 8; i++) model.act("request");
  if (id === "circuit-breaker") { model.act("service"); for (let i = 0; i < 3; i++) model.act("request"); }
  return model.state;
}

export async function buildExample(id, output, theme = "light", options = {}) {
  if (!examples[id]) throw new Error(`Unknown example: ${id}`);
  if (!["light", "dark"].includes(theme)) throw new Error(`Unknown theme: ${theme}`);
  const entry = examples[id];
  const settings = appearance({ palette: entry.palette, ...options, theme });
  const state = createModel(id).state;
  const projection = projectionFor(id);
  const view = presentation(id, state, projection);
  const compiled = await Bun.build({ entrypoints: [join(here, "live.mjs")], target: "browser", format: "iife", minify: false });
  if (!compiled.success) throw new AggregateError(compiled.logs, "Couldn't bundle the example controls");
  const script = (await compiled.outputs[0].text()).replace(/<\/script/gi, "<\\/script");
  const variables = appearanceStyle(settings);
  const html = `<!doctype html>
<!-- Licenses\n${licenses}-->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escape(entry.description)}"><title>${escape(entry.subtitle)} · Cutaway</title><style>${ISO_CSS}\n${readFileSync(join(here, "style.css"), "utf8")}</style></head>
<body class="iso" data-theme="${theme}" data-presentation="${settings.presentation}" data-palette="${settings.palette}" data-example="${id}" style="${variables}"><main>
<div class="masthead"><span class="brand">Cutaway / Software</span><span>Demo ${entry.number}</span></div>
<header><h1>${escape(entry.title)}</h1><p class="intro" id="mechanism-description">${escape(entry.description)}</p></header>
${appearanceControls(settings)}
<noscript>Enable JavaScript to use the controls. The drawing below shows the initial state.</noscript>
<section class="bench" aria-label="Interactive ${escape(entry.subtitle)}">
<figure><div class="figure-label"><span>Active parts highlighted</span></div><div class="stage">${drawing(id, false, state, settings)}</div><figcaption>${escape(entry.lesson)} <span class="glow-meaning">${escape(entry.glowMeaning)}</span></figcaption></figure>
<div class="controls"><h2>Controls</h2><dl class="metrics">${view.metrics.map(([label, value], index) => `<div><dt>${label}</dt><dd id="metric-${index}">${escape(value)}</dd></div>`).join("")}</dl><p class="detail" id="detail">${escape(view.detail)}</p>${controls(id)}<p class="message" id="message">${escape(state.message)}</p><div id="announcement" class="sr-only" aria-live="polite" aria-atomic="true"></div></div>
</section>
<section class="notes"><div><h2>Try the controls</h2><p>${escape(entry.experiment)}</p></div><div><h2>Keyboard controls</h2><p>Use Tab to reach a control, Enter or Space to activate a button, and arrow keys to adjust a slider.</p></div></section>
<p class="assumptions"><strong>Model assumptions.</strong> ${escape(entry.assumptions)}</p>
<details><summary>Recent activity</summary><ol id="events"></ol></details>
<footer><span>${credit}</span><span>Works offline · No account or network required</span></footer>
</main><script id="projection" type="application/json">${JSON.stringify(projection)}</script><script>${script}</script></body></html>\n`;
  mkdirSync(output, { recursive: true });
  const stem = `${id}${theme === "light" ? "-light" : ""}`;
  const htmlPath = join(output, `${stem}.html`);
  writeFileSync(htmlPath, html);
  const svg = standaloneSvg(id, settings);
  writeFileSync(join(output, `${stem}.svg`), svg + "\n");
  console.log(`Built ${htmlPath}`);
  return htmlPath;
}

if (import.meta.main) {
  const [id = "all", destination = "dist/examples"] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const output = resolve(destination);
  const themes = process.argv.includes("--both") ? ["light", "dark"] : [process.argv.includes("--dark") ? "dark" : "light"];
  const ids = id === "all" ? Object.keys(examples) : [id];
  for (const name of ids) for (const theme of themes) await buildExample(name, output, theme);
  if (id === "all") {
    const links = ids.map((name) => {
      const item = examples[name];
      const suffix = themes.includes("light") ? "-light" : "";
      return `<article><a href="${name}${suffix}.html"><img src="${name}${suffix}.svg" alt="${escape(item.description)}"><h2>${escape(item.title)}</h2></a><p>${escape(item.experiment)}</p><p>${themes.map((theme) => `<a href="${name}${theme === "light" ? "-light" : ""}.html">${theme === "light" ? "Light" : "Dark"} HTML</a> · <a href="${name}${theme === "light" ? "-light" : ""}.svg">SVG</a>`).join(" · ")}</p></article>`;
    }).join("");
    writeFileSync(join(output, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cutaway · Software mechanisms</title><style>${readFileSync(join(here, "style.css"), "utf8")}body{--accent:#3c7564}.gallery{display:grid;grid-template-columns:1fr 1fr;gap:32px}article{border-top:1px solid var(--rule);padding:12px 0}article img{width:100%;background:var(--panel)}a{color:inherit}article>a{text-decoration:none}article p{color:var(--muted)}@media(max-width:700px){.gallery{grid-template-columns:1fr}}</style></head><body class="iso"><main><div class="masthead"><span class="brand">Cutaway / Software</span><span>4 demos</span></div><header><h1>Software mechanisms</h1><p class="intro">Use these 4 demos to see how rate limits, caches, connection pools, and circuit breakers work. Open a demo and try the controls.</p></header><div class="gallery">${links}</div><footer><span>${credit}</span><span>Standalone HTML + editable SVG · Works offline</span></footer></main></body></html>\n`);
  }
}
