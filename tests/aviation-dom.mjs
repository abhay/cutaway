import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

export async function check(directory) {
  const require = createRequire(import.meta.url);
  const { JSDOM, VirtualConsole, ResourceLoader } = require(process.env.CUTAWAY_JSDOM ?? "jsdom");
  const results = [];

  function open(html, reduced = false) {
    const errors = [];
    const requests = [];
    const frames = new Map();
    let counter = 0;
    let intersect;
    let media;
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", (error) => errors.push(error.message));

    class Loader extends ResourceLoader {
      fetch(url) {
        requests.push(url);
        return null;
      }
    }

    const dom = new JSDOM(html, {
      url: "https://cutaway.test/demo.html?embed=1",
      runScripts: "dangerously",
      resources: new Loader(),
      virtualConsole,
      pretendToBeVisual: true,
      beforeParse(window) {
        media = new window.EventTarget();
        media.matches = reduced;
        media.media = "(prefers-reduced-motion: reduce)";
        window.matchMedia = () => media;
        window.requestAnimationFrame = (callback) => {
          const id = ++counter;
          frames.set(id, callback);
          return id;
        };
        window.cancelAnimationFrame = (id) => frames.delete(id);
        window.IntersectionObserver = class {
          constructor(callback) { intersect = callback; }
          observe() {}
          disconnect() {}
        };
      },
    });

    try {
      assert.deepEqual(errors, []);
      assert.deepEqual(requests, []);
      assert.equal(dom.window.document.documentElement.dataset.embed, "true");
      const ids = [...dom.window.document.querySelectorAll("[id]")].map((node) => node.id);
      assert.equal(new Set(ids).size, ids.length, "HTML IDs must be unique");
      return { dom, frames, errors, media, intersect };
    } catch (error) {
      dom.window.close();
      throw error;
    }
  }

  const jetHTML = await readFile(join(directory, "jet-engine.html"), "utf8");
  const jet = open(jetHTML);
  try {
    const { dom, frames, errors, media, intersect } = jet;
    const { document, Event } = dom.window;
    const svg = document.querySelector("svg");
    const play = document.querySelector("#jet-animate");
    assert.equal(frames.size, 0, "Jet must start still");

    for (const [label, count] of [["Fan rotor", 1], ["Booster", 3], ["High-pressure compressor", 11], ["High-pressure turbine", 2], ["Low-pressure turbine", 6]]) {
      assert.equal(svg.querySelectorAll(`[role="group"][aria-label^="${label} stage "]`).length, count, `${label} must show the published GE9X rotor-stage count`);
    }
    assert.equal(svg.querySelectorAll('[aria-label^="Fan blade "]').length, 16, "The GE9X has 16 fan blades");

    const stages = document.querySelectorAll("[data-stage-button]");
    const descriptions = new Set();
    for (const button of stages) {
      button.click();
      assert.equal(svg.dataset.stage, button.dataset.stageButton);
      assert(svg.querySelector(`[data-part="${button.dataset.stageButton}"] path`), "Each control selects a drawn component");
      const shaftView = button.dataset.stageButton === "shafts";
      assert.equal(document.querySelector('[data-jet-legend="cool"]').textContent, shaftView ? "Low-pressure shaft" : "Bypass air");
      assert.equal(document.querySelector('[data-jet-legend="warm"]').textContent, shaftView ? "High-pressure shaft" : "Core air & exhaust");
      assert.equal(document.querySelectorAll("[data-stage-button][aria-pressed=true]").length, 1);
      const description = document.querySelector(".readout p").textContent.trim();
      assert(description, "Each component needs an explanation");
      descriptions.add(description);
    }
    assert.equal(descriptions.size, stages.length, "Selecting a component must update its explanation");

    play.click();
    assert.equal(frames.size, 1);
    function frameAt(time) {
      const [[id, callback]] = frames;
      frames.delete(id);
      callback(time);
    }
    frameAt(1000);
    frameAt(1016);
    const offset = Number(svg.querySelector(".flow").getAttribute("stroke-dashoffset"));
    assert(offset < 0, "Flow must advance toward exhaust");

    intersect([{ isIntersecting: false }]);
    assert.equal(frames.size, 0, "Offscreen must stop the loop");
    intersect([{ isIntersecting: false }, { isIntersecting: true }]);
    assert.equal(frames.size, 1, "Newest visibility state resumes requested playback");
    frameAt(60000);
    assert.equal(Number(svg.querySelector(".flow").getAttribute("stroke-dashoffset")), offset, "Returning on screen must not jump ahead");

    play.click();
    assert.equal(frames.size, 0);
    intersect([{ isIntersecting: true }]);
    assert.equal(frames.size, 0, "Paused flow must stay paused");
    play.click();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(frames.size, 0);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(frames.size, 1);

    media.matches = true;
    media.dispatchEvent(new Event("change"));
    assert.equal(frames.size, 0);
    assert.equal(play.disabled, true);
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    assert.equal(play.disabled, false);
    assert.equal(frames.size, 0);

    play.click();
    const flow = document.querySelector("#jet-flow");
    flow.checked = false;
    flow.dispatchEvent(new Event("change"));
    assert.equal(svg.dataset.flow, "false");
    assert.equal(frames.size, 0);
    assert.equal(play.disabled, true);
    flow.checked = true;
    flow.dispatchEvent(new Event("change"));
    assert.equal(play.disabled, false);
    assert.equal(frames.size, 0);
    assert.deepEqual(errors, []);
    results.push("GE9X fan and rotor-stage counts, component selection, airflow, pause/resume, offscreen batching, tab visibility and motion preferences");
  } finally {
    jet.dom.window.close();
  }

  const reducedJet = open(jetHTML, true);
  try {
    assert.equal(reducedJet.dom.window.document.querySelector("#jet-animate").disabled, true);
    assert.equal(reducedJet.frames.size, 0);
    results.push("Jet respects reduced motion on first load");
  } finally {
    reducedJet.dom.window.close();
  }

  const wing = open(await readFile(join(directory, "wing.html"), "utf8"));
  try {
    const { dom, frames, errors } = wing;
    const { document, Event } = dom.window;
    const shape = document.querySelector("#wing-shape");
    const flap = document.querySelector("#wing-flap");
    const slat = document.querySelector("#wing-slat");
    const skin = document.querySelector("#wing-skin");
    const silhouettes = new Set();

    for (const type of ["rectangular", "tapered", "swept"]) {
      shape.value = type;
      flap.value = "0";
      slat.checked = false;
      shape.dispatchEvent(new Event("change"));
      silhouettes.add(document.querySelector("#wing-mechanism").innerHTML);
      for (const angle of [0, 17, 35]) {
        for (const extended of [false, true]) {
          flap.value = String(angle);
          flap.dispatchEvent(new Event("input"));
          slat.checked = extended;
          slat.dispatchEvent(new Event("change"));
          assert.equal(document.querySelector("#wing-degrees").textContent, `${angle}°`);
          assert(document.querySelector(".readout h2").textContent.includes(`flap ${angle}°`));
          assert(document.querySelector(".readout h2").textContent.endsWith(extended ? "slat extended" : "slat retracted"));
          const xml = new dom.window.DOMParser().parseFromString(document.querySelector("svg").outerHTML, "image/svg+xml");
          assert.equal(xml.querySelector("parsererror"), null, "Every interactive pose must remain valid SVG");
        }
      }
    }

    assert.equal(silhouettes.size, 3, "Planform control must change physical geometry");
    const cutaway = document.querySelector("#wing-mechanism").innerHTML;
    skin.checked = true;
    skin.dispatchEvent(new Event("change"));
    assert.notEqual(document.querySelector("#wing-mechanism").innerHTML, cutaway);
    assert(document.querySelector("#wing-desc").textContent.includes("closed upper skin"));
    document.querySelector("#wing-reset").click();
    assert.equal(shape.value, "swept");
    assert.equal(flap.value, "0");
    assert.equal(slat.checked, false);
    assert.equal(skin.checked, false);
    assert.equal(frames.size, 0);
    assert.deepEqual(errors, []);
    results.push("Wing planforms, flap boundaries and intermediate angle, slats, skin, SVG validity, readouts and reset");
  } finally {
    wing.dom.window.close();
  }

  return {
    passed: true,
    checks: results,
    limitations: ["DOM checks don't cover browser layout, native keyboard handling, or SVG filter rendering."],
  };
}
