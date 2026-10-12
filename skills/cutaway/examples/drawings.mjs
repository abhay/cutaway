import * as k from "../upstream/kit/iso-kit.mjs";
import { examples } from "./catalog.mjs";
import { createModel } from "./models.mjs";
import { presentation } from "./view.mjs";
import { appearance, appearanceStyle } from "../glow/palettes.mjs";
import { glowCss, glowDefs } from "../glow/svg.mjs";

export const width = 820;
export const height = 500;
const base = { x: -125, y: -68, w: 250, d: 136, r: 8 };
export function projectionFor(id) {
  const bounds = {
    "token-bucket": { x: -78, y: -32, w: 60, d: 64, top: 112 },
    "lru-cache": { x: -101, y: -35, w: 203, d: 90, top: 54 },
    "connection-pool": { x: -96, y: -33, w: 192, d: 14, top: 91 },
    "circuit-breaker": { x: -100, y: -42, w: 200, d: 79, top: 62 },
  }[id];
  return k.fitProjection([...k.boxCorners(base, -18, 0), ...k.boxCorners(bounds, 0, bounds.top)], width, height, { pad: 42, azimuth: 42, elevation: 27 });
}

export function drawing(id, standalone = false, state = createModel(id).state, options = {}) {
  const settings = appearance({ palette: examples[id].palette, theme: standalone || "light", ...options });
  const prefix = `cutaway-${id}`;
  const P = projectionFor(id);
  const line = (d, tone = "lo") => k.lineSvg(d, { tone });
  const solid = (shape, accent = false, tone = "mid") => k.solidSvg(shape, { tone, lit: accent });
  const slab = (x, y, w, d, z, h, accent = false, r = 2) => solid(k.slabOf({ x, y, w, d, r }, z, h, P, 4, 0.5), accent);
  const cylinder = (x, y, r, z, h, accent = false) => solid(k.cylinder(x, y, r, z, h, P, 32, 0.4), accent);
  const group = (id, body, pieces) => `<g id="${id}"${"data-active" in (pieces[id] ?? {}) ? ' class="cutaway-active"' : ""} ${Object.entries(pieces[id] ?? {}).map(([name, value]) => `${name}="${value}"`).join(" ")}>${body}</g>`;
  const screws = (points, z) => points.map(([x, y]) => line(k.ring(x, y, 1.5, z, P, 12)) + line(k.lineOnTop([x - 0.8, y], [x + 0.8, y], z, P), "mid")).join("");

  function platform() {
    let body = `<path class="iso-halo" d="${k.haloOf(base, -18, 8, P)}"/>`;
    for (const [x, y] of k.corners(base, 18)) body += cylinder(x, y, 7, -18, 8);
    body += solid(k.slabOf(base, -10, 10, P, 8, 1.3), false, "lo");
    body += line(k.planOutline(k.insetPlan(base, 5), 0, P), "faint");
    body += screws(k.corners(base, 11), 0);
    body += slab(-104, 52, 60, 6, 0, 0.7);
    const ticks = k.topTicks(-100, -48, 4, 5, 52, 0.7, [2, 4], P);
    return body + line(ticks.minor, "lo") + line(ticks.major, "mid");
  }

  function dial(x, y, z, name, label, pieces) {
    const ticks = k.radialTicks(x, y, 19, 40, 5, z + 10, [1.4, 3], P);
    return cylinder(x, y, 23, z, 10) + line(k.knurl(x, y, 23, z + 6, z + 10, 54, P))
      + line(k.ring(x, y, 21, z + 10, P), "mid") + line(ticks.minor) + line(ticks.major, "mid")
      + `<path id="needle-${name}" class="iso-line" data-tone="lit" style="stroke-width:1.7" d="${pieces[`needle-${name}`].d}"/>`
      + cylinder(x, y, 1.7, z + 10, 1, true)
      + k.faceTextSvg(k.topMatrix([x, y + 8], z + 10, P), label, { size: 2.6, anchor: "middle", tone: "mid" });
  }

  function tokens(pieces) {
    let body = slab(-78, -32, 60, 64, 0, 9);
    for (const x of [-73, -23]) {
      body += cylinder(x, -24, 5, 9, 5) + cylinder(x, -24, 2.8, 14, 91);
    }
    body += slab(-78, -30, 60, 12, 105, 7) + screws([[-72, -24], [-24, -24]], 112);
    body += cylinder(-48, 0, 21, 9, 3);
    for (let i = 0; i < 20; i++) {
      body += group(`token-${i}`, cylinder(-48, 0, 17, 13 + i * 4.25, 3.2, true)
        + line(k.ring(-48, 0, 12, 16.2 + i * 4.25, P), "mid"), pieces);
    }
    body += slab(-66, 28, 36, 18, 0, 5);
    body += slab(-66, 28, 4, 18, 5, 13) + slab(-34, 28, 4, 18, 5, 13);
    body += group("gate", slab(-62, 29, 28, 13, 5, 3, true) + slab(-53, 39, 10, 5, 8, 5), pieces);
    body += screws([[-63, 30], [-33, 30]], 18);
    body += slab(21, -32, 61, 59, 0, 9) + screws([[25, -27], [76, 20]], 9);
    body += dial(50, -4, 9, "tokens", "FILL", pieces);
    body += cylinder(50, 37, 9, 0, 6) + line(k.knurl(50, 37, 9, 0, 6, 24, P));
    body += line(k.lineOnTop([50, 37], [50, 30], 6, P), "hi");
    return body;
  }

  function cache(pieces) {
    let body = slab(-101, -35, 203, 75, 0, 7);
    body += slab(-101, -35, 203, 5, 7, 46);
    for (const x of [-101, -34, 33, 97]) body += slab(x, -30, 5, 67, 7, 13);
    body += screws([[-97, -32], [98, -32]], 53);
    for (let i = 0; i < 3; i++) {
      const x = -91 + i * 66;
      body += slab(x, -24, 49, 55, 7, 2);
      body += line(k.lineOnTop([x + 3, -24], [x + 3, 31], 9, P)) + line(k.lineOnTop([x + 46, -24], [x + 46, 31], 9, P));
      let drawer = slab(x + 5, -20, 39, 53, 10, 3);
      drawer += slab(x + 5, -20, 3, 53, 13, 8) + slab(x + 41, -20, 3, 53, 13, 8);
      drawer += slab(x + 5, -20, 39, 3, 13, 8);
      drawer += group(`cache-part-${i}`, cylinder(x + 24.5, 3, 13, 13, 12, true)
        + line(k.ring(x + 24.5, 3, 7, 25, P), "mid")
        + `<text id="cache-key-${i}" transform="${k.topMatrix([x + 24.5, 6], 25.5, P)}" class="iso-face-text" data-tone="hi" text-anchor="middle" font-size="8">${pieces[`cache-key-${i}`].text}</text>`, pieces);
      drawer += slab(x + 4, 31, 41, 4, 10, 17) + screws([[x + 8, 33], [x + 41, 33]], 27);
      drawer += slab(x + 15, 35, 3, 6, 16, 4) + slab(x + 31, 35, 3, 6, 16, 4) + slab(x + 15, 39, 19, 3, 16, 4);
      body += group(`drawer-${i}`, drawer, pieces);
    }
    return body;
  }

  function pool(pieces) {
    let body = slab(-97, -36, 194, 22, 0, 8);
    for (const x of [-89, 89]) body += cylinder(x, -26, 5, 8, 5) + cylinder(x, -26, 3, 13, 78);
    body += slab(-96, -33, 192, 14, 81, 10) + screws([[-89, -26], [89, -26]], 91);
    for (let i = 0; i < 3; i++) {
      const x = -58 + i * 58;
      body += slab(x - 8, -28, 16, 17, 64, 8);
      body += cylinder(x, -15, 3, 61, 16);
      const tool = slab(x - 9, -19, 18, 10, 53, 6, true) + cylinder(x, -14, 4.5, 26, 27, true)
        + cylinder(x, -14, 6, 22, 4) + cylinder(x, -14, 2.3, 10, 12);
      body += group(`tool-${i}`, tool, pieces);
      body += slab(x - 15, 17, 30, 22, 0, 4);
      body += group(`job-${i}`, `<path class="cutaway-halo" d="${k.slabOf({ x: x - 9, y: 23, w: 18, d: 10, r: 2 }, 4, 3, P).fill}"/>` + slab(x - 9, 23, 18, 10, 4, 3, true), pieces);
      body += cylinder(x, 45, 3, 0, 2, true);
    }
    for (let i = 0; i < 4; i++) {
      const x = -92 + i * 16;
      body += slab(x, -60, 13, 13, 0, 2);
      body += group(`waiting-${i}`, slab(x + 2, -58, 9, 9, 2, 5, true), pieces);
    }
    return body;
  }

  function breaker(pieces) {
    let body = slab(-100, -42, 200, 79, 0, 8);
    body += slab(-45, -12, 30, 20, 8, 13);
    body += cylinder(-30, -2, 10, 21, 5) + line(k.knurl(-30, -2, 10, 21, 26, 28, P));
    body += `<defs><clipPath id="stem-clip"><path d="${k.slabOf({ x: -34, y: -6, w: 8, d: 8, r: 4 }, 26, 60, P).fill}"/></clipPath></defs>`;
    body += `<g clip-path="url(#stem-clip)">${group("stem", cylinder(-30, -2, 3, 1, 29), pieces)}</g>`;
    for (const x of [-78, 17]) {
      body += slab(x - 10, -17, 20, 30, 8, 6);
      body += cylinder(x, -2, 7, 14, 12) + cylinder(x, -2, 9, 26, 4);
      body += screws([[x, -11], [x, 7]], 30);
    }
    body += group("contact", slab(-78, -7, 95, 10, 30, 4, true)
      + cylinder(-74, -2, 4, 34, 3) + cylinder(13, -2, 4, 34, 3), pieces);
    for (let i = 0; i < 3; i++) {
      const x = -70 + i * 26;
      body += cylinder(x, 23, 7, 8, 3) + cylinder(x, 23, 2, 11, 8);
      body += group(`failure-${i}`, cylinder(x, 23, 4.5, 11, 8, true), pieces);
    }
    body += dial(66, -2, 8, "cooldown", "WAIT", pieces);
    body += screws([[-95, -37], [95, -37], [-95, 32], [95, 32]], 8);
    return body;
  }

  const { pieces, detail } = presentation(id, state, P);
  const mechanisms = { "token-bucket": tokens, "lru-cache": cache, "connection-pool": pool, "circuit-breaker": breaker };
  return k.figureSvg({ width, height, label: `${examples[id].description} ${detail}`, standalone,
    body: `${glowDefs(prefix, { width, height })}<style>${glowCss(prefix)}</style>${platform()}${mechanisms[id](pieces)}`,
  }).replace("<svg", `<svg data-glow="${prefix}" data-presentation="${settings.presentation}" data-palette="${settings.palette}"${standalone ? "" : ` data-theme="${settings.theme}"`} style="${appearanceStyle(settings)}"`);
}
