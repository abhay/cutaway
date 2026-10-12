import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

export async function check(directory) {
  const require = createRequire(import.meta.url);
  const { JSDOM, VirtualConsole, ResourceLoader } = require(process.env.CUTAWAY_JSDOM ?? "jsdom");
  const kind = "boxer";
  const errors = [];
  const network = [];
  const callbacks = new Map();
  const motionListeners = [];
  let next = 1;
  let hidden = false;
  let observer;
  const motion = { matches: false, addEventListener: (_, callback) => motionListeners.push(callback) };
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error.message));
  class NoNetwork extends ResourceLoader {
    fetch(url) {
      network.push(url);
      return null;
    }
  }
  const dom = new JSDOM(await readFile(join(directory, `${kind}.html`), "utf8"), {
    url: `https://example.test/${kind}.html?embed=1`,
    runScripts: "dangerously",
    resources: new NoNetwork(),
    virtualConsole,
    beforeParse(window) {
      window.matchMedia = () => motion;
      window.requestAnimationFrame = (callback) => {
        const id = next++;
        callbacks.set(id, callback);
        return id;
      };
      window.cancelAnimationFrame = (id) => callbacks.delete(id);
      window.IntersectionObserver = class {
        constructor(callback) { observer = callback; }
        observe() {}
      };
      Object.defineProperty(window.document, "hidden", { get: () => hidden });
    },
  });
  try {
    const { window } = dom;
    const { document } = window;
    const get = (id) => document.getElementById(id);
    const tick = (now) => {
      const entries = [...callbacks.entries()];
      callbacks.clear();
      entries.forEach(([, callback]) => callback(now));
    };
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    assert.equal(document.documentElement.dataset.embed, "true");
    assert.equal(callbacks.size, 0);
    assert.equal(get("run").textContent, "Play");
    document.querySelector('[data-dead-center="0"]').click();
    assert.match(get("phase-name").textContent, /outer dead center$/);
    assert.equal(get("travel-value").textContent, "0%");
    document.querySelector('[data-dead-center="180"]').click();
    assert.match(get("phase-name").textContent, /inner dead center$/);
    assert.equal(get("travel-value").textContent, "100%");
    get("selection").value = "1";
    get("selection").dispatchEvent(new window.Event("change"));
    document.querySelector('[data-dead-center="0"]').click();
    assert.equal(get("angle-value").textContent, "180°");
    assert.equal(get("travel-value").textContent, "0%");
    get("reset").click();
    const initial = Number(get("crank-angle").value);
    get("step").click();
    assert.equal(Number(get("crank-angle").value), initial + 45);
    get("run").click();
    assert.equal(callbacks.size, 1);
    tick(100);
    tick(150);
    assert.ok(Number(get("crank-angle").value) > initial + 45);
    hidden = true;
    document.dispatchEvent(new window.Event("visibilitychange"));
    assert.equal(callbacks.size, 0);
    hidden = false;
    document.dispatchEvent(new window.Event("visibilitychange"));
    assert.equal(callbacks.size, 1);
    observer([{ isIntersecting: false }]);
    assert.equal(callbacks.size, 0);
    observer([{ isIntersecting: false }, { isIntersecting: true }]);
    assert.equal(callbacks.size, 1);
    document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));
    assert.equal(callbacks.size, 0);
    assert.equal(get("run").textContent, "Play");
    get("run").click();
    assert.equal(callbacks.size, 1);
    motion.matches = true;
    motionListeners.forEach((callback) => callback());
    assert.equal(callbacks.size, 0);
    assert.equal(get("run").disabled, true);
    assert.equal(get("motion-note").hidden, false);
    const beforeStep = Number(get("crank-angle").value);
    get("step").click();
    assert.notEqual(Number(get("crank-angle").value), beforeStep);
    assert.equal(callbacks.size, 0);
    const svg = new window.DOMParser().parseFromString(await readFile(join(directory, `${kind}.svg`), "utf8"), "image/svg+xml");
    assert.equal(svg.querySelector("parsererror"), null);
    assert.match(svg.querySelector("metadata").textContent, /MIT License/);
    const ids = [...svg.querySelectorAll("[id]")].map((element) => element.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    return { kind, controls: "passed", lifecycle: "passed", reducedMotion: "passed", standaloneSvg: "passed", networkRequests: network.length, consoleErrors: errors.length };
  } finally {
    dom.window.close();
  }
}
