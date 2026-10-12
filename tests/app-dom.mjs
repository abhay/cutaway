import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { exportView } from "../server/exports.mjs";

export async function check(directory) {
  const require = createRequire(import.meta.url);
  const { JSDOM, VirtualConsole, ResourceLoader } = require(process.env.CUTAWAY_JSDOM ?? "jsdom");
  const env = { ASSETS: { async fetch(request) {
    try { return new Response(await readFile(new URL(new URL(request.url).pathname.slice(1), directory))); }
    catch { return new Response(null, { status: 404 }); }
  } } };
  const cases = [
    { id: "jet-engine", state: { component: "compressor", flow: false }, assert(document) {
      assert.equal(document.querySelector("svg").dataset.stage, "compressor");
      assert.equal(document.querySelector("svg").dataset.flow, "false");
    } },
    { id: "wing", state: { shape: "rectangular", flap: 25, slat: true, skin: true }, assert(document) {
      assert.match(document.querySelector("#wing-desc").textContent, /25.degree/);
      assert.match(document.querySelector("#wing-desc").textContent, /extended/);
    } },
    { id: "espresso", state: { stage: "Brewing", component: "pump" }, assert(document) {
      assert.equal(document.querySelector("[data-coffee-stream]").getAttribute("opacity"), "1");
      assert.equal(document.querySelector("[data-heater-glow]").getAttribute("opacity"), "0");
    } },
    { id: "boxer", state: { angle: 180, pair: 2 }, assert(document) {
      assert(document.querySelector("#engine-geometry path"));
      const heading = document.querySelector("#phase-name");
      if (heading) assert.match(heading.textContent, /Pair 2.*outer dead center/i);
      else assert.match(document.querySelector("#engine-description").textContent, /180 degrees.*pair 2/);
    } },
  ];

  function open(html, widget = false) {
    const errors = [];
    const requests = [];
    const messages = [];
    const host = { postMessage: (message) => messages.push(message) };
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", (error) => errors.push(error.message));
    class Offline extends ResourceLoader { fetch(url) { requests.push(url); return null; } }
    const dom = new JSDOM(html, {
      url: "https://cutaway.abhay.gg/", runScripts: "dangerously", resources: new Offline(), virtualConsole, pretendToBeVisual: true,
      beforeParse(window) {
        window.matchMedia = () => ({ matches: true, addEventListener() {} });
        if (widget) Object.defineProperty(window, "parent", { value: host });
      },
    });
    const deliver = (message, source = host, origin = "https://chatgpt.com") => dom.window.dispatchEvent(new dom.window.MessageEvent("message", { data: { jsonrpc: "2.0", ...message }, source, origin }));
    return { dom, errors, requests, messages, host, deliver, close() {
      dom.window.dispatchEvent(new dom.window.Event("pagehide"));
      dom.window.close();
      assert.deepEqual(errors, [], "Generated view must run without JavaScript errors");
      assert.deepEqual(requests, [], "Views must render without network requests");
    } };
  }

  for (const item of cases) {
    const html = await exportView(env, item.id, item.state, "html");
    const standalone = open(html);
    try {
      item.assert(standalone.dom.window.document);
      const link = standalone.dom.window.document.querySelector('[data-cutaway-link="svg"]');
      const settings = JSON.parse(new URL(link.href).searchParams.get("state"));
      const svg = await exportView(env, item.id, settings, "svg");
      const xml = new JSDOM(svg, { contentType: "image/svg+xml" });
      try {
        item.assert(xml.window.document);
        assert.match(xml.window.document.querySelector("metadata").textContent, /Copyright/);
        const geometry = item.id === "wing" ? "#wing-mechanism" : item.id === "boxer" ? "#engine-geometry" : null;
        if (geometry) {
          const paths = (document) => [...document.querySelectorAll(`${geometry} path`)].map((path) => path.getAttribute("d"));
          assert.deepEqual(paths(xml.window.document), paths(standalone.dom.window.document), "SVG export must preserve the geometry shown by the controls");
        }
      } finally { xml.window.close(); }
    } finally { standalone.close(); }

    const widget = open(await readFile(new URL(`app/${item.id}-widget.html`, directory), "utf8"), true);
    try {
      const { document } = widget.dom.window;
      assert.equal(document.querySelector("main").hidden, true);
      const initialize = widget.messages.find(({ method }) => method === "ui/initialize");
      assert.equal(initialize.params.protocolVersion, "2026-01-26");
      widget.deliver({ id: initialize.id, result: { hostCapabilities: {} } });
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert(widget.messages.some(({ method }) => method === "ui/notifications/initialized"));
      const preview = "https://mcp-preview.cutaway-abhay.pages.dev";
      const result = { method: "ui/notifications/tool-result", params: { structuredContent: { model: item.id, state: item.state, links: { view: `${preview}/view/${item.id}` } } } };
      widget.deliver(result, {});
      assert.equal(document.querySelector("main").hidden, true, "Messages from other windows must be ignored");
      widget.deliver(result, widget.host, "https://unrelated.example");
      assert.equal(document.querySelector("main").hidden, true, "The initialized host origin must remain fixed");
      widget.deliver(result);
      assert.equal(document.querySelector("main").hidden, false);
      item.assert(document);
      assert.equal(new URL(document.querySelector('[data-cutaway-link="html"]').href).origin, preview, "Preview downloads must stay on the preview service");
      const button = document.querySelector("#cutaway-discuss");
      button.click();
      const message = widget.messages.find(({ method }) => method === "ui/message");
      assert.match(message.params.content[0].text, /Explain this/);
      assert.equal(message.params.role, "user");
      widget.deliver({ id: message.id, error: { code: -32601, message: "Unavailable" } });
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(button.disabled, false, "A failed host action must remain retryable");
      assert.match(document.querySelector("#cutaway-status").textContent, /couldn’t be sent/);
      widget.deliver({ method: "ui/notifications/tool-result", params: { structuredContent: { model: item.id, state: { unexpected: "<script>" } } } });
      assert.match(document.querySelector("#cutaway-status").textContent, /weren’t recognized/);
      item.assert(document);
    } finally { widget.close(); }
  }

  await assert.rejects(() => exportView(env, "wing", { flap: 36 }, "svg"), /Invalid flap/);
  await assert.rejects(() => exportView(env, "espresso", { component: "<script>" }, "html"), /Invalid component/);
}
