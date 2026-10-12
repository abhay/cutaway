// Palettes adapted from iso-glow by April Zhu, based on Tolga Cohce's iso-figure (MIT; see LICENSE).
const families = {
  Ember: [
    ["ember", "Ember", "#ff7a1a", "#ffb070"],
    ["cyan", "Cyan", "#22d3ee", "#9beefa"],
    ["lime", "Lime", "#a3e635", "#d6f79f"],
    ["violet", "Violet", "#a78bfa", "#d6caff"],
    ["rose", "Rose", "#fb7185", "#fdb8c2"],
    ["ice", "Ice", "#dfe9ef", "#ffffff", "#1f2937", "#3b4656"],
  ],
  City: [
    ["sodium", "Sodium", "#ff9a2e", "#ffc77a"],
    ["tungsten", "Tungsten", "#ffd166", "#ffe7a8"],
    ["neon", "Neon", "#ff4fa3", "#ff9fcb"],
    ["signal", "Signal", "#3ee8a0", "#a3f5cf"],
    ["dusk", "Dusk", "#6f9dff", "#b5ccff"],
    ["moon", "Moon", "#dfe7f5", "#ffffff", "#273246", "#3d4a61"],
  ],
};

const channels = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const mix = (a, b, amount) => "#" + channels(a).map((value, index) => Math.round(value * amount + channels(b)[index] * (1 - amount)).toString(16).padStart(2, "0")).join("");
const luminance = (hex) => channels(hex).map((value) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
function readable(color, backgrounds, target, minimum) {
  let result = color;
  for (let step = 1; Math.min(...backgrounds.map((background) => contrast(result, background))) < minimum && step <= 20; step++) result = mix(color, target, 1 - step / 20);
  return result;
}

export const palettes = Object.freeze(Object.entries(families).flatMap(([family, entries]) => entries.map(([id, name, accent, highlight, lightAccent = accent, lightHighlight = highlight]) => Object.freeze({
  id, name, family, accent, highlight,
  lightAccent: readable(lightAccent, ["#fcfbf7"], "#000000", 3),
  lightHighlight: readable(lightHighlight, ["#fcfbf7"], "#000000", 3),
}))));

export function appearance({ palette = "ember", theme = "light", presentation = "glow" } = {}) {
  const selected = palettes.find((item) => item.id === palette);
  if (!selected) throw new Error(`Unknown palette: ${palette}`);
  if (!["light", "dark"].includes(theme)) throw new Error(`Unknown theme: ${theme}`);
  if (!["technical", "glow"].includes(presentation)) throw new Error(`Unknown presentation: ${presentation}`);
  const accent = theme === "light" ? selected.lightAccent : selected.accent;
  const highlight = theme === "light" ? selected.lightHighlight : selected.highlight;
  const page = theme === "light" ? "#f5f3ed" : "#171b1a";
  const paper = theme === "light" ? "#fcfbf7" : "#202523";
  const ink = readable(accent, [page, paper], theme === "light" ? "#000000" : "#ffffff", 4.5);
  return {
    palette, theme, presentation,
    variables: {
      "--cutaway-accent": accent,
      "--cutaway-highlight": highlight,
      "--accent": ink,
      "--button-text": contrast(ink, "#ffffff") >= contrast(ink, "#171b1a") ? "#ffffff" : "#171b1a",
      "--anatomy-paper": paper,
      "--anatomy-lit": accent,
      "--anatomy-lit-top": mix(accent, paper, theme === "light" ? 0.24 : 0.45),
      "--anatomy-lit-shade": mix(accent, paper, theme === "light" ? 0.4 : 0.3),
    },
  };
}

export function appearanceStyle(settings) {
  return Object.entries(appearance(settings).variables).map(([key, value]) => `${key}:${value}`).join(";");
}
