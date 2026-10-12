import { boxerSpec, engineDrawing, cylinderPose, boxerSection, wrap } from "./boxer-scene.mjs";

const root = document.querySelector("[data-engine]");
const spec = boxerSpec();
const angleControl = document.querySelector("#crank-angle");
const select = document.querySelector("#selection");
const run = document.querySelector("#run");
const step = document.querySelector("#step");
const region = document.querySelector("#engine-geometry");
const inspector = document.querySelector("#section-drawing");
const readout = document.querySelector("#angle-value");
const heading = document.querySelector("#phase-name");
const detail = document.querySelector("#phase-detail");
const travel = document.querySelector("#travel-value");
const valves = document.querySelector("#valve-value");
const live = document.querySelector("#announcement");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
let angle = spec.initial;
let selected = 0;
let playing = false;
let onScreen = true;
let frame = 0;
let last = 0;

if (new URLSearchParams(location.search).get("embed") === "1") document.documentElement.dataset.embed = "true";

function description() {
  const cylinder = spec.cylinders[selected * 2];
  const pose = cylinderPose(spec, cylinder, angle);
  const outwardAngle = wrap(angle - cylinder.station * 180, 360);
  const motion = outwardAngle === 0 ? "Outer dead center" : outwardAngle === 180 ? "Inner dead center" : outwardAngle < 180 ? "Moving inward" : "Moving outward";
  return { pose, motion };
}

function paint(announce = false) {
  const { pose, motion } = description();
  region.innerHTML = engineDrawing(spec, angle, selected);
  angleControl.value = String(angle);
  readout.textContent = `${Math.round(angle)}°`;
  travel.textContent = `${Math.round(pose.travel * 100)}%`;
  heading.textContent = `Pair ${selected + 1} · ${motion.toLowerCase()}`;
  detail.textContent = "Both pistons move toward the crankshaft together, then away together. Each rod has its own crankpin; the 2 pins point in opposite directions.";
  valves.textContent = "Left and right travel match";
  inspector.innerHTML = boxerSection(spec, angle, selected);
  root.dataset.angle = String(angle);
  if (announce) {
    angleControl.setAttribute("aria-valuetext", `${Math.round(angle)} degrees. ${heading.textContent}. ${Math.round(pose.travel * 100)} percent inward from outer dead center.`);
    live.textContent = `${heading.textContent}. Crank angle ${Math.round(angle)} degrees.`;
  }
}

function cancelFrame() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
}

function ready() {
  return playing && onScreen && !document.hidden && !reduced.matches;
}

function tick(now) {
  frame = 0;
  if (!ready()) return;
  const elapsed = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
  last = now;
  angle = wrap(angle + elapsed * 42, spec.maxAngle);
  paint();
  frame = requestAnimationFrame(tick);
}

function schedule() {
  if (ready() && !frame) {
    last = 0;
    frame = requestAnimationFrame(tick);
  } else if (!ready()) cancelFrame();
}

function pause() {
  playing = false;
  run.textContent = "Play";
  run.setAttribute("aria-pressed", "false");
  cancelFrame();
}

function setAngle(value) {
  pause();
  angle = Math.max(0, Math.min(spec.maxAngle, value));
  paint(true);
}

run.addEventListener("click", () => {
  if (playing) {
    pause();
    paint(true);
  }
  else if (!reduced.matches) {
    playing = true;
    run.textContent = "Pause";
    run.setAttribute("aria-pressed", "true");
    schedule();
  }
});
angleControl.addEventListener("input", () => setAngle(Number(angleControl.value)));
select.addEventListener("change", () => {
  selected = Number(select.value);
  paint(true);
});
step.addEventListener("click", () => setAngle(wrap(angle + 45, spec.maxAngle)));
document.querySelector("#reset").addEventListener("click", () => {
  selected = 0;
  select.value = "0";
  setAngle(spec.initial);
});
document.querySelectorAll("[data-dead-center]").forEach((button) => button.addEventListener("click", () => {
  setAngle(wrap(selected * 180 + Number(button.dataset.deadCenter), 360));
}));
document.addEventListener("visibilitychange", schedule);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    pause();
    paint(true);
  }
});
if ("IntersectionObserver" in window) new IntersectionObserver((entries) => {
  onScreen = entries[entries.length - 1].isIntersecting;
  schedule();
}, { rootMargin: "80px 0px" }).observe(document.querySelector(".engine"));
function applyMotionPreference() {
  if (reduced.matches) pause();
  run.disabled = reduced.matches;
  document.querySelector("#motion-note").hidden = !reduced.matches;
}
reduced.addEventListener("change", applyMotionPreference);
window.addEventListener("pagehide", pause);
applyMotionPreference();
paint();
