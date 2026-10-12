import { iso, fitProjection, pathOf } from "../../skills/cutaway/upstream/kit/iso-kit.mjs";
import { glowDefs } from "../../skills/cutaway/glow/svg.mjs";

const WIDTH = 760;
const HEIGHT = 410;
const AXIS_HEIGHT = 111;
const FAN_X = -169;
const FAN_RADIUS = 98;
const P = fitProjection(
  [[-237, -108, 0], [-237, 108, 220], [243, -108, 0], [243, 108, 220]],
  WIDTH,
  HEIGHT,
  { pad: 25, azimuth: 121, elevation: 23 },
);

const ROWS = {
  booster: {
    label: "Booster",
    stations: Array.from({ length: 3 }, (_, index) => [-106 + index * 12, 41 - index * 3]),
    fill: "url(#jet-lp-metal)",
  },
  compressor: {
    label: "High-pressure compressor",
    stations: Array.from({ length: 11 }, (_, index) => [-66 + index * 7.7, 31 - index * 1.0]),
    fill: "url(#jet-cold-metal)",
  },
  hpt: {
    label: "High-pressure turbine",
    stations: [[74, 25], [86, 27]],
    fill: "url(#jet-hot-metal)",
  },
  lpt: {
    label: "Low-pressure turbine",
    stations: Array.from({ length: 6 }, (_, index) => [104 + index * 11.5, 29 + index * 2.15]),
    fill: "url(#jet-lp-metal)",
  },
};

const at = (point) => iso(point, P);
const flat = (point) => at(point).map((value) => value.toFixed(2)).join(" ");
const point = (x, radius, angle) => [x, radius * Math.cos(angle), AXIS_HEIGHT + radius * Math.sin(angle)];
const path = (points, closed = false) => pathOf(points.map(at), closed);
const ring = (x, radius, start = 0, end = Math.PI * 2, count = 64) =>
  Array.from({ length: count + 1 }, (_, index) => point(x, radius, start + (end - start) * index / count));

function polygon(points, fill, attributes = "") {
  return `<path d="${path(points, true)}" fill="${fill}" ${attributes.includes('stroke="') ? "" : 'stroke="#7c8775"'} stroke-width=".6" stroke-linejoin="round" ${attributes}/>`;
}

function line(points, color = "#7f8d76", attributes = "") {
  return `<path d="${path(points)}" fill="none" stroke="${color}" ${attributes.includes('stroke-width="') ? "" : 'stroke-width=".7"'} ${attributes}/>`;
}

function shell(x1, x2, r1, r2, start, end, fill, attributes = "") {
  const count = Math.ceil(Math.abs(end - start) * 18);
  const panels = Array.from({ length: count }, (_, index) => {
    const a = start + (end - start) * index / count;
    const b = start + (end - start) * (index + 1) / count;
    const points = [point(x1, r1, a), point(x2, r2, a), point(x2, r2, b), point(x1, r1, b)].map(at);
    const area = points.reduce((sum, [x, y], vertex) => {
      const next = points[(vertex + 1) % points.length];
      return sum + x * next[1] - y * next[0];
    }, 0);
    return pathOf(area < 0 ? points.reverse() : points, true);
  });
  return `<path d="${panels.join("")}" fill="${fill}" ${attributes}/>`
    + line(ring(x1, r1, start, end))
    + line(ring(x2, r2, start, end))
    + line([point(x1, r1, start), point(x2, r2, start)])
    + line([point(x1, r1, end), point(x2, r2, end)]);
}

function cone(x1, x2, r1, r2, fill, attributes = "") {
  return shell(x1, x2, r1, r2, 0, Math.PI * 2, fill, attributes)
    + polygon(ring(x1, r1), fill, attributes);
}

function rotor(part, stage, x, radius, fill) {
  const hub = part === "booster" ? 14 : 11;
  const blades = [];
  const bladeCount = part === "compressor" ? 15 : 18;
  for (let index = 0; index < bladeCount; index++) {
    const angle = index * Math.PI * 2 / bladeCount + stage * .13;
    const points = [
      point(x, hub, angle),
      point(x - 1.3, radius, angle + .035),
      point(x + 1.8, radius, angle + .21),
      point(x + 2.6, hub, angle + .24),
    ];
    blades.push({
      depth: Math.cos(angle) * .92 + Math.sin(angle) * .3,
      svg: polygon(points, fill, 'class="metal rotor-blade"'),
    });
  }
  return `<g data-part="${part}" role="group" aria-label="${ROWS[part].label} stage ${stage}">`
    + blades.sort((a, b) => a.depth - b.depth).map((blade) => blade.svg).join("")
    + polygon(ring(x - 1.4, hub), fill, 'class="metal"')
    + line(ring(x - 1.6, hub - 2), "#bdc7ac")
    + "</g>";
}

function rotorAssembly(part) {
  const { stations, fill } = ROWS[part];
  return stations.map(([x, radius], index) => ({
    x,
    svg: rotor(part, index + 1, x, radius, fill),
  })).sort((a, b) => b.x - a.x).map((row) => row.svg).join("");
}

function fan() {
  const blades = [];
  for (let index = 0; index < 16; index++) {
    const angle = index * Math.PI / 8 + .12;
    const start = point(FAN_X - 1, 23, angle - .04);
    const lead1 = point(FAN_X - 8, 43, angle - .075);
    const lead2 = point(FAN_X - 7, 76, angle - .19);
    const tip = point(FAN_X + 3, FAN_RADIUS, angle - .30);
    const tipMid = point(FAN_X + 6, FAN_RADIUS + .4, angle - .15);
    const tipEnd = point(FAN_X + 7, FAN_RADIUS - .8, angle + .045);
    const trail1 = point(FAN_X + 6, 78, angle + .22);
    const trail2 = point(FAN_X + 4, 49, angle + .30);
    const end = point(FAN_X + 3, 23, angle + .18);
    const leading = `M${flat(start)}C${flat(lead1)} ${flat(lead2)} ${flat(tip)}`;
    const outline = `${leading}Q${flat(tipMid)} ${flat(tipEnd)}C${flat(trail1)} ${flat(trail2)} ${flat(end)}Z`;
    blades.push({
      depth: Math.cos(angle) * .92 + Math.sin(angle) * .3,
      svg: `<path class="fan-blade" d="${outline}" fill="url(#jet-composite)" stroke="#75867b" stroke-width=".65" role="img" aria-label="Fan blade ${index + 1}"/>`
        + `<path class="fan-leading-edge" d="${leading}" fill="none" stroke="#bcc5b4" stroke-width="1.1"/>`,
    });
  }
  return `<g data-part="fan" role="group" aria-label="Fan rotor stage 1">`
    + blades.sort((a, b) => a.depth - b.depth).map((blade) => blade.svg).join("")
    + cone(FAN_X - 28, FAN_X + 1, 1.5, 24, "url(#jet-spinner)")
    + line(ring(FAN_X - 5, 22), "#d1d6bd")
    + "</g>";
}

function flange(x, radius, start, end) {
  const out = [shell(x - 1.5, x + 1.5, radius + 1.6, radius + 1.6, start, end, "#53624f")];
  const count = Math.round((end - start) * 3);
  for (let index = 0; index <= count; index++) {
    const [cx, cy] = at(point(x - 1.6, radius + 1.6, start + (end - start) * index / count));
    out.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r=".85" fill="#bdc7ac"/>`);
  }
  return out.join("");
}

function combustor() {
  const out = [`<g data-part="combustor" role="group" aria-label="Annular combustor around the shafts">`];
  out.push(shell(21, 64, 29, 30, Math.PI * .51, Math.PI * 1.64, "url(#jet-hot-metal)", 'class="metal"'));
  out.push(shell(28, 60, 23, 24, Math.PI * .55, Math.PI * 1.48, "#51452d"));
  for (const angle of [.8, 1.9, 3.7, 4.8]) {
    out.push(polygon([
      point(26, 22, angle), point(35, 25, angle + .09), point(54, 22, angle),
      point(43, 20, angle - .12), point(60, 21, angle), point(34, 17, angle - .10),
    ], "#e1b980", 'class="flame" stroke="none" filter="url(#jet-soft)"'));
    out.push(line([point(18, 25, angle), point(26, 22, angle)], "#c2ba8e", 'stroke-width="1.8"'));
  }
  for (let x = 30; x <= 58; x += 7) {
    for (const angle of [2.0, 2.5, 3.0, 3.5, 4.0]) {
      const [cx, cy] = at(point(x, 29.5, angle));
      out.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r=".8" fill="#19201a"/>`);
    }
  }
  return out.join("") + "</g>";
}

function shafts() {
  const back = Math.PI * .54;
  const bottom = Math.PI * 1.58;
  const front = Math.PI * 1.95;
  return `<g data-part="shafts" role="group" aria-label="Concentric shafts: inner LP shaft connects fan, booster and low-pressure turbine; outer HP shaft connects compressor and high-pressure turbine">`
    + `<g role="group" aria-label="Outer high-pressure shaft, compressor to high-pressure turbine">`
    + shell(-72, 94, 8, 8, back, bottom, "#81704f", 'class="shaft-hp"')
    + "</g>"
    + `<g role="group" aria-label="Inner low-pressure shaft, fan and booster to low-pressure turbine">`
    + cone(FAN_X + 2, 166, 3.5, 3.5, "#a2b8a2", 'class="shaft-lp"')
    + "</g>"
    + shell(-72, 94, 8, 8, bottom, front, "#9c8d63", 'class="shaft-hp"')
    + line([point(-72, 8, front), point(94, 8, front)], "#c8b47f", 'class="shaft-hp-edge" stroke-width="1.3"')
    + line([[FAN_X + 2, 3.5, AXIS_HEIGHT + 1], [166, 3.5, AXIS_HEIGHT + 1]], "#b2c9b4", 'class="shaft-lp-edge" stroke-width="1.25"')
    + "</g>";
}

function flowPath(points, kind) {
  return `<path class="flow ${kind}" d="${path(points)}" fill="none" stroke="${kind === "bypass" ? "#75d4cd" : "#efbc79"}" stroke-width="1.85" stroke-dasharray="4 12" stroke-linecap="round" marker-end="url(#jet-${kind}-arrow)"/>`;
}

function airflow() {
  return `<g class="airflow" aria-label="Separate bypass and core airflow paths">`
    + flowPath([[-227, 0, AXIS_HEIGHT + 71], [-157, 0, AXIS_HEIGHT + 71], [-97, 0, AXIS_HEIGHT + 64], [-17, 0, AXIS_HEIGHT + 55], [44, 0, AXIS_HEIGHT + 52], [115, 0, AXIS_HEIGHT + 51]], "bypass")
    + flowPath([[-227, 70, AXIS_HEIGHT + 11], [-157, 70, AXIS_HEIGHT + 11], [-97, 65, AXIS_HEIGHT + 11], [-17, 54, AXIS_HEIGHT + 11], [44, 47, AXIS_HEIGHT + 11], [113, 46, AXIS_HEIGHT + 11]], "bypass")
    + flowPath([[-227, 14, AXIS_HEIGHT + 34], [-156, 14, AXIS_HEIGHT + 34], [-135, 14, AXIS_HEIGHT + 30], [-100, 14, AXIS_HEIGHT + 24], [-63, 14, AXIS_HEIGHT + 20], [10, 14, AXIS_HEIGHT + 12], [34, 14, AXIS_HEIGHT + 17], [60, 14, AXIS_HEIGHT + 17], [88, 14, AXIS_HEIGHT + 13], [161, 14, AXIS_HEIGHT + 22], [233, 14, AXIS_HEIGHT + 20]], "core")
    + "</g>";
}

function selectedStyles() {
  const parts = ["booster", "compressor", "hpt", "lpt", "combustor", "nozzle"];
  return parts.map((part) => `[data-stage="${part}"] [data-part="${part}"] .metal{fill:#d0c09a;stroke:#f3deb0}`)
    .join("\n")
    + `
[data-stage="fan"] [data-part="fan"] .fan-blade{fill:url(#jet-composite-selected);stroke:#d9cfad}
[data-stage="fan"] [data-part="fan"] .fan-leading-edge{stroke:#eee1bc;stroke-width:1.4}
[data-stage="combustor"] [data-part="combustor"]{filter:url(#jet-soft)}
[data-stage="nozzle"] [data-part="nozzle"]{filter:url(#jet-soft)}
[data-stage="shafts"] .shaft-lp{fill:#82d3c6}
[data-stage="shafts"] .shaft-hp{fill:#c89c60}
[data-stage="shafts"] .shaft-lp-edge{stroke:#c5fff1;stroke-width:2.2;filter:url(#jet-soft)}
[data-stage="shafts"] .shaft-hp-edge{stroke:#ffe2a1;stroke-width:2.1;filter:url(#jet-soft)}
[data-stage="shafts"] .airflow{opacity:.18}
[data-flow="false"] .airflow{display:none}
.flow{filter:url(#jet-soft)}
`;
}

const DEFINITIONS = `<defs>
<linearGradient id="jet-casing" gradientUnits="userSpaceOnUse" x1="0" y1="95" x2="0" y2="330"><stop stop-color="#71816c"/><stop offset=".45" stop-color="#344639"/><stop offset="1" stop-color="#1c2a21"/></linearGradient>
<linearGradient id="jet-casing-front" gradientUnits="userSpaceOnUse" x1="0" y1="115" x2="0" y2="340"><stop stop-color="#53684d"/><stop offset="1" stop-color="#253528"/></linearGradient>
<linearGradient id="jet-cold-metal" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="320"><stop stop-color="#c4ceb9"/><stop offset=".45" stop-color="#8b9d83"/><stop offset="1" stop-color="#405b45"/></linearGradient>
<linearGradient id="jet-lp-metal" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="320"><stop stop-color="#b4c8b5"/><stop offset=".43" stop-color="#849a88"/><stop offset="1" stop-color="#3b5648"/></linearGradient>
<linearGradient id="jet-composite" gradientUnits="userSpaceOnUse" x1="0" y1="95" x2="0" y2="350"><stop stop-color="#768877"/><stop offset=".46" stop-color="#24392f"/><stop offset="1" stop-color="#485e4e"/></linearGradient>
<linearGradient id="jet-composite-selected" gradientUnits="userSpaceOnUse" x1="0" y1="95" x2="0" y2="350"><stop stop-color="#9ca58b"/><stop offset=".46" stop-color="#35483a"/><stop offset="1" stop-color="#7e8b69"/></linearGradient>
<linearGradient id="jet-spinner" gradientUnits="userSpaceOnUse" x1="110" y1="170" x2="175" y2="300"><stop stop-color="#d7ddc5"/><stop offset=".5" stop-color="#95a587"/><stop offset="1" stop-color="#3d533d"/></linearGradient>
<linearGradient id="jet-hot-metal" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="320"><stop stop-color="#b8a57d"/><stop offset=".5" stop-color="#8b7952"/><stop offset="1" stop-color="#454331"/></linearGradient>
<filter id="jet-shadow"><feGaussianBlur stdDeviation="13"/></filter>
<marker id="jet-bypass-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 5 2.5 0 5Z" fill="#75d4cd"/></marker>
<marker id="jet-core-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 5 2.5 0 5Z" fill="#efbc79"/></marker>
</defs>`;

export function drawJet(license) {
  const parts = [`<ellipse cx="395" cy="324" rx="278" ry="32" fill="#070b07" opacity=".5" filter="url(#jet-shadow)"/>`];
  const back = Math.PI * .5;
  const backBottom = Math.PI * 1.48;
  const cut = Math.PI * 1.92;

  parts.push(`<g role="group" aria-label="Cutaway fan case and shorter bypass cowl">`);
  parts.push(shell(-154, 34, 104, 66, back, backBottom, "url(#jet-casing)"));
  parts.push(shell(-150, 31, 97, 61, back, backBottom, "#24372c"));
  for (const x of [-144, -82, -19, 31]) {
    parts.push(line(ring(x, 104 - (x + 154) * 38 / 188, back, backBottom), "#647861"));
  }
  parts.push("</g>");

  parts.push(`<g data-part="nozzle" role="group" aria-label="Core exhaust nozzle and tail cone">`);
  parts.push(shell(169, 197, 43, 29, back, Math.PI * 1.77, "url(#jet-hot-metal)", 'class="metal"'));
  parts.push(cone(170, 214, 13, 1.5, "url(#jet-cold-metal)", 'class="metal"'));
  parts.push("</g>");

  parts.push(shell(97, 167, 33, 43, back, Math.PI * 1.15, "#334937"));
  parts.push(flange(99, 34, back, Math.PI * 1.15));
  parts.push(flange(168, 44, back, Math.PI * 1.15));
  parts.push(rotorAssembly("lpt"));
  parts.push(shell(66, 94, 29, 31, back, Math.PI * 1.15, "#4b4933"));
  parts.push(rotorAssembly("hpt"));
  parts.push(combustor());

  parts.push(shell(-74, 17, 35, 25, back, Math.PI * 1.18, "#3a4c37"));
  parts.push(flange(-74, 35, back, Math.PI * 1.18));
  parts.push(flange(17, 25, back, Math.PI * 1.18));
  parts.push(rotorAssembly("compressor"));
  parts.push(shell(-113, -74, 44, 35, back, Math.PI * 1.18, "#3b5140"));
  parts.push(rotorAssembly("booster"));
  parts.push(shafts());

  parts.push(shell(97, 167, 33, 43, Math.PI * 1.29, Math.PI * 1.72, "url(#jet-casing-front)"));
  for (const x of [100, 133, 167]) parts.push(flange(x, 33 + (x - 97) * 10 / 70, Math.PI * 1.29, Math.PI * 1.72));
  parts.push(shell(-154, 34, 104, 66, Math.PI * 1.24, cut, "url(#jet-casing-front)"));
  parts.push(shell(-154, 34, 98.5, 60.5, cut - .018, cut, "#a6b498"));
  for (const x of [-144, -82, -19, 31]) {
    parts.push(line(ring(x, 104 - (x + 154) * 38 / 188, Math.PI * 1.24, cut), "#69825f"));
  }

  parts.push(shell(-172, -154, 107, 104, 0, Math.PI * 2, "url(#jet-casing)"));
  parts.push(shell(-175, -172, 107, 107, 0, Math.PI * 2, "#70866d"));
  parts.push(fan());
  for (let index = 0; index < 20; index++) {
    const [cx, cy] = at(point(-175, 104, index * Math.PI / 10));
    parts.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r=".9" fill="#c7d0b7"/>`);
  }
  parts.push(airflow());

  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="410" viewBox="0 0 760 410" role="img" aria-labelledby="jet-title jet-desc" data-stage="fan" data-flow="true">
<title id="jet-title">GE9X engine cutaway</title>
<desc id="jet-desc">Educational drawing of the GE9X architecture: a 16-blade composite fan, 3 booster stages, 11 high-pressure compressor stages, an annular combustor, 2 high-pressure turbine stages, and 6 low-pressure turbine stages. A shorter bypass cowl surrounds the forward engine, leaving the aft core exposed. An inner low-pressure shaft and an outer high-pressure shaft connect their respective rotors. Flow paths and non-fan blade counts are illustrative. Cutaway drew this model from public references without manufacturer CAD.</desc>
<metadata>${license.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</metadata>
${glowDefs("jet", { width: WIDTH, height: HEIGHT })}${DEFINITIONS}
<style>${selectedStyles()}</style><rect width="760" height="410" fill="#141813"/>${parts.join("")}</svg>`;
}
