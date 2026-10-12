import { createModel } from "./models.mjs";
import { presentation } from "./view.mjs";
import { bindAppearance } from "../glow/controls.mjs";

const id = document.body.dataset.example;
const projection = JSON.parse(document.querySelector("#projection").textContent);
const stage = document.querySelector(".stage");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
bindAppearance(document.body, stage.querySelector("svg"), document.querySelector(".appearance"));
let model = createModel(id);
let running = false;
let visible = true;
let frame = 0;
let last = null;
let lastEvents = "";

function paint() {
  const state = model.state;
  const view = presentation(id, state, projection);
  for (const [name, attributes] of Object.entries(view.pieces)) {
    const element = document.getElementById(name);
    for (const [key, value] of Object.entries(attributes)) {
      if (key === "text") element.textContent = value;
      else element.setAttribute(key, String(value));
    }
  }
  view.metrics.forEach(([, value], index) => { document.querySelector(`#metric-${index}`).textContent = String(value); });
  document.querySelector("#detail").textContent = view.detail;
  document.querySelector("#message").textContent = state.message;
  document.querySelector(".stage svg").setAttribute("aria-label", `${document.querySelector("#mechanism-description").textContent} ${view.detail}`);
  const clock = document.querySelector("#time");
  if (clock) clock.textContent = `${state.time.toFixed(1)} s`;
  if (id === "token-bucket") {
    for (const name of ["capacity", "rate"]) {
      document.querySelector(`#${name}`).value = state[name];
      document.querySelector(`#${name}-value`).textContent = String(state[name]);
    }
  }
  if (id === "connection-pool") {
    state.slots.forEach((job, index) => {
      document.querySelector(`#slot-${index}`).textContent = job ? `Job ${job.id} · ${job.remaining.toFixed(1)}s left` : "Available";
      document.querySelector(`[data-action="release"][data-value="${index}"]`).disabled = !job;
    });
  }
  if (id === "circuit-breaker") {
    document.querySelector('[data-action="service"]').textContent = state.healthy ? "Fail downstream" : "Restore downstream";
    document.querySelector('[data-action="resolve"]').disabled = !state.pending;
  }
  const events = JSON.stringify(state.events);
  if (lastEvents !== events) {
    lastEvents = events;
    const list = document.querySelector("#events");
    list.replaceChildren(...state.events.map((event) => {
      const item = document.createElement("li");
      item.textContent = `${id === "lru-cache" ? "" : `${event.time.toFixed(1)}s · `}${event.message}`;
      return item;
    }));
  }
}

function announce() { document.querySelector("#announcement").textContent = model.state.message; }

function tick(now) {
  frame = 0;
  if (!running || !visible || document.hidden) return;
  if (last !== null) model.advance(Math.min(0.1, Math.max(0, (now - last) / 1000)));
  last = now;
  paint();
  frame = requestAnimationFrame(tick);
}

function schedule() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  last = null;
  if (running && visible && !document.hidden) frame = requestAnimationFrame(tick);
}

function setRunning(value) {
  running = value;
  document.querySelector('[data-action="play"]')?.replaceChildren(document.createTextNode(running ? "Pause clock" : "Run clock"));
  document.querySelector("#clock-state")?.replaceChildren(document.createTextNode(running ? "Running while visible" : "Paused · manual steps"));
  schedule();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const { action, value } = button.dataset;
  if (action === "play") setRunning(!running);
  else if (action === "step") {
    setRunning(false);
    model.advance(1);
  } else if (action === "reset") {
    setRunning(false);
    model = createModel(id);
  } else model.act(action, value);
  paint();
  announce();
});

document.addEventListener("input", (event) => {
  if (!event.target.matches("input[data-action]")) return;
  model.act(event.target.dataset.action, event.target.value);
  paint();
});

new IntersectionObserver((entries) => {
  visible = entries.at(-1).isIntersecting;
  schedule();
}).observe(stage);
document.addEventListener("visibilitychange", schedule);
reduced.addEventListener("change", () => { if (reduced.matches) setRunning(false); });
paint();
