import { expect, test } from "bun:test";
import { appearance, palettes } from "../skills/cutaway/glow/palettes.mjs";
import { glowCss, glowDefs } from "../skills/cutaway/glow/svg.mjs";
import { drawing } from "../skills/cutaway/examples/drawings.mjs";
import { createModel } from "../skills/cutaway/examples/models.mjs";

function contrast(a, b) {
  const luminance = (hex) => {
    const rgb = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
    const [r, g, blue] = rgb.map((channel) => channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
    return r * 0.2126 + g * 0.7152 + blue * 0.0722;
  };
  const levels = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (levels[1] + 0.05) / (levels[0] + 0.05);
}

test("palette UI text and buttons stay readable against both page surfaces", () => {
  for (const palette of palettes) for (const theme of ["light", "dark"]) {
    const { variables } = appearance({ palette: palette.id, theme });
    const ink = variables["--accent"];
    for (const background of theme === "light" ? ["#f5f3ed", "#fcfbf7"] : ["#171b1a", "#202523"]) {
      expect(contrast(ink, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(ink, variables["--button-text"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(variables["--cutaway-accent"], variables["--anatomy-paper"])).toBeGreaterThanOrEqual(3);
  }
});

test("appearance and filter APIs reject untrusted markup and invalid bounds", () => {
  for (const key of ["palette", "theme", "presentation"]) expect(() => appearance({ [key]: '\"><img src=x onerror=alert(1)>' })).toThrow();
  expect(() => glowCss('x\"]{}')).toThrow();
  expect(() => glowDefs('x" onload="alert(1)', { width: 820, height: 500 })).toThrow();
  for (const width of [0, -1, NaN, Infinity]) expect(() => glowDefs("safe", { width, height: 500 })).toThrow();
});

function active(id, model, part) {
  const svg = drawing(id, "dark", model.state);
  const tag = svg.match(new RegExp(`<g id="${part}"[^>]*>`))?.[0];
  expect(tag).toBeDefined();
  return /data-active="true"/.test(tag);
}

test("available tokens and a usable gate light independently of partial refill", () => {
  const id = "token-bucket", model = createModel(id);
  model.act("burst");
  expect(active(id, model, "gate")).toBe(false);
  expect(active(id, model, "token-0")).toBe(false);
  model.advance(0.25);
  expect(active(id, model, "token-0")).toBe(true);
  expect(active(id, model, "gate")).toBe(false);
  model.advance(0.25);
  expect(active(id, model, "gate")).toBe(true);
  model.act("request");
  expect(active(id, model, "gate")).toBe(false);
});

test("cache glow follows the most recent item without lighting other cached items", () => {
  const id = "lru-cache", model = createModel(id);
  expect(active(id, model, "cache-part-0")).toBe(false);
  for (const key of ["A", "B", "A"]) model.act("request", key);
  expect(active(id, model, "cache-part-0")).toBe(true);
  expect(active(id, model, "cache-part-1")).toBe(false);
  expect(drawing(id, "dark", model.state)).toMatch(/id="cache-key-0"[^>]*>A<\/text>/);
});

test("pool glow marks working tools while queued and returned tools remain unlit", () => {
  const id = "connection-pool", model = createModel(id);
  expect(active(id, model, "tool-0")).toBe(false);
  for (let i = 0; i < 4; i++) model.act("request");
  expect(active(id, model, "tool-0")).toBe(true);
  expect(active(id, model, "waiting-0")).toBe(false);
  model.act("release", 0);
  expect(active(id, model, "tool-0")).toBe(true);
  model.act("release", 0);
  expect(active(id, model, "tool-0")).toBe(false);
  expect(active(id, model, "job-0")).toBe(false);
});

test("relay glow distinguishes an open path, a trial, and failure indicators", () => {
  const id = "circuit-breaker", model = createModel(id);
  expect(active(id, model, "contact")).toBe(true);
  model.act("service");
  for (let i = 0; i < 3; i++) model.act("request");
  expect(active(id, model, "contact")).toBe(false);
  expect(active(id, model, "failure-2")).toBe(true);
  model.advance(5);
  expect(active(id, model, "contact")).toBe(false);
  model.act("request");
  expect(active(id, model, "contact")).toBe(true);
  model.act("resolve");
  expect(active(id, model, "contact")).toBe(false);
});
