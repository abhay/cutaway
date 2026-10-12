import { jetParts } from "../site/hardware/jet-engine-parts.mjs";
import { stages, parts } from "../site/hardware/espresso-model.mjs";

export const origin = "https://cutaway.abhay.gg";
export function isServiceOrigin(value) {
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    return url.origin === value && (local && url.protocol === "http:" || url.protocol === "https:" && (
      url.hostname === new URL(origin).hostname || url.hostname === "cutaway-abhay.pages.dev" || /^[a-z0-9-]+\.cutaway-abhay\.pages\.dev$/.test(url.hostname)
    ));
  } catch { return false; }
}
const choice = (values, value, description) => ({ type: "string", enum: values, default: value, description });
const number = (min, max, value, description) => ({ type: "number", minimum: min, maximum: max, default: value, description });
const flag = (value, description) => ({ type: "boolean", default: value, description });

export const models = {
  "jet-engine": {
    title: "GE9X jet engine", tool: "open_ge9x",
    description: "Open an interactive GE9X cutaway at a selected component, with core and bypass airflow, sources, and downloads. Published architecture with illustrative geometry; not a performance simulation.",
    fields: {
      component: choice(jetParts.map(({ id }) => id), "fan", "Component to highlight. hpt and lpt are the high- and low-pressure turbines."),
      flow: flag(true, "Show the airflow paths. Animation starts paused."),
    },
    limits: "Blade profiles, internal dimensions, spacing, and nacelle shapes are illustrative. Flow animation shows direction, not airspeed or mass flow. Cooling and accessory systems are omitted.",
    sources: [
      ["GE Aerospace: GE9X", "https://www.geaerospace.com/commercial/aircraft-engines/ge9x"],
      ["GE: compressor, combustor and materials", "https://www.geaerospace.com/news/articles/product/first-ge9x-hits-test-targets-and-prepares-chilling-icing-tests"],
      ["NASA: turbofan operation", "https://www.grc.nasa.gov/WWW/K-12/airplane/aturbf.html"],
    ],
  },
  wing: {
    title: "Wing designs", tool: "open_wing",
    description: "Open an interactive wing cutaway. Compare planforms, deflect the flap, extend the slat, and expose ribs and spars. Includes sources and downloads. Does not calculate flight performance.",
    fields: {
      shape: choice(["rectangular", "tapered", "swept"], "swept", "Wing planform."),
      flap: { ...number(0, 35, 0, "Trailing-edge flap deflection in degrees."), type: "integer" },
      slat: flag(false, "Extend the leading-edge slat."),
      skin: flag(false, "Show the upper skin; false exposes ribs and spars."),
    },
    limits: "Simplified geometry. Lift, drag, stall speed, structural loads, and handling are not calculated.",
    sources: [
      ["NASA: wing geometry", "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/wing-geometry/"],
      ["NASA: flaps and slats", "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flaps-and-slats/"],
    ],
  },
  espresso: {
    title: "Espresso machine", tool: "open_espresso",
    description: "Open an interactive espresso brew circuit at a selected stage and component. Follow water through the reservoir, pump, boiler, valve, and group. Includes sources and downloads; timing and flow are illustrative.",
    fields: {
      stage: choice(["Cold", "Heating", "Ready", "Brewing", "Finished"], "Cold", "Stage of the shortened brew cycle."),
      component: choice(["reservoir", "pump", "boiler", "valve", "group"], "pump", "Part to inspect."),
      progress: { ...number(0, 1000, 0, "Optional exact cycle position, in thousandths. Overrides stage when supplied."), type: "integer" },
    },
    limits: "A generic brew circuit starting with a full boiler. Heating and brewing are shortened; pressure, temperature, and flow are not calculated. Steam and pressure bypass circuits are omitted.",
    sources: [
      ["La Marzocco: solenoid valves", "https://nz.lamarzocco.com/news/blog/what-is-a-solenoid-valve/"],
      ["La Marzocco: brew boilers", "https://www.lamarzoccousa.com/news/blog/dual-boiler-espresso-machines-are-consistent/"],
    ],
  },
  boxer: {
    title: "Boxer engine", tool: "open_boxer",
    description: "Open an interactive four-cylinder boxer cutaway at a crank angle and opposing piston pair. Shows separate crankpins and piston travel, with sources and downloads. Generic layout, not a specific production engine.",
    fields: {
      angle: { ...number(0, 360, 45, "Crank angle in degrees. Animation starts paused."), type: "integer" },
      pair: { ...number(1, 2, 1, "Opposing piston pair, 1 or 2."), type: "integer" },
    },
    limits: "Generic four-cylinder boxer geometry with a rod-to-crank-radius ratio of 3.5. Dimensions are illustrative. Valve train, combustion, cooling, and lubrication are omitted.",
    sources: [
      ["Subaru: boxer engines", "https://www.subaru.co.za/tech/boxer-engines-vs-inline-engines/"],
      ["NASA: piston engine cycle", "https://www.grc.nasa.gov/WWW/K-12/airplane/engstage.html"],
    ],
  },
};

export function normalizeState(id, input = {}) {
  if (!Object.hasOwn(models, id)) throw new Error("Unknown cutaway");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Settings must be an object");
  const fields = models[id].fields;
  for (const key of Object.keys(input)) if (!Object.hasOwn(fields, key)) throw new Error(`Unknown setting: ${key}`);
  const state = {};
  for (const [key, rule] of Object.entries(fields)) {
    const value = input[key] ?? rule.default;
    if (Object.hasOwn(input, key) && input[key] === null) throw new Error(`Invalid ${key}`);
    const numeric = rule.type === "number" || rule.type === "integer";
    if (numeric ? !Number.isFinite(value) || value < rule.minimum || value > rule.maximum || rule.type === "integer" && !Number.isInteger(value)
      : typeof value !== rule.type || rule.enum && !rule.enum.includes(value)) throw new Error(`Invalid ${key}`);
    state[key] = value;
  }
  if (id === "espresso") {
    const starts = [0, 46, 319, 410, 910];
    if (!Object.hasOwn(input, "progress")) state.progress = starts[fields.stage.enum.indexOf(state.stage)];
    state.stage = fields.stage.enum[starts.findLastIndex((start) => state.progress >= start)];
  }
  return state;
}

export function viewLinks(id, input, base = origin) {
  const state = normalizeState(id, input);
  const query = new URLSearchParams({ state: JSON.stringify(state) });
  return {
    view: `${base}/view/${id}?${query}`,
    html: `${base}/export/${id}.html?${query}`,
    svg: `${base}/export/${id}.svg?${query}`,
  };
}

export function describeView(id, state) {
  if (id === "jet-engine") return jetParts.find(({ id }) => id === state.component).description;
  if (id === "wing") return `The ${state.shape} wing has a ${state.flap}° trailing-edge flap, ${state.slat ? "extended" : "retracted"} leading-edge slat, and ${state.skin ? "closed" : "open"} upper skin. Spars carry loads along the span; ribs hold the airfoil shape. Extending flaps and slats changes the airfoil for low-speed flight.`;
  if (id === "espresso") return `${stages.find(({ name }) => name === state.stage).text} ${parts[state.component]}`;
  return `Pair ${state.pair} at ${state.angle}°. The opposed pistons move toward the crankshaft together, then away together. Each connecting rod has its own crankpin, 180° from the other.`;
}
