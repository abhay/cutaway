import { fitProjection, boxCorners } from "../../skills/cutaway/upstream/kit/iso-kit.mjs";

export const stages = [
  { at: 0, end: 1, name: "Cold", pump: "Off", heater: "Off", valve: "To drain", text: "The reservoir and brew boiler are already full. The pump is off, and the valve closes the boiler outlet while connecting the group to the drip tray." },
  { at: 1, end: 7, name: "Heating", pump: "Off", heater: "On", valve: "To drain", text: "The element heats water inside the brew boiler while the pump stays off." },
  { at: 7, end: 9, name: "Ready", pump: "Off", heater: "Holding", valve: "To drain", text: "The boiler has reached its target temperature. The temperature control keeps the boiler hot. Water hasn’t reached the coffee yet." },
  { at: 9, end: 20, name: "Brewing", pump: "On", heater: "Holding", valve: "To group", text: "The pump pushes water into the full boiler, displacing hot water through the open brew valve, shower screen and coffee puck. Espresso collects in the cup." },
  { at: 20, end: 22, name: "Finished", pump: "Off", heater: "Holding", valve: "To drain", text: "The pump stops. The three-way valve closes the boiler path and connects the group to the drip tray, releasing pressure above the coffee puck." },
];
export const parts = {
  reservoir: "The reservoir supplies water to the pump. Its level falls as water reaches the cup.",
  pump: "The pump draws water from the reservoir and pushes it through the brew circuit. Resistance from the coffee puck helps pressure build. The heater warms the water, and the pump supplies the brewing pressure.",
  boiler: "The brew boiler holds water around an electric heating element. Incoming water replaces water leaving for the group, so the boiler stays full.",
  valve: "The three-way valve connects the boiler to the group while brewing. At the end, it blocks the boiler and connects the group to the drain.",
  group: "The group spreads water across the coffee. The portafilter holds the filter basket and coffee puck underneath it.",
};
export const espressoBase = { x: -125, y: -69, w: 259, d: 170, r: 9 };
export const espressoProjection = fitProjection(boxCorners(espressoBase, -10, 171), 900, 650, { pad: 48, azimuth: 55, elevation: 27 });

export function espressoFrame(projection, time, reduced = true) {
  const brewing = time >= 9 && time < 20;
  const heating = time >= 1 && time < 7;
  const warm = time >= 7;
  const draining = time >= 20 && time < 20.8;
  const delivered = Math.max(0, Math.min(1, (time - 9) / 11));
  const level = 105 - delivered * 7;
  const projected = ([x, y, z]) => {
    const azimuth = projection.azimuth * Math.PI / 180;
    const elevation = projection.elevation * Math.PI / 180;
    const scale = projection.scale * Math.sqrt(1.6);
    return [projection.origin[0] + (x * Math.sin(azimuth) - y * Math.cos(azimuth)) * scale, projection.origin[1] + ((x * Math.cos(azimuth) + y * Math.sin(azimuth)) * Math.sin(elevation) - z * Math.cos(elevation)) * scale];
  };
  const polygon = (points) => points.map((point, index) => `${index ? "L" : "M"}${projected(point).map((value) => value.toFixed(2)).join(" ")}`).join("") + "Z";
  const changes = [];
  const set = (selector, attributes) => changes.push({ selector, attributes });
  set("[data-reservoir-fill]", { d: polygon([[-100, -46, 19], [-58, -46, 19], [-58, 14, 19], [-100, 14, 19]]) + polygon([[-100, -46, level], [-58, -46, level], [-58, 14, level], [-100, 14, level]]) + polygon([[-58, -46, 19], [-58, 14, 19], [-58, 14, level], [-58, -46, level]]) + polygon([[-100, 14, 19], [-58, 14, 19], [-58, 14, level], [-100, 14, level]]) });
  set("[data-reservoir-surface]", { d: polygon([[-100, -46, level], [-58, -46, level], [-58, 14, level], [-100, 14, level]]) });
  set("[data-heater-glow]", { opacity: heating ? .85 : 0 });
  set("[data-heater]", { stroke: heating ? "#f3be75" : warm ? "#c69560" : "#ae8355" });
  set("[data-boiler-water]", { fill: warm || heating ? "#edbb78" : "#7acbc0" });
  set("[data-ready-light]", { fill: warm ? "#d8d898" : "#717866" });
  set("[data-pump-light]", { opacity: brewing ? .8 : 0 });
  set("[data-coffee-stream], [data-coffee-dashes]", { opacity: brewing ? 1 : 0 });
  set("[data-cup-coffee]", { opacity: delivered > 0 ? .35 + delivered * .65 : 0 });
  for (const id of ["supply", "inlet", "hot", "group", "drain"]) {
    const active = id === "drain" ? draining : id === "group" ? brewing || draining : brewing;
    set(`[data-flow="${id}"].water-track`, { opacity: active ? 1 : .25 });
    set(`[data-flow="${id}"].flow-dashes`, { opacity: active ? 1 : 0 });
  }
  set("[data-valve-mark]", { stroke: brewing ? "#f1c581" : "#b4c4ae" });
  set(".flow-dashes", { "stroke-dashoffset": reduced ? 0 : time * -34 });
  if (draining && !reduced) set('[data-flow="group"].flow-dashes', { "stroke-dashoffset": time * 34 });
  return changes;
}
