import { applyState } from "./controls.mjs";
import { watchLinks } from "./links.mjs";

const initial = document.querySelector("#cutaway-initial");
const settings = initial && JSON.parse(initial.textContent);
if (settings) {
  const { model, state } = settings;
  applyState(model, state);
}
watchLinks(document.documentElement.dataset.cutawayModel);
