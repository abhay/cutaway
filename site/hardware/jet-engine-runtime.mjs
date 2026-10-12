import { jetParts } from "./jet-engine-parts.mjs";

const descriptions = new Map(jetParts.map(({ id, title, description }) => [id, [title, description]]));
const figure = document.querySelector("svg");
const title = document.querySelector(".readout h2");
const description = document.querySelector(".readout p");
const flow = document.querySelector("#jet-flow");
const animate = document.querySelector("#jet-animate");
const coolLegend = document.querySelector('[data-jet-legend="cool"]');
const warmLegend = document.querySelector('[data-jet-legend="warm"]');
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let playing = false;
let visible = true;
let frame = 0;
let last = 0;
let offset = 0;

function updatePlayback() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
  animate.disabled = motion.matches || !flow.checked;
  animate.textContent = motion.matches ? "Motion reduced" : playing ? "Pause flow" : "Animate flow";
  animate.setAttribute("aria-pressed",String(playing));
  if (playing && flow.checked && !motion.matches && visible && !document.hidden) frame = requestAnimationFrame(tick);
}

function tick(now) {
  const dt = last ? Math.min((now-last)/1000,1/30) : 0;
  last = now;
  offset = (offset-dt*20)%1600;
  figure.querySelectorAll(".flow").forEach((path)=>path.setAttribute("stroke-dashoffset",String(offset)));
  frame = requestAnimationFrame(tick);
}

document.querySelectorAll("[data-stage-button]").forEach((button)=>button.addEventListener("click",()=>{
  const stage = button.dataset.stageButton;
  figure.dataset.stage = stage;
  for (const option of document.querySelectorAll("[data-stage-button]")) option.setAttribute("aria-pressed",String(option===button));
  [title.textContent,description.textContent] = descriptions.get(stage);
  coolLegend.textContent = stage === "shafts" ? "Low-pressure shaft" : "Bypass air";
  warmLegend.textContent = stage === "shafts" ? "High-pressure shaft" : "Core air & exhaust";
}));
flow.addEventListener("change",()=>{
  figure.dataset.flow=String(flow.checked);
  if (!flow.checked) playing=false;
  updatePlayback();
});
animate.addEventListener("click",()=>{playing=!playing;updatePlayback();});
document.addEventListener("visibilitychange",updatePlayback);
motion.addEventListener("change",()=>{if(motion.matches)playing=false;updatePlayback();});
if (typeof IntersectionObserver === "function") new IntersectionObserver((entries)=>{
  visible=entries[entries.length-1].isIntersecting;
  updatePlayback();
},{threshold:0}).observe(figure);
window.addEventListener("pagehide",()=>{playing=false;updatePlayback();});
updatePlayback();
