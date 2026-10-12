import { isServiceOrigin, origin, viewLinks } from "./models.mjs";
import { readState } from "./controls.mjs";

let serviceOrigin = isServiceOrigin(location.origin) ? location.origin : origin;

export function useServiceOrigin(value) {
  if (!isServiceOrigin(value)) throw new Error("Invalid service origin");
  serviceOrigin = value;
}

export function updateLinks(model) {
  const links = viewLinks(model, readState(model), serviceOrigin);
  for (const link of document.querySelectorAll("[data-cutaway-link]")) link.href = links[link.dataset.cutawayLink];
}

export function watchLinks(model) {
  for (const event of ["input", "change", "click"]) document.addEventListener(event, () => updateLinks(model));
  updateLinks(model);
}
