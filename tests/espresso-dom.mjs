import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);

export async function check(directory) {
  const { JSDOM, VirtualConsole, ResourceLoader } = require(process.env.CUTAWAY_JSDOM ?? "jsdom");
  const html = await readFile(join(directory, "espresso.html"), "utf8");
  const errors = [];
  const requests = [];
  const queue = new Map();
  let serial = 0;
  let now = 100;
  let observe;
  let changeMotion;
  let hidden = false;
  const motion = { matches: false, addEventListener: (_, callback) => { changeMotion = callback; } };
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error.message));
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "file:///espresso.html?embed=1",
    virtualConsole,
    resources: new class extends ResourceLoader {
      fetch(url) { requests.push(url); return null; }
    }(),
    beforeParse(window) {
      window.matchMedia = () => motion;
      window.requestAnimationFrame = (callback) => { queue.set(++serial, callback); return serial; };
      window.cancelAnimationFrame = (id) => queue.delete(id);
      window.IntersectionObserver = class {
        constructor(callback) { observe = callback; }
        observe() {}
        disconnect() {}
      };
      Object.defineProperty(window.document, "hidden", { get: () => hidden });
    },
  });

  try {
    const document = dom.window.document;
    const query = (selector) => document.querySelector(selector);
    const text = (selector) => query(selector).textContent;
    const opacity = (selector) => Number(query(selector).getAttribute("opacity"));
    const frame = () => {
      now += 50;
      const callbacks = [...queue.values()];
      queue.clear();
      callbacks.forEach((callback) => callback(now));
    };
    const stage = (name) => {
      const select = query("select[data-stage]");
      select.value = name;
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    };

    assert.deepEqual(errors, [], "The generated script initializes successfully");
    assert.equal(query("svg").dataset.stage, "cold");
    assert.equal(queue.size, 0, "The teaching cycle starts paused");
    assert.equal(document.documentElement.classList.contains("embed"), true);
    assert.equal(text("[data-pump-value]"), "Off");
    assert.equal(text("[data-heater-value]"), "Off");
    const levelAtStart = query("[data-reservoir-water]").innerHTML;

    stage("Heating");
    assert.equal(text("[data-pump-value]"), "Off", "The pump stays off while heating");
    assert.equal(text("[data-heater-value]"), "On");
    assert(opacity("[data-heater-glow]") > 0, "The heating element is visibly active");
    assert.equal(opacity("[data-coffee-stream]"), 0);

    stage("Ready");
    assert.equal(text("[data-heater-value]"), "Holding");
    assert.equal(text("[data-pump-value]"), "Off");

    stage("Brewing");
    assert.equal(text("[data-valve-value]"), "To group");
    assert.equal(text("[data-pump-value]"), "On");
    assert(opacity("[data-coffee-stream]") > 0);
    assert.equal(opacity('[data-flow="drain"].flow-dashes'), 0, "The drain stays closed during brewing");
    query("[data-play]").click();
    assert.equal(queue.size, 1);
    for (let index = 0; index < 102; index++) frame();
    assert(Number(query("[data-progress]").value) > 500);
    assert.notEqual(query("[data-reservoir-water]").innerHTML, levelAtStart, "Drawing water lowers the reservoir level");
    assert(opacity("[data-cup-coffee]") > 0, "Espresso appears in the cup");

    query("[data-play]").click();
    assert.equal(queue.size, 0, "Pausing cancels the animation callback");
    const progress = query("[data-progress]").value;
    frame();
    assert.equal(query("[data-progress]").value, progress);
    query("[data-play]").click();
    observe([{ isIntersecting: true }, { isIntersecting: false }]);
    assert.equal(queue.size, 0, "The newest intersection entry stops offscreen work");
    observe([{ isIntersecting: false }, { isIntersecting: true }]);
    assert.equal(queue.size, 1, "Visible playback resumes with a single callback");
    hidden = true;
    document.dispatchEvent(new dom.window.Event("visibilitychange"));
    assert.equal(queue.size, 0);
    hidden = false;
    document.dispatchEvent(new dom.window.Event("visibilitychange"));
    assert.equal(queue.size, 1);

    for (let index = 0; index < 200; index++) frame();
    assert.equal(queue.size, 0, "Completing the cycle stops the clock");
    assert.equal(query("[data-progress]").value, "1000");
    assert.equal(query("svg").dataset.stage, "finished");
    assert.equal(text("[data-pump-value]"), "Off");
    assert.equal(opacity("[data-coffee-stream]"), 0);
    assert.equal(opacity("[data-cup-coffee]"), 1);

    stage("Finished");
    assert(opacity('[data-flow="drain"].flow-dashes') > 0);
    assert(opacity('[data-flow="group"].flow-dashes') > 0);
    assert.equal(opacity('[data-flow="hot"].flow-dashes'), 0, "The valve isolates the boiler during depressurization");
    assert(Number(query('[data-flow="group"].flow-dashes').getAttribute("stroke-dashoffset")) > 0, "Group water reverses toward the valve and drain");

    query("[data-reset]").click();
    assert.equal(opacity("[data-cup-coffee]"), 0);
    assert.equal(query("svg").dataset.stage, "cold");
    assert.equal(queue.size, 0);
    query("[data-play]").click();
    motion.matches = true;
    changeMotion();
    assert.equal(queue.size, 0, "A reduced-motion change cancels active playback");
    assert.equal(query("[data-play]").hidden, true);
    query("[data-next]").click();
    assert.equal(query("svg").dataset.stage, "heating", "Stepping remains available under reduced motion");
    assert.equal(queue.size, 0);
    assert.equal(query('[data-flow="supply"].flow-dashes').getAttribute("stroke-dashoffset"), "0");

    query('[data-inspect="pump"]').click();
    assert.equal(query('[data-inspect="pump"]').getAttribute("aria-pressed"), "true");
    assert.match(text("[data-part-description]"), /resistance/i);
    assert.equal(query('[data-component="pump"]').dataset.selected, "true");
    query("[data-progress]").value = "1000";
    query("[data-progress]").dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    assert.equal(query("svg").dataset.stage, "finished");
    assert.equal(queue.size, 0, "Playback stays paused while scrubbing");

    assert.deepEqual(errors, [], "No JavaScript runtime errors");
    assert.deepEqual(requests, [], "No external resource requests");
    assert.equal(document.querySelectorAll("[src],link[href]").length, 0);
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    assert.equal(new Set(ids).size, ids.length, "HTML and SVG identifiers are unique");

    return {
      id: "espresso",
      result: "passed",
      checks: ["Heating and brewing states", "Three-way valve and drain routing", "Reservoir and cup updates", "Playback, pause, completion, reset and scrub", "Component inspection", "Visibility and reduced-motion lifecycle", "Offline operation and unique identifiers"],
      limitations: ["JSDOM doesn't check browser layout, native keyboard defaults, SVG rendering, or ChatGPT previews"],
    };
  } finally {
    dom.window.close();
  }
}
