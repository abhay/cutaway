import { appearance } from "./palettes.mjs";

export function bindAppearance(root, figure, controls) {
  function update() {
    const settings = appearance(Object.fromEntries([...controls.querySelectorAll("select[name]")].map((select) => [select.name, select.value])));
    for (const element of [root, figure]) {
      for (const key of ["theme", "palette", "presentation"]) element.dataset[key] = settings[key];
      for (const [key, value] of Object.entries(settings.variables)) element.style.setProperty(key, value);
    }
  }
  controls.addEventListener("change", update);
  update();
  return () => controls.removeEventListener("change", update);
}
