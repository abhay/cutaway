import { boxCorners, fitProjection, iso, depthOf, pathOf } from "../../skills/cutaway/upstream/kit/iso-kit.mjs";

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;
const RADIUS = 24;
const ROD = 84;
const HEAD = 126;
const PALETTE = { steel: "#68757c", aluminum: "#a5b2b5", iron: "#3f4a50", dark: "#222e35", brass: "#d4a35c", liner: "#53666c" };
const add = (a, b) => a.map((value, i) => value + b[i]);
const sub = (a, b) => a.map((value, i) => value - b[i]);
const mul = (a, scale) => a.map((value) => value * scale);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => mul(a, 1 / Math.hypot(...a));
export const wrap = (angle, period = 720) => ((angle % period) + period) % period;

export function boxerSpec() {
  return {
    kind: "boxer", title: "Boxer engine", subtitle: "4 cylinders · separate opposed crankpins", initial: 45,
    crankZ: 67, maxAngle: 360, span: 158,
    cylinders: [0, 1].flatMap((station) => [0, 1].map((bank) => ({
      id: `${bank ? "R" : "L"}${station + 1}`, bank, station,
      beta: bank ? 90 : -90,
      crankOffset: station * 180 + (bank ? 90 : -90),
      offset: station * 180 + bank * 360,
      y: -43 + station * 76 + (bank ? 10 : -10),
    }))),
  };
}

export function cylinderPose(spec, cylinder, angle) {
  const beta = cylinder.beta * RAD;
  const crankAngle = (angle + cylinder.crankOffset) * RAD;
  const relative = crankAngle - beta;
  const distance = RADIUS * Math.cos(relative) + Math.sqrt(ROD * ROD - RADIUS * RADIUS * Math.sin(relative) ** 2);
  const axis = [Math.sin(beta), 0, Math.cos(beta)];
  const origin = [0, cylinder.y, spec.crankZ];
  const crankpin = add(origin, [RADIUS * Math.sin(crankAngle), 0, RADIUS * Math.cos(crankAngle)]);
  const wristpin = add(origin, mul(axis, distance));
  return {
    axis, origin, crankpin, wristpin, distance,
    phase: wrap(angle - cylinder.offset),
    travel: (ROD + RADIUS - distance) / (2 * RADIUS),
  };
}

function shade(hex, normal) {
  const light = unit([-0.4, -0.6, 1]);
  const factor = 0.66 + Math.max(0, dot(normal, light)) * 0.52;
  const values = hex.slice(1).match(/../g).map((part) => Math.min(255, Math.round(parseInt(part, 16) * factor)));
  return `rgb(${values.join(" ")})`;
}

function createScene() {
  const bounds = { x: -155, y: -88, w: 310, d: 182 };
  const P = fitProjection(boxCorners(bounds, -8, 109), 850, 560, { pad: 48, headroom: 25, azimuth: 64, elevation: 30 });
  const a = P.azimuth * RAD;
  const e = P.elevation * RAD;
  const view = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
  const pieces = [];
  function face(points, color, normal, { opacity = 1, edge = true, force = false } = {}) {
    if (!force && dot(normal, view) <= 0.001) return;
    const center = mul(points.reduce((sum, point) => add(sum, point), [0, 0, 0]), 1 / points.length);
    pieces.push({ depth: depthOf(center, P), markup: `<path d="${pathOf(points.map((point) => iso(point, P)), true)}" fill="${shade(color, normal)}"${edge ? ' stroke="#172128" stroke-width="0.5" stroke-linejoin="round"' : ""}${opacity < 1 ? ` opacity="${opacity}"` : ""}/>` });
  }
  function box(center, half, color, axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
    for (let axis = 0; axis < 3; axis++) {
      const u = (axis + 1) % 3;
      const v = (axis + 2) % 3;
      for (const sign of [-1, 1]) {
        const normal = mul(axes[axis], sign);
        const faceCenter = add(center, mul(normal, half[axis]));
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([cu, cv]) => add(add(faceCenter, mul(axes[u], half[u] * cu)), mul(axes[v], half[v] * cv)));
        face(corners, color, normal);
      }
    }
  }
  function frame(axis) {
    const u = unit(cross(axis, Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]));
    return { u, v: cross(axis, u) };
  }
  function disc(center, axis, length, radius, color, { steps = 20, cap = true } = {}) {
    const { u, v } = frame(axis);
    const ring = (t) => add(mul(u, Math.cos(t)), mul(v, Math.sin(t)));
    const ends = [-1, 1].map((sign) => add(center, mul(axis, sign * length / 2)));
    for (let i = 0; i < steps; i++) {
      const t = i / steps * TAU;
      const next = (i + 1) / steps * TAU;
      face([add(ends[0], mul(ring(t), radius)), add(ends[0], mul(ring(next), radius)), add(ends[1], mul(ring(next), radius)), add(ends[1], mul(ring(t), radius))], color, ring((t + next) / 2), { edge: false });
    }
    if (cap) for (let i = 0; i < 2; i++) face(Array.from({ length: steps }, (_, j) => add(ends[i], mul(ring(j / steps * TAU), radius))), color, mul(axis, i ? 1 : -1));
  }
  function beam(from, to, radius, width, color) {
    const direction = unit(sub(to, from));
    const sideways = unit(cross([0, 1, 0], direction));
    box(mul(add(from, to), 0.5), [radius, width / 2, Math.hypot(...sub(to, from)) / 2], color, [sideways, [0, 1, 0], direction]);
    disc(from, [0, 1, 0], width + 0.6, radius + 1.5, color);
    disc(to, [0, 1, 0], width + 0.6, radius + 1.5, color);
  }
  function sleeve(origin, axis, from, to, outer, inner, color) {
    const { u, v } = frame(axis);
    const toward = Math.atan2(dot(view, v), dot(view, u));
    const start = toward + Math.PI / 2;
    const radial = (t) => add(mul(u, Math.cos(t)), mul(v, Math.sin(t)));
    const point = (s, r, t) => add(add(origin, mul(axis, s)), mul(radial(t), r));
    const steps = 18;
    for (let i = 0; i < steps; i++) {
      const lo = start + Math.PI * i / steps;
      const hi = start + Math.PI * (i + 1) / steps;
      const normal = radial((lo + hi) / 2);
      face([point(from, outer, lo), point(from, outer, hi), point(to, outer, hi), point(to, outer, lo)], color, normal, { edge: false });
      face([point(from, inner, lo), point(from, inner, hi), point(to, inner, hi), point(to, inner, lo)], PALETTE.liner, mul(normal, -1), { edge: false });
      for (const s of [from, to]) face([point(s, inner, lo), point(s, outer, lo), point(s, outer, hi), point(s, inner, hi)], PALETTE.aluminum, mul(axis, s === to ? 1 : -1));
    }
    for (const t of [start, start + Math.PI]) {
      const normal = t === start ? add(mul(u, Math.sin(t)), mul(v, -Math.cos(t))) : add(mul(u, -Math.sin(t)), mul(v, Math.cos(t)));
      face([point(from, inner, t), point(from, outer, t), point(to, outer, t), point(to, inner, t)], PALETTE.aluminum, normal, { force: true });
    }
  }
  return { P, view, pieces, face, box, disc, beam, sleeve };
}

export function engineDrawing(spec, angle, selected = 0) {
  const scene = createScene();
  const { box, disc, beam, sleeve } = scene;
  const active = (index) => spec.cylinders[index].station === selected;
  const halfWidth = 154;
  const halfLength = 87;
  box([0, 0, -3], [halfWidth, halfLength, 4], "#253036");
  for (const x of [-halfWidth + 14, halfWidth - 14]) for (const y of [-halfLength + 14, halfLength - 14]) {
    disc([x, y, -7], [0, 0, 1], 3, 6, PALETTE.dark);
    disc([x, y, 1.5], [0, 0, 1], 1.6, 2.6, PALETTE.steel, { steps: 6 });
  }
  const bearingYs = [-72, -5, 70];
  box([0, 0, 12], [35, halfLength - 14, 8], PALETTE.dark);
  for (const y of bearingYs) {
    box([0, y, spec.crankZ / 2 + 8], [15, 4, spec.crankZ / 2 - 8], PALETTE.iron);
    disc([0, y, spec.crankZ], [0, 1, 0], 7, 11, PALETTE.steel);
    disc([0, y + 4, spec.crankZ], [0, 1, 0], 1, 7, PALETTE.dark);
  }
  const shaftStart = -78;
  const shaftEnd = 91;
  const throwCenters = spec.cylinders.map((c) => c.y);
  for (let i = 0; i < throwCenters.length; i++) {
    const cylinder = spec.cylinders[i];
    const centerY = throwCenters[i];
    const theta = (angle + cylinder.crankOffset) * RAD;
    const radial = [RADIUS * Math.sin(theta), 0, RADIUS * Math.cos(theta)];
    const halfPin = 6;
    const pin = add([0, centerY, spec.crankZ], radial);
    disc(pin, [0, 1, 0], halfPin * 2, 6, PALETTE.steel);
    for (const y of [centerY - halfPin - 2, centerY + halfPin + 2]) {
      beam([0, y, spec.crankZ], add([0, y, spec.crankZ], radial), 8, 3, PALETTE.iron);
      disc(add([0, y, spec.crankZ], mul(radial, -0.35)), [0, 1, 0], 3.2, 12, PALETTE.iron);
    }
    const prev = i ? throwCenters[i - 1] + halfPin + 4 : shaftStart;
    const next = centerY - halfPin - 4;
    if (next > prev) disc([0, (prev + next) / 2, spec.crankZ], [0, 1, 0], next - prev, 6.5, PALETTE.steel);
    if (i === throwCenters.length - 1) disc([0, (centerY + halfPin + 4 + shaftEnd) / 2, spec.crankZ], [0, 1, 0], shaftEnd - centerY - halfPin - 4, 6.5, PALETTE.steel);
  }
  disc([0, shaftEnd - 2, spec.crankZ], [0, 1, 0], 8, 27, PALETTE.iron, { steps: 48 });
  disc([0, shaftEnd + 2.5, spec.crankZ], [0, 1, 0], 1.2, 21, PALETTE.steel, { steps: 48 });
  disc([0, shaftEnd + 3.5, spec.crankZ], [0, 1, 0], 2, 9, PALETTE.dark);
  for (let i = 0; i < 10; i++) {
    const t = (angle * RAD) + i / 10 * TAU;
    disc([19 * Math.sin(t), shaftEnd + 3.8, spec.crankZ + 19 * Math.cos(t)], [0, 1, 0], 1.2, 2, PALETTE.dark, { steps: 8 });
  }
  spec.cylinders.forEach((cylinder, index) => {
    const pose = cylinderPose(spec, cylinder, angle);
    const { axis, origin, wristpin, crankpin, distance } = pose;
    const lit = active(index);
    const radial = [Math.cos(cylinder.beta * RAD), 0, -Math.sin(cylinder.beta * RAD)];
    sleeve(origin, axis, 54, HEAD, 21.5, 17, PALETTE.iron);
    sleeve(origin, axis, HEAD, HEAD + 12, 24, 14.5, PALETTE.steel);
    for (let s = 61; s < HEAD; s += 10) sleeve(origin, axis, s, s + 2, 24, 21.6, PALETTE.iron);
    beam(crankpin, wristpin, 3.9, 6, lit ? PALETTE.brass : PALETTE.aluminum);
    disc(crankpin, [0, 1, 0], 7.5, 7.2, lit ? PALETTE.brass : PALETTE.aluminum);
    disc(add(crankpin, [0, 4.2, 0]), [0, 1, 0], 0.5, 4.2, PALETTE.dark);
    disc(wristpin, axis, 20, 16.2, lit ? PALETTE.brass : PALETTE.aluminum, { steps: 28 });
    for (const s of [6, 8.5]) disc(add(wristpin, mul(axis, s)), axis, 0.9, 16.4, PALETTE.dark, { steps: 28 });
    disc(wristpin, [0, 1, 0], 33, 3, PALETTE.steel, { steps: 16 });
    const head = add(origin, mul(axis, HEAD + 5));
    const rear = add(head, [0, -18, 0]);
    box(rear, [20, 5, 8], PALETTE.steel, [radial, [0, 1, 0], axis]);
    for (const side of [-1, 1]) {
      const position = add(add(origin, mul(axis, HEAD + 10)), mul(radial, side * 17));
      disc(position, axis, 3, 2.3, PALETTE.aluminum, { steps: 6 });
    }
    const plug = add(origin, mul(axis, HEAD + 11));
    disc(plug, axis, 12, 2.2, "#c2c7bf", { steps: 12 });
    disc(add(plug, mul(axis, 5)), axis, 3, 3.7, PALETTE.steel, { steps: 6 });
    if (lit) {
      const t = Math.floor(pose.phase / 180);
      const gasColor = t === 2 ? "#c89751" : "#6d8e94";
      const gasFrom = distance + 10.5;
      const gap = HEAD - gasFrom;
      const facePoints = [add(add(origin, mul(axis, gasFrom)), mul(radial, -15.8)), add(add(origin, mul(axis, gasFrom)), mul(radial, 15.8)), add(add(origin, mul(axis, HEAD)), mul(radial, 15.8)), add(add(origin, mul(axis, HEAD)), mul(radial, -15.8))];
      if (gap > 0) scene.face(facePoints, gasColor, [0, 1, 0], { opacity: 0.27, edge: false, force: true });
    }
  });
  return `<g stroke-linecap="round">${scene.pieces.sort((a, b) => a.depth - b.depth).map((piece) => piece.markup).join("")}</g>`;
}

export function engineSvg(spec, angle = spec.initial, selected = 0, license = "") {
  const label = `${spec.title}: ${spec.subtitle}. Cutaway shows pistons, connecting rods, crankshaft and cylinder walls.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="560" viewBox="0 0 850 560" role="img" aria-labelledby="engine-title engine-description"><title id="engine-title">${spec.title} · ${spec.subtitle}</title><desc id="engine-description">${label}</desc>${license ? `<metadata>${license.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</metadata>` : ""}<rect width="850" height="560" fill="#101a20"/><text x="32" y="35" fill="#a8b5b7" font-size="11" letter-spacing="1.7" font-family="ui-monospace,monospace">FLAT-FOUR / BOXER CRANK</text><g id="engine-geometry">${engineDrawing(spec, angle, selected)}</g></svg>`;
}

export function boxerSection(spec, angle, pair) {
  const cylinders = spec.cylinders.filter((c) => c.station === pair);
  const poses = cylinders.map((c) => cylinderPose(spec, c, angle));
  const center = [130, 131];
  const points = poses.map((pose) => [center[0] + pose.crankpin[0] * 0.63, center[1] - (pose.crankpin[2] - spec.crankZ) * 0.63]);
  const pistons = poses.map((pose) => center[0] + pose.wristpin[0] * 0.63);
  return `<svg viewBox="0 0 260 270" role="img" aria-label="End view of the selected opposed pair; each rod connects to its own crankpin"><rect width="260" height="270" rx="12" fill="#162229"/><path d="M39 108H94M39 154H94M166 108H221M166 154H221" stroke="#71838a" stroke-width="8"/><circle cx="130" cy="131" r="28" stroke="#43565f" fill="none"/>${points.map((point, i) => `<path d="M130 131L${point.join(" ")}" stroke="#66777d" stroke-width="9"/><path d="M${point.join(" ")}L${pistons[i]} 131" stroke="#d2ad70" stroke-width="6"/><circle cx="${point[0]}" cy="${point[1]}" r="4" fill="#121d24" stroke="#e9c990"/><rect x="${pistons[i] - 7}" y="111" width="14" height="40" rx="2" fill="#caa469" stroke="#ead5ad"/>`).join("")}<circle cx="130" cy="131" r="3" fill="#cbd5d4"/><text x="130" y="39" text-anchor="middle" fill="#b5c6c9" font-size="11" font-family="ui-monospace,monospace">END VIEW</text><text x="130" y="216" text-anchor="middle" fill="#b5c6c9" font-size="11" font-family="ui-monospace,monospace">2 rods · 2 separate crankpins</text><text x="130" y="235" text-anchor="middle" fill="#8d9fa5" font-size="10" font-family="ui-monospace,monospace">Pins sit at different shaft positions.</text></svg>`;
}
