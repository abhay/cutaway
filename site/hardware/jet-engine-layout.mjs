import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const escape = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export async function notices() {
  const licenses = await Promise.all([
    readFile(new URL("../../LICENSE", import.meta.url), "utf8"),
    readFile(new URL("../../skills/cutaway/upstream/LICENSE", import.meta.url), "utf8"),
    readFile(new URL("../../skills/cutaway/glow/LICENSE", import.meta.url), "utf8"),
  ]);
  return licenses.join("\n\n");
}

export async function bundle(entrypoint) {
  const result = await Bun.build({ entrypoints: [entrypoint], target: "browser", format: "iife", minify: true });
  if (!result.success) throw new Error(result.logs.join("\n"));
  return (await result.outputs[0].text()).replaceAll("</script", "<\\/script");
}

const CSS = `
:root{color-scheme:dark;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eeeede;background:#141813;font-synthesis:none}
*{box-sizing:border-box}body{margin:0;line-height:1.55}main{width:min(100%,880px);margin:auto;padding:36px 28px 28px}h1,h2,p{margin:0}h1{font-size:32px;line-height:1.2;letter-spacing:-1px;font-weight:550;margin:9px 0 12px}h2{font-size:16px;font-weight:600}header>p{color:#acb5a6;max-width:650px;font-size:14px}header{margin-bottom:18px}.figure{width:100%;overflow:hidden}.figure svg{width:100%;height:auto;display:block}.controls{display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;padding:15px 0;border-top:1px solid #343d31}.controls>label,.control-label{font-size:12px;color:#b9c1b2;display:flex;align-items:center;gap:9px}.controls>label>span{white-space:nowrap}input,select,button{font:inherit;accent-color:#efd296}button,select{color:#ebedde;background:#21281f;border:1px solid #46523f;border-radius:4px;min-height:38px;padding:8px 11px;font-size:12px}select{max-width:100%}button{cursor:pointer}button:hover,select:hover{border-color:#92a486}button:disabled{opacity:.55;cursor:default}button[aria-pressed=true]{color:#f6dca9;border-color:#b79d67;background:#3a3425}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid #efd296;outline-offset:4px}input[type=checkbox]{width:17px;height:17px;margin:0}input[type=range]{max-width:180px;width:32vw}.stages{display:flex;gap:6px;flex-wrap:wrap;flex-basis:100%}.stages button{flex:1;white-space:nowrap}.readout{padding:17px 0 19px;border-top:1px solid #343d31;min-height:104px}.readout h2{color:#edcf94;margin-bottom:5px}.readout p{font-size:13px;color:#c0c8b8;max-width:760px}.legend{display:flex;gap:18px;flex-wrap:wrap;color:#adb9a6;font-size:11px;padding:0 0 12px}.key{display:inline-block;width:19px;height:2px;background:#75d4cd;vertical-align:middle;margin-right:6px}.key.hot{background:#efbc79}.key.structure{background:#b4c4a5}.fine{font-size:11px;color:#99a78e;line-height:1.7}.notes{border-top:1px solid #343d31;padding-top:19px;margin-top:3px}.notes p+p{margin-top:10px}a{color:#d7d8bb;text-underline-offset:3px}footer{font-size:11px;color:#99a78e;padding-top:24px}footer p+p{margin-top:8px}html[data-embed] main{padding:8px 18px 12px;width:100%}html[data-embed] header,html[data-embed] footer,html[data-embed] .notes{display:none}html[data-embed] .figure svg{max-height:310px}html[data-embed] .controls{padding:12px 0;gap:10px 14px}html[data-embed] .readout{padding:12px 0 4px;min-height:92px}html[data-embed] .readout p{font-size:12px}html[data-embed] .legend{padding-bottom:7px}@media(max-width:480px){main{padding:24px 18px}h1{font-size:28px}.stages button{padding:8px;font-size:11px}.controls{gap:12px}.readout{min-height:120px}html[data-embed] main{padding:5px 13px 10px}html[data-embed] .figure svg{min-height:210px}html[data-embed] .readout{min-height:112px}.legend{gap:12px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
`;

export async function writeDemo(outputDirectory, { id, title, introduction, svg, controls, readout, legend, notes, sources, runtime, license }) {
  await mkdir(outputDirectory, { recursive: true });
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${escape(title)} · Cutaway</title><style>${CSS}</style><script>if(new URLSearchParams(location.search).get("embed")==="1")document.documentElement.dataset.embed="true";</script></head>
<body><!-- ${license.replaceAll("--", "—")} --><main><header><h1>${escape(title)}</h1><p>${escape(introduction)}</p></header>
<div class="figure">${svg}</div><div class="legend">${legend}</div><section class="controls" aria-label="Explore ${escape(title)}">${controls}</section>
<section class="readout" aria-live="polite" aria-atomic="true">${readout}</section><section class="notes fine">${notes}<p>Further reading: ${sources.map(([name, url]) => `<a href="${escape(url)}" target="_blank" rel="noreferrer">${escape(name)}</a>`).join(" · ")}</p></section>
<footer><p>Drawn with <a href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noreferrer">Ryan’s /anatomy</a>. Glow adapted from <a href="https://isoglow.dev/" target="_blank" rel="noreferrer">April Zhu’s iso-glow</a>, based on Tolga Cohce’s iso-figure.</p><p>Cutaway by <a href="https://abhay.gg/" target="_blank" rel="noreferrer">Abhay</a>. Simplified geometry for learning about the parts; performance isn’t calculated.</p></footer></main><script>${runtime}</script></body></html>`;
  await Promise.all([
    writeFile(join(outputDirectory, `${id}.html`), html),
    writeFile(join(outputDirectory, `${id}.svg`), svg),
  ]);
}
