import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../skills/cutaway/upstream/kit/iso-kit.mjs";
import * as g from "../../skills/cutaway/upstream/kit/lathe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 900;
const HEIGHT = 650;
const BASE = { x: -125, y: -69, w: 259, d: 170, r: 9 };
const P = k.fitProjection(k.boxCorners(BASE, -10, 171), WIDTH, HEIGHT, { pad: 48, azimuth: 55, elevation: 27 });
const PAINT = {
  steel: { fill: "#343e3c", top: "#67746d", edge: "#9ca99e", shades: ["#2d3634", "#394540", "#47564e", "#58665c"] },
  dark: { fill: "#222b26", top: "#414c40", edge: "#667361", shades: ["#202923", "#273329", "#303d31", "#374739"] },
  copper: { fill: "#755335", top: "#b58c58", edge: "#d3ad72", shades: ["#59422f", "#715339", "#8a6945", "#a57d50"] },
  porcelain: { fill: "#aaa99c", top: "#e2dfcd", edge: "#f0ecda", shades: ["#777c6e", "#979c8a", "#b5b7a3", "#c5c5b1"] },
  coffee: { fill: "#593e28", top: "#906341", edge: "#b88e60", shades: ["#3e2e21", "#5b402b", "#694b30", "#7b5637"] },
};
const path = (points, close = false) => k.pathOf(points.map((point) => k.iso(point, P)), close);
const line = (d, color = "#788676", width = 0.85, extra = "") => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const solid = (shape, material = "steel", extra = "") => {
  const paint = PAINT[material];
  return `<g ${extra}><path d="${shape.fill}" fill="${paint.fill}"/>${shape.shades.map((d, index) => d ? `<path d="${d}" fill="${paint.shades[index]}" stroke="${paint.shades[index]}" stroke-width=".35"/>` : "").join("")}<path d="${shape.top}" fill="${paint.top}"/>${line(shape.crease, paint.edge, .55)}${shape.bevel ? line(shape.bevel, paint.edge, .7) : ""}${line(shape.outline, paint.edge, .85)}</g>`;
};
const slab = (x, y, width, depth, z, height, material = "steel", radius = 2, extra = "") => solid(k.slabOf({ x, y, w: width, d: depth, r: radius }, z, height, P, 6, .6), material, extra);
const cyl = (x, y, radius, z, height, material = "steel", extra = "") => solid(k.cylinder(x, y, radius, z, height, P, 48, .4), material, extra);
const screw = (x, y, z, radius = 1.7) => line(k.ring(x, y, radius, z, P, 16), "#bcc4b3", .8) + line(k.segment([x - radius * .55, y, z + .05], [x + radius * .55, y, z + .05], P), "#28342b", .9);
const annulus = (cx, cy, inner, outer, from, to) => {
  const arc = (radius, reverse = false) => Array.from({ length: 73 }, (_, i) => {
    const angle = (from + (to - from) * (reverse ? 1 - i / 72 : i / 72)) * Math.PI / 180;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
  return [...arc(outer), ...arc(inner, true)];
};

function tube(id, points, color, width = 6) {
  const d = path(g.fillet(points, 5, 6));
  return `<g data-circuit="${id}">${line(d, "#0d1411", width + 4)}${line(d, "#5d7167", width + 1)}${line(d, "#2e413a", width - 1)}${line(d, color, width - 2, `class="water-track" data-flow="${id}" opacity=".35"`)}${line(d, "#e7f8e5", 1.8, `class="flow-dashes" data-flow="${id}" stroke-dasharray="3 16" opacity="0"`)}</g>`;
}

function machine() {
  const art = [];
  art.push(`<ellipse cx="452" cy="545" rx="283" ry="56" fill="#020806" opacity=".45" filter="url(#espresso-shadow)"/>`);
  for (const [x, y] of k.corners(BASE, 24).sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) {
    art.push(cyl(x, y, 8, -9, 7, "dark"), cyl(x, y, 8.5, -2, 3, "steel"));
  }
  art.push(solid(k.slabOf(BASE, 0, 10, P, 10, 1.7), "dark"));
  art.push(line(k.planOutline(k.insetPlan(BASE, 5), 10.1, P), "#74836c", .7));
  for (const [x, y] of k.corners(BASE, 13)) art.push(screw(x, y, 10.2, 2));
  art.push(slab(-123, -67, 252, 5, 10, 145, "dark", 1));
  art.push(slab(-122, -66, 8, 156, 10, 31, "steel", 2));
  art.push(slab(120, -63, 7, 145, 10, 37, "steel", 2));
  art.push(slab(-123, -67, 251, 12, 153, 6, "steel", 2));
  art.push(slab(116, -55, 9, 18, 42, 111, "steel", 1));
  for (let x = -104; x < 116; x += 10) {
    art.push(line(path([[x, -61.8, 138], [x + 4, -61.8, 138], [x + 4, -61.8, 146], [x, -61.8, 146]], true), "#687660", .65));
  }
  art.push(slab(-101, -51, 5, 70, 10, 4, "steel"), slab(-61, -51, 5, 70, 10, 4, "steel"));
  art.push(`<g data-component="reservoir">`);
  art.push(slab(-105, -51, 52, 70, 14, 4, "steel", 3));
  const tank = { x: -102, y: -48, w: 46, d: 64, r: 4 };
  const tankShape = k.slabOf(tank, 18, 111, P, 8);
  art.push(`<path d="${tankShape.fill}" fill="#9fb9ac" opacity=".08"/>`);
  art.push(`<g data-reservoir-water=""><path d="${k.slabOf(k.insetPlan(tank, 2), 19, 86, P, 8).fill}" fill="#7eccc4" opacity=".23"/><path d="${k.planOutline(k.insetPlan(tank, 2), 105, P)}" fill="#9cddd3" opacity=".28"/></g>`);
  art.push(line(tankShape.outline, "#87a397", 1.2), line(tankShape.crease, "#a8bcad", .8));
  for (const z of [40, 58, 76, 94, 112]) art.push(line(path([[-64, 16.2, z], [-58, 16.2, z]]), "#bed1bf", .9));
  art.push(slab(-104, -50, 50, 68, 129, 4, "dark", 3));
  art.push(slab(-88, -30, 17, 9, 133, 4, "steel", 3));
  art.push(`</g>`);
  art.push(tube("supply", [[-72, 16, 24], [-72, 34, 24], [-68, 34, 32]], "#91dcd0"));
  art.push(`<g data-component="pump">`);
  art.push(slab(-70, 23, 43, 22, 10, 6, "dark", 2));
  art.push(slab(-65, 25, 6, 18, 16, 11, "steel"), slab(-37, 25, 6, 18, 16, 11, "steel"));
  const motor = g.frameAlong([-68, 34, 32], [1, 0, 0]);
  art.push(solid(g.disc(0, 4, 12, motor, P), "steel"));
  art.push(solid(g.disc(4, 31, 10, motor, P), "copper"));
  for (let x = 6; x <= 28; x += 3) art.push(line(g.circleOf(motor, x, 10.2, P), "#cc9463", .65));
  art.push(solid(g.disc(30, 35, 12, motor, P), "steel"));
  art.push(solid(g.disc(35, 41, 5, motor, P), "copper"));
  art.push(screw(-65, 27, 16.2), screw(-33, 42, 16.2));
  art.push(`<path data-pump-light="" d="${g.circleOf(motor, 35.1, 8, P)}" fill="none" stroke="#eac17e" stroke-width="2.5" opacity="0" filter="url(#espresso-glow)"/>`);
  art.push(`</g>`);
  art.push(tube("inlet", [[-27, 34, 32], [-12, 34, 32], [-12, 34, 51], [-8, 21, 51]], "#91dcd0"));
  art.push(`<g data-component="boiler">`);
  for (const x of [-31, 14]) art.push(slab(x, -24, 8, 18, 10, 32, "steel", 2), screw(x + 4, -12, 42.1));
  art.push(cyl(-8, -8, 32, 42, 7, "copper"));
  art.push(solid(k.extrude(annulus(-8, -8, 27, 30, 135, 315), 49, 82, P, { convex: false }), "copper"));
  art.push(`<path d="${k.cylinder(-8, -8, 26.5, 49, 81, P, 64).fill}" fill="#7acbc0" opacity=".15" data-boiler-water=""/>`);
  art.push(line(k.ring(-8, -8, 27, 130, P, 64), "#bfdbbd", .8));
  const coil = Array.from({ length: 301 }, (_, i) => {
    const t = i / 300;
    return [-8 + 14 * Math.cos(t * Math.PI * 12), -8 + 14 * Math.sin(t * Math.PI * 12), 57 + t * 45];
  });
  const heater = path([[-22, -8, 49], [-22, -8, 57], ...coil, [6, -8, 109], [6, -8, 49]]);
  art.push(line(heater, "#1f2922", 6));
  art.push(line(heater, "#ae8355", 3.8, 'data-heater=""'));
  art.push(line(heater, "#f4bd69", 6, 'data-heater-glow="" opacity="0" filter="url(#espresso-glow)"'));
  art.push(cyl(-8, -8, 32, 131, 6, "copper"));
  art.push(cyl(-8, -8, 8, 137, 4, "steel"));
  art.push(cyl(-8, -8, 3.5, 141, 5, "copper"));
  for (let i = 0; i < 8; i++) {
    const theta = i * Math.PI / 4;
    art.push(screw(-8 + 29 * Math.cos(theta), -8 + 29 * Math.sin(theta), 137.1, 1.5));
  }
  art.push(solid(k.extrude(annulus(-8, -8, 27, 30, -45, 135), 49, 2, P, { convex: false }), "copper"));
  art.push(`</g>`);
  art.push(tube("hot", [[22, -8, 118], [44, -8, 118], [54, 2, 118], [54, 16, 118]], "#e9b96f"));
  art.push(slab(25, -62, 67, 9, 113, 9, "steel", 1));
  art.push(slab(55, -54, 27, 109, 113, 8, "steel", 3));
  art.push(`<g data-component="valve">`);
  art.push(slab(45, 13, 18, 17, 109, 18, "copper", 2));
  art.push(cyl(54, 21.5, 7, 127, 14, "dark"));
  art.push(cyl(54, 21.5, 4, 141, 3, "steel"));
  art.push(screw(50, 16.5, 127.2, 1));
  art.push(`<path d="${path([[45, 30.3, 113], [63, 30.3, 123]])}" stroke="#b4c4ae" stroke-width="2" data-valve-mark=""/>`);
  art.push(`</g>`);
  art.push(tube("group", [[63, 21, 118], [78, 21, 118], [78, 46, 113]], "#e9b96f"));
  art.push(tube("drain", [[54, 30, 111], [54, 38, 111], [42, 38, 98], [42, 38, 22], [52, 51, 22]], "#91dcd0", 4.5));
  art.push(`<g data-component="group">`);
  art.push(cyl(78, 46, 22, 99, 14, "copper"));
  art.push(cyl(78, 46, 24, 94, 5, "steel"));
  art.push(solid(k.extrude(annulus(78, 46, 18, 21.5, 135, 315), 82, 14, P, { convex: false }), "steel"));
  art.push(cyl(78, 46, 17.5, 85, 5.5, "coffee", 'data-puck=""'));
  for (let x = 68; x <= 86; x += 4.5) {
    for (let y = 39; y <= 53; y += 4.5) {
      const [cx, cy] = k.iso([x, y, 90.6], P);
      art.push(`<circle cx="${cx}" cy="${cy}" r=".65" fill="#bd9b73"/>`);
    }
  }
  art.push(cyl(78, 46, 20.5, 81, 3, "steel"));
  const handle = g.frameAlong([94, 46, 86], [1, 0, 0]);
  art.push(solid(g.disc(0, 10, 4.5, handle, P), "steel"));
  art.push(solid(g.solidOf([[10, 4], [14, 6], [43, 7], [48, 5]], handle, P), "dark"));
  art.push(line(g.arcOf(handle, 20, 7, P), "#77816d", .75));
  art.push(cyl(78, 46, 4, 74, 7, "steel"));
  art.push(`</g>`);
  art.push(slab(24, 24, 94, 67, 10, 6, "dark", 5));
  for (let x = 31; x < 115; x += 6) art.push(slab(x, 28, 2.5, 59, 16, 1, "steel", .8));
  art.push(cyl(78, 46, 27, 18, 2.8, "porcelain"));
  art.push(cyl(78, 46, 12, 20.8, 3, "porcelain"));
  const cupProfile = g.frameAlong([78, 46, 23], [0, 0, 1]);
  const cupHandle = path([[96, 46, 45], [107, 46, 45], [110, 46, 37], [106, 46, 29], [93, 46, 29]]);
  art.push(line(cupHandle, "#777f70", 9), line(cupHandle, "#d4d3bd", 6));
  art.push(solid(g.solidOf([[0, 12], [3, 15], [20, 19], [27, 20]], cupProfile, P), "porcelain"));
  art.push(`<path d="${k.ring(78, 46, 17, 50.2, P, 64)}" fill="#6d6959" stroke="#eee9d3" stroke-width="2"/>`);
  art.push(`<path data-cup-coffee="" d="${k.ring(78, 46, 16, 49.7, P, 64)}" fill="#b38346" opacity="0"/>`);
  art.push(line(path([[78, 46, 74], [78, 46, 50]]), "#cb9258", 3.8, 'data-coffee-stream="" opacity="0"'));
  art.push(line(path([[78, 46, 74], [78, 46, 50]]), "#ffe3b1", 1.1, 'data-coffee-dashes="" class="flow-dashes" stroke-dasharray="2 9" opacity="0"'));
  art.push(`<g data-component="controls">`);
  art.push(slab(64, -56, 45, 19, 141, 7, "steel", 3));
  art.push(cyl(78, -47, 6, 148, 3, "dark"), cyl(96, -47, 4, 148, 3, "dark"));
  art.push(`<path data-ready-light="" d="${k.ring(96, -47, 2.5, 151.2, P, 24)}" fill="#717866"/>`);
  art.push(`</g>`);
  return art.join("");
}

function svg(license) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-labelledby="espresso-title espresso-description" data-espresso=""><title id="espresso-title">Inside a pump-driven espresso machine</title><desc id="espresso-description">A cut-open machine shows a water reservoir on the left, an electric pump below it, a cylindrical brew boiler and heating coil in the middle, and a valve feeding the group head and coffee basket above a cup. A separate pipe returns from the three-way valve to the drip tray.</desc><metadata>${license.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</metadata><defs><filter id="espresso-shadow" x="-25%" y="-100%" width="150%" height="300%"><feGaussianBlur stdDeviation="14"/></filter><filter id="espresso-glow" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="900" height="650" fill="#141a15"/>${machine()}</svg>`;
}

const CSS = `
:root{color-scheme:dark;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e8eadc;background:#141a15;font-synthesis:none}*{box-sizing:border-box}body{margin:0}main{max-width:1030px;margin:auto;padding:36px 36px 30px}h1,h2,p{margin:0}header{margin-bottom:22px}h1{font-size:clamp(26px,5vw,39px);line-height:1.15;font-weight:500;letter-spacing:-1.3px}header p:last-child{max-width:640px;color:#b6bdaa;font-size:14px;line-height:1.7;margin-top:14px}.drawing{position:relative;border:1px solid #354132;border-radius:8px;overflow:hidden;background:#141a15}.drawing svg{display:block;width:100%;height:auto}.drawing-label{position:absolute;left:22px;top:18px;font:10px ui-monospace,monospace;letter-spacing:1.2px;text-transform:uppercase;color:#bac5b3}.cut-note{position:absolute;right:20px;bottom:18px;font:10px ui-monospace,monospace;color:#b3bca9}.controls{border:1px solid #354132;border-top:0;border-radius:0 0 8px 8px;padding:20px}.controls-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}button,select{font:12px system-ui,sans-serif;min-height:40px;border:1px solid #58644c;border-radius:4px;padding:9px 13px;background:#1c251d;color:#e9eddb}button{cursor:pointer}button:hover,select:hover{border-color:#d7bc88}button:focus-visible,select:focus-visible,input:focus-visible,a:focus-visible{outline:2px solid #eed09a;outline-offset:4px}button:first-child{background:#e8d1a2;color:#202a1d;border-color:#e8d1a2}label{font-size:11px;color:#bdc5b3}.stage-control{display:flex;align-items:center;gap:10px;margin-left:auto}select{max-width:145px}input[type=range]{width:100%;accent-color:#e4c98f;margin:13px 0 0;min-height:28px}.scrub-label{display:flex;justify-content:space-between;gap:18px;margin-top:16px;font:10px ui-monospace,monospace;color:#b9c3ae}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;border-top:1px solid #34412f;padding:16px 0 0;margin:13px 0 0}.metrics div+div{border-left:1px solid #34412f;padding-left:18px}.metrics dt{font:9px ui-monospace,monospace;text-transform:uppercase;letter-spacing:1.1px;color:#b3bfa6}.metrics dd{font-size:15px;color:#e4e9d7;margin:7px 0 0}.caption{font-size:13px;color:#bdc7b1;line-height:1.6;margin-top:16px;min-height:42px}.parts{display:flex;flex-wrap:wrap;gap:7px;margin-top:19px}.parts button,.parts button:first-child{font-size:11px;min-height:35px;background:transparent;color:#becab3;border-color:#3b4933;padding:7px 10px}.parts button[aria-pressed=true]{border-color:#d8b57f;color:#ecd4a9;background:#e6c28712}.part-description{font-size:13px;line-height:1.7;color:#c6cebd;padding:14px 0 0;min-height:59px}.notes{border-top:1px solid #354132;margin-top:24px;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:26px}.notes h2{font-size:13px;font-weight:550;color:#e2e7d6;margin-bottom:9px}.notes p,.notes li{font-size:12px;line-height:1.8;color:#b7c1ac}.notes ul{padding-left:18px;margin:0}.notes a,footer a{color:#e1c798;text-underline-offset:3px}footer{margin-top:22px;font-size:10px;line-height:1.8;color:#a9b59d}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}[data-selected=true]{filter:drop-shadow(0 0 6px #f2c27755)}.embed main{padding:0;max-width:none}.embed header,.embed .notes,.embed footer,.embed .parts,.embed .part-description{display:none}.embed .drawing{border:0;border-radius:0}.embed .controls{border:0;border-top:1px solid #34412f;border-radius:0;padding:15px 21px 18px}.embed .drawing svg{max-height:370px}.embed .drawing-label{font-size:9px;left:21px;top:17px}.embed .cut-note{font-size:8px;right:17px;bottom:12px}.embed .controls-row{gap:7px}.embed button,.embed select{font-size:10px;padding:8px 10px;min-height:36px}.embed .stage-control>label{display:none}.embed .metrics{padding-top:12px}.embed .metrics dd{font-size:13px}.embed .caption{font-size:11px;min-height:34px;margin-top:13px}.embed .scrub-label{margin-top:12px;font-size:9px}.embed input[type=range]{margin-top:5px;min-height:22px}.embed .metrics dt{font-size:8px;letter-spacing:.7px}@media(max-width:560px){main{padding:22px 17px}.controls{padding:17px}.stage-control{margin-left:0;flex:1;justify-content:flex-end}.stage-control label{display:none}.controls-row{gap:7px}.controls-row button{padding:9px 10px;font-size:11px}.notes{grid-template-columns:1fr;gap:20px}.drawing-label{font-size:8px;left:14px;top:13px}.cut-note{font-size:8px;right:13px;bottom:12px}.caption{min-height:62px}.metrics dd{font-size:13px}.metrics div+div{padding-left:13px}.embed .controls{padding:13px 15px}.embed .controls-row button{font-size:10px}.embed .caption{min-height:49px}.embed select{max-width:105px}.embed .drawing svg{max-height:320px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}[data-selected=true]{filter:none}}
`;

function runtime(projection) {
  if (new URLSearchParams(location.search).get("embed") === "1") document.documentElement.classList.add("embed");
  const root = document.querySelector("main");
  const art = root.querySelector("svg");
  const play = root.querySelector("[data-play]");
  const slider = root.querySelector("[data-progress]");
  const select = root.querySelector("[data-stage]");
  const caption = root.querySelector("[data-caption]");
  const live = root.querySelector("[data-announcement]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stages = [
    { at: 0, end: 1, name: "Cold", pump: "Off", heater: "Off", valve: "To drain", text: "The reservoir and brew boiler are already full. The pump is off, and the valve closes the boiler outlet while connecting the group to the drip tray." },
    { at: 1, end: 7, name: "Heating", pump: "Off", heater: "On", valve: "To drain", text: "The element heats water inside the brew boiler while the pump stays off." },
    { at: 7, end: 9, name: "Ready", pump: "Off", heater: "Holding", valve: "To drain", text: "The boiler has reached its target temperature. The temperature control keeps the boiler hot. Water hasn’t reached the coffee yet." },
    { at: 9, end: 20, name: "Brewing", pump: "On", heater: "Holding", valve: "To group", text: "The pump pushes water into the full boiler, displacing hot water through the open brew valve, shower screen and coffee puck. Espresso collects in the cup." },
    { at: 20, end: 22, name: "Finished", pump: "Off", heater: "Holding", valve: "To drain", text: "The pump stops. The three-way valve closes the boiler path and connects the group to the drip tray, releasing pressure above the coffee puck." },
  ];
  const parts = {
    reservoir: "The reservoir supplies water to the pump. Its level falls as water reaches the cup.",
    pump: "The pump draws water from the reservoir and pushes it through the brew circuit. Resistance from the coffee puck helps pressure build. The heater warms the water, and the pump supplies the brewing pressure.",
    boiler: "The brew boiler holds water around an electric heating element. Incoming water replaces water leaving for the group, so the boiler stays full.",
    valve: "The three-way valve connects the boiler to the group while brewing. At the end, it blocks the boiler and connects the group to the drain.",
    group: "The group spreads water across the coffee. The portafilter holds the filter basket and coffee puck underneath it.",
  };
  let time = 0;
  let running = false;
  let frame = 0;
  let last = 0;
  let inView = true;
  let currentStage = "";
  let observer;
  const projected = ([x, y, z]) => {
    const azimuth = projection.azimuth * Math.PI / 180;
    const elevation = projection.elevation * Math.PI / 180;
    const scale = projection.scale * Math.sqrt(1.6);
    return [projection.origin[0] + (x * Math.sin(azimuth) - y * Math.cos(azimuth)) * scale, projection.origin[1] + ((x * Math.cos(azimuth) + y * Math.sin(azimuth)) * Math.sin(elevation) - z * Math.cos(elevation)) * scale];
  };
  const polygon = (points) => points.map((point, index) => `${index ? "L" : "M"}${projected(point).map((value) => value.toFixed(2)).join(" ")}`).join("") + "Z";
  const setOpacity = (selector, opacity) => root.querySelectorAll(selector).forEach((element) => element.setAttribute("opacity", opacity));
  const stageAt = () => stages.find((stage) => time < stage.end) || stages.at(-1);

  function paint(announce = false) {
    const stage = stageAt();
    const brewing = stage.name === "Brewing";
    const heating = stage.name === "Heating";
    const delivered = Math.max(0, Math.min(1, (time - 9) / 11));
    const warm = time >= 7;
    const level = 105 - delivered * 7;
    const tank = root.querySelector("[data-reservoir-water]");
    tank.children[0].setAttribute("d", polygon([[-100, -46, 19], [-58, -46, 19], [-58, 14, 19], [-100, 14, 19]]) + polygon([[-100, -46, level], [-58, -46, level], [-58, 14, level], [-100, 14, level]]) + polygon([[-58, -46, 19], [-58, 14, 19], [-58, 14, level], [-58, -46, level]]) + polygon([[-100, 14, 19], [-58, 14, 19], [-58, 14, level], [-100, 14, level]]));
    tank.children[1].setAttribute("d", polygon([[-100, -46, level], [-58, -46, level], [-58, 14, level], [-100, 14, level]]));
    setOpacity("[data-heater-glow]", heating ? .85 : 0);
    root.querySelector("[data-heater]").setAttribute("stroke", heating ? "#f3be75" : warm ? "#c69560" : "#ae8355");
    root.querySelector("[data-boiler-water]").setAttribute("fill", warm || heating ? "#edbb78" : "#7acbc0");
    root.querySelector("[data-ready-light]").setAttribute("fill", warm ? "#d8d898" : "#717866");
    setOpacity("[data-pump-light]", brewing ? .8 : 0);
    setOpacity("[data-coffee-stream], [data-coffee-dashes]", brewing ? 1 : 0);
    setOpacity("[data-cup-coffee]", delivered > 0 ? .35 + delivered * .65 : 0);
    const draining = stage.name === "Finished" && time < 20.8;
    root.querySelectorAll("[data-flow]").forEach((element) => {
      const active = element.dataset.flow === "drain" ? draining : element.dataset.flow === "group" ? brewing || draining : brewing;
      element.setAttribute("opacity", element.classList.contains("flow-dashes") ? active ? 1 : 0 : active ? 1 : .25);
    });
    root.querySelector("[data-valve-mark]").setAttribute("stroke", brewing ? "#f1c581" : "#b4c4ae");
    root.querySelectorAll(".flow-dashes").forEach((element) => element.setAttribute("stroke-dashoffset", reduced.matches ? "0" : String(time * (draining && element.dataset.flow === "group" ? 34 : -34))));
    root.querySelector("[data-pump-value]").textContent = stage.pump;
    root.querySelector("[data-heater-value]").textContent = stage.heater;
    root.querySelector("[data-valve-value]").textContent = stage.valve;
    root.querySelector("[data-phase-label]").textContent = stage.name;
    caption.textContent = stage.text;
    slider.value = Math.round(time / 22 * 1000);
    slider.setAttribute("aria-valuetext", `${stage.name}; ${Math.round(time / 22 * 100)} percent of the brew cycle`);
    select.value = stage.name;
    play.textContent = running ? "Pause cycle" : time >= 22 ? "Replay cycle" : "Play cycle";
    if (announce && currentStage !== stage.name) live.textContent = `${stage.name}. ${stage.text}`;
    currentStage = stage.name;
    art.dataset.stage = stage.name.toLowerCase();
    art.dataset.running = String(running);
  }

  function cancel() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  function schedule() {
    if (running && !reduced.matches && !document.hidden && inView && !frame) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (!running || reduced.matches || document.hidden || !inView) { last = 0; return; }
    if (last) time = Math.min(22, time + Math.max(0, Math.min((now - last) / 1000, .05)));
    last = now;
    if (time >= 22) running = false;
    paint(true);
    schedule();
  }
  function pause() { running = false; cancel(); }
  function seek(next) { pause(); time = Math.max(0, Math.min(22, next)); paint(true); }
  function nextStage() {
    const next = stages.find((stage) => stage.at > time + .01);
    seek(next ? next.at : 0);
  }
  play.addEventListener("click", () => {
    if (reduced.matches) { nextStage(); return; }
    if (running) pause();
    else { if (time >= 22) time = 0; running = true; schedule(); }
    paint();
  });
  root.querySelector("[data-next]").addEventListener("click", nextStage);
  root.querySelector("[data-reset]").addEventListener("click", () => seek(0));
  slider.addEventListener("input", () => seek(Number(slider.value) / 1000 * 22));
  select.addEventListener("change", () => {
    const selected = stages.find((stage) => stage.name === select.value);
    if (selected) seek(selected.at);
  });
  root.querySelectorAll("[data-inspect]").forEach((button) => button.addEventListener("click", () => {
    const part = button.dataset.inspect;
    root.querySelectorAll("[data-inspect]").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
    root.querySelectorAll("[data-component]").forEach((component) => component.dataset.selected = String(component.dataset.component === part));
    root.querySelector("[data-part-description]").textContent = parts[part];
  }));
  document.addEventListener("visibilitychange", () => { cancel(); schedule(); });
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      cancel();
      schedule();
    }, { rootMargin: "80px 0px" });
    observer.observe(root);
  }
  function motionPreference() {
    if (reduced.matches) pause();
    paint();
    play.hidden = reduced.matches;
    root.querySelector("[data-next]").textContent = reduced.matches ? "Next stage" : "Step";
  }
  reduced.addEventListener("change", motionPreference);
  window.addEventListener("pagehide", () => { pause(); observer?.disconnect(); });
  window.addEventListener("pageshow", (event) => { if (event.persisted) { observer?.observe(root); paint(); } });
  motionPreference();
}

function page(figure, license) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Espresso machine · Cutaway</title><meta name="description" content="Follow water through an espresso machine: reservoir, pump, brew boiler, valve, group head and coffee puck."><style>${CSS}</style></head><body><!--${license.replaceAll("--", "—")}--><main><header><h1>From reservoir to espresso</h1><p>Follow the water through a pump-driven espresso machine. Step through the cycle, then select a part to see what it does.</p></header><div class="drawing"><span class="drawing-label">Brew circuit</span>${figure}<span class="cut-note">Casing and boiler wall cut away</span></div><section class="controls" aria-label="Espresso machine controls"><div class="controls-row"><button type="button" data-play>Play cycle</button><button type="button" data-next>Step</button><button type="button" data-reset>Reset</button><div class="stage-control"><label for="espresso-stage">Stage</label><select id="espresso-stage" data-stage aria-label="Choose a stage"><option>Cold</option><option>Heating</option><option>Ready</option><option>Brewing</option><option>Finished</option></select></div></div><div class="scrub-label"><label for="espresso-progress">Cycle progress</label><span data-phase-label>Cold</span></div><input id="espresso-progress" data-progress type="range" min="0" max="1000" value="0" step="1" aria-label="Move through the brew cycle"><dl class="metrics"><div><dt>Pump</dt><dd data-pump-value>Off</dd></div><div><dt>Heater</dt><dd data-heater-value>Off</dd></div><div><dt>Brew valve</dt><dd data-valve-value>To drain</dd></div></dl><p class="caption" data-caption>The reservoir and brew boiler are already full. The pump is off, and the valve closes the boiler outlet while connecting the group to the drip tray.</p><p class="sr-only" aria-live="polite" data-announcement></p></section><div class="parts" role="group" aria-label="Inspect a part">${[["reservoir", "Reservoir"], ["pump", "Pump"], ["boiler", "Boiler"], ["valve", "Brew valve"], ["group", "Group & basket"]].map(([id, label]) => `<button type="button" data-inspect="${id}" aria-pressed="false">${label}</button>`).join("")}</div><p class="part-description" data-part-description aria-live="polite">Select a part above to read about its job.</p><section class="notes"><div><h2>About this model</h2><p>This generic brew circuit starts with a full boiler and uses shortened heating and brewing stages. It doesn’t calculate temperature, pressure, or flow.</p><p>The drawing omits the steam circuit, pressure bypass, heat loss, and water retained by the coffee.</p></div><div><h2>Read more</h2><ul><li><a href="https://nz.lamarzocco.com/news/blog/what-is-a-solenoid-valve/" target="_blank" rel="noopener noreferrer">La Marzocco: how the solenoid valve works</a></li><li><a href="https://www.lamarzoccousa.com/news/blog/dual-boiler-espresso-machines-are-consistent/" target="_blank" rel="noopener noreferrer">La Marzocco: brew boilers and temperature</a></li></ul></div></section><footer>Made with <a href="https://github.com/abhay/cutaway" target="_blank" rel="noopener noreferrer">Cutaway</a>, built on <a href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noopener noreferrer">Anatomy by Ryan</a>. MIT licenses are included in this file.</footer></main><script>(${runtime.toString()})(${JSON.stringify(P)});</script></body></html>`;
}

export async function build(outputDirectory) {
  const license = (await Promise.all(["../../LICENSE", "../../skills/cutaway/upstream/LICENSE"].map((path) => readFile(join(HERE, path), "utf8")))).join("\n\n");
  const figure = svg(license);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "espresso.svg"), figure);
  await writeFile(join(outputDirectory, "espresso.html"), page(figure, license));
}
