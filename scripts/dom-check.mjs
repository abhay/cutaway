import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { palettes } from "../skills/cutaway/glow/palettes.mjs";

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole, ResourceLoader } = require(process.env.CUTAWAY_JSDOM ?? "jsdom");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = resolve(process.argv[2] ?? join(root, "dist/examples"));
const output = join(root, "dist/verification");
const reports = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (const theme of ["light", "dark"]) for (const id of ["token-bucket", "lru-cache", "connection-pool", "circuit-breaker"]) {
  const errors = [], requests = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => { if (error.type !== "css parsing") errors.push(error.message); });
  let observe, changeMotion;
  const motion = { matches: true, addEventListener: (_, callback) => { changeMotion = callback; } };
  const html = readFileSync(join(artifacts, `${id}${theme === "light" ? "-light" : ""}.html`), "utf8");
  const dom = new JSDOM(html, {
    virtualConsole, runScripts: "dangerously", pretendToBeVisual: true,
    resources: new class extends ResourceLoader { fetch(url) { requests.push(url); return null; } }(),
    beforeParse(window) {
      window.matchMedia = () => motion;
      window.IntersectionObserver = class { constructor(callback) { observe = callback; } observe() {} disconnect() {} };
    },
  });
  try {
    const doc = dom.window.document;
    const click = (action, value) => {
      const element = doc.querySelector(`[data-action="${action}"]${value === undefined ? "" : `[data-value="${value}"]`}`);
      assert(element && !element.disabled, `Enabled ${action} control`);
      element.click();
    };
    const text = (name) => doc.getElementById(name).textContent;
    const active = (name) => doc.getElementById(name).getAttribute("data-active");
    const choose = (name, value) => {
      const select = doc.querySelector(`select[name="${name}"]`);
      select.value = value;
      assert.equal(select.value, value, `${name} option exists`);
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    };
    if (id === "token-bucket") {
      click("burst"); assert.equal(active("gate"), "false");
      click("step"); assert.equal(active("gate"), "true"); assert.equal(text("metric-0"), "2.00");
    } else if (id === "lru-cache") {
      for (const key of ["A", "B", "C", "A", "D"]) click("request", key);
      assert.equal(text("cache-key-0"), "D"); assert.equal(active("cache-part-0"), "true"); assert.equal(active("cache-part-1"), "false");
    } else if (id === "connection-pool") {
      for (let i = 0; i < 4; i++) click("request");
      assert.equal(active("tool-0"), "true"); assert.equal(active("waiting-0"), "false");
      click("release", 0); assert.match(text("slot-0"), /Job 4/);
      click("release", 0); assert.equal(active("tool-0"), "false");
    } else {
      click("service"); for (let i = 0; i < 3; i++) click("request");
      assert.equal(active("contact"), "false"); assert.equal(active("failure-2"), "true");
      for (let i = 0; i < 5; i++) click("step");
      assert.equal(active("contact"), "false");
      click("request"); assert.equal(active("contact"), "true");
      click("resolve"); assert.equal(active("contact"), "false");
    }
    const metrics = doc.querySelector(".metrics").textContent;
    const lighting = [...doc.querySelectorAll(".stage [data-active]")].map((element) => element.getAttribute("data-active"));
    const svg = doc.querySelector(".stage svg");
    for (const palette of palettes) for (const selectedTheme of ["light", "dark"]) {
      choose("palette", palette.id); choose("theme", selectedTheme);
      for (const presentation of ["technical", "glow"]) {
        choose("presentation", presentation);
        assert.equal(svg.dataset.palette, palette.id);
        assert.equal(svg.dataset.theme, selectedTheme);
        assert.equal(svg.dataset.presentation, presentation);
        assert.equal(svg.style.getPropertyValue("--cutaway-accent"), selectedTheme === "light" ? palette.lightAccent : palette.accent);
        assert.equal(doc.body.style.getPropertyValue("--cutaway-accent"), svg.style.getPropertyValue("--cutaway-accent"));
        assert.equal(doc.querySelector(".metrics").textContent, metrics, "Appearance preserves model readouts");
        assert.deepEqual([...doc.querySelectorAll(".stage [data-active]")].map((element) => element.getAttribute("data-active")), lighting, "Appearance preserves active state");
      }
    }
    click("reset");
    if (id === "token-bucket") {
      click("burst"); motion.matches = false; click("play");
      await delay(150); assert(Number(text("metric-0")) > 0);
      observe([{ isIntersecting: false }]); const offscreen = text("metric-0");
      await delay(80); assert.equal(text("metric-0"), offscreen);
      observe([{ isIntersecting: true }]); await delay(100); assert(Number(text("metric-0")) > Number(offscreen));
      motion.matches = true; changeMotion(); const paused = text("metric-0");
      await delay(80); assert.equal(text("metric-0"), paused);
      assert.equal(doc.querySelector('[data-action="play"]').textContent, "Run clock");
    }
    assert.deepEqual(errors, [], "No JavaScript runtime errors");
    assert.deepEqual(requests, [], "No external resource requests");
    assert.equal(doc.querySelectorAll("[src], link[href]").length, 0);
    reports.push({ id, initialTheme: theme, result: "passed" });
  } finally {
    dom.window.close();
  }
}
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "dom-report.json"), JSON.stringify({
  checkedAt: new Date().toISOString(), reports,
  checks: ["Generated HTML controls and drawing updates", "Every palette in both themes and both styles", "Appearance changes preserve simulation state", "Offscreen and reduced-motion callback lifecycle", "No external resource requests"],
  limitations: ["JSDOM has no layout or SVG filter renderer", "The harness supplies media and intersection APIs", "These checks don't cover native keyboard defaults, the accessibility tree, or ChatGPT previews"],
}, null, 2) + "\n");
console.log("HTML controls, appearance settings, model state, and animation lifecycle checks passed in JSDOM.");
