import { normalizeState } from "./models.mjs";

export function applyState(id, input) {
  const state = normalizeState(id, input);
  const set = (selector, value, event = "change") => {
    const control = document.querySelector(selector);
    if (typeof value === "boolean") control.checked = value;
    else control.value = String(value);
    control.dispatchEvent(new Event(event, { bubbles: true }));
  };
  if (id === "jet-engine") {
    if (document.querySelector("#jet-animate").getAttribute("aria-pressed") === "true") document.querySelector("#jet-animate").click();
    document.querySelector(`[data-stage-button="${state.component}"]`).click();
    set("#jet-flow", state.flow);
  } else if (id === "wing") {
    set("#wing-shape", state.shape);
    set("#wing-flap", state.flap, "input");
    set("#wing-slat", state.slat);
    set("#wing-skin", state.skin);
  } else if (id === "espresso") {
    set("[data-progress]", state.progress, "input");
    document.querySelector(`[data-inspect="${state.component}"]`).click();
  } else {
    set("#selection", state.pair - 1);
    set("#crank-angle", state.angle, "input");
  }
}

export function readState(id) {
  const value = (selector) => document.querySelector(selector).value;
  const checked = (selector) => document.querySelector(selector).checked;
  if (id === "jet-engine") return { component: document.querySelector("svg").dataset.stage, flow: checked("#jet-flow") };
  if (id === "wing") return { shape: value("#wing-shape"), flap: Number(value("#wing-flap")), slat: checked("#wing-slat"), skin: checked("#wing-skin") };
  if (id === "espresso") return {
    stage: value("[data-stage]"), progress: Number(value("[data-progress]")),
    component: document.querySelector('[data-inspect][aria-pressed="true"]')?.dataset.inspect ?? "pump",
  };
  return { angle: Math.round(Number(value("#crank-angle"))), pair: Number(value("#selection")) + 1 };
}
