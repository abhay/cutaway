import { models, normalizeState } from "../app/models.mjs";
import { wingBody } from "../site/hardware/wing-view.mjs";
import { boxerSpec, engineDrawing } from "../site/hardware/boxer-scene.mjs";
import { espressoFrame, espressoProjection } from "../site/hardware/espresso-model.mjs";

export async function loadAsset(env, path) {
  const response = await env.ASSETS.fetch(new Request(`https://cutaway.abhay.gg${path}`));
  if (!response.ok) throw new Error("Missing built asset");
  return response.text();
}

export async function exportView(env, id, input, format) {
  const state = normalizeState(id, input);
  if (format === "html") {
    const html = await loadAsset(env, `/app/${id}.html`);
    const initial = JSON.stringify({ model: id, state }).replaceAll("<", "\\u003c");
    return html.replace('<script id="cutaway-initial" type="application/json">null</script>', `<script id="cutaway-initial" type="application/json">${initial}</script>`);
  }
  let svg = await loadAsset(env, `/examples/${id}.svg`);
  const rewriter = new HTMLRewriter();
  const attributes = (selector, values) => rewriter.on(selector, {
    element(element) {
      for (const [name, value] of Object.entries(values)) element.setAttribute(name, String(value));
    },
  });
  const content = (selector, text, html = false) => rewriter.on(selector, { element: (element) => element.setInnerContent(text, { html }) });
  const description = (text) => {
    // HTMLRewriter skips SVG description elements. Our generated descriptions contain only text.
    const escaped = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
    svg = svg.replace(/(<desc\b[^>]*>)[^<]*(<\/desc>)/, (_, start, end) => start + escaped + end);
  };
  if (id === "jet-engine") attributes("svg", { "data-stage": state.component, "data-flow": state.flow });
  if (id === "wing") {
    content("#wing-mechanism", wingBody(state), true);
    description(`${state.shape} wing; flap ${state.flap} degrees; slat ${state.slat ? "extended" : "retracted"}; upper skin ${state.skin ? "closed" : "open"}.`);
  }
  if (id === "boxer") {
    content("#engine-geometry", engineDrawing(boxerSpec(), state.angle, state.pair - 1), true);
    description(`Four-cylinder boxer engine at ${state.angle} degrees, highlighting opposing pair ${state.pair}. Separate crankpins connect the opposed pistons.`);
  }
  if (id === "espresso") {
    for (const change of espressoFrame(espressoProjection, state.progress / 1000 * 22)) attributes(change.selector, change.attributes);
    attributes("svg", { "data-stage": state.stage.toLowerCase() });
    attributes(`[data-component="${state.component}"]`, { "data-selected": "true", style: "filter:drop-shadow(0 0 6px #f2c27755)" });
    description(`${models[id].title}: ${state.stage} stage, highlighting the ${state.component}. A generic pump-driven brew circuit.`);
  }
  return rewriter.transform(new Response(svg, { headers: { "Content-Type": "image/svg+xml" } })).text();
}
