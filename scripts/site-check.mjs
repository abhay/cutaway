import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { filesBelow } from "./files.mjs";

const require = createRequire(import.meta.url);
const { JSDOM, ResourceLoader, VirtualConsole } = require(process.env.CUTAWAY_JSDOM ?? "jsdom");
const root = resolve(import.meta.dir, "..");
const output = join(root, "dist/site");
const html = readFileSync(join(output, "index.html"), "utf8");
const listing = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8")).extensions["com.openai"].interface;
function checkLinks(document, baseURL) {
  for (const element of document.querySelectorAll("[href], [src]")) {
    const target = element.getAttribute("href") ?? element.getAttribute("src");
    const url = new URL(target, baseURL);
    if (url.origin !== new URL(baseURL).origin) continue;
    const path = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
    assert(existsSync(join(output, path)), `Published local target exists: ${target}`);
    if (url.hash && url.pathname === new URL(baseURL).pathname) assert(document.getElementById(url.hash.slice(1)), `Anchor exists: ${target}`);
  }
}
for (const field of ["supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
  const url = new URL(listing[field]);
  assert.equal(url.origin, new URL(listing.websiteURL).origin, `${field} uses the Cutaway website`);
  const path = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
  const page = new JSDOM(readFileSync(join(output, path), "utf8"), { url: url.href });
  try {
    assert(page.window.document.querySelector("main h1"), `${field} opens a complete page`);
    checkLinks(page.window.document, url.href);
  } finally {
    page.window.close();
  }
}
const requests = [], errors = [];
const console = new VirtualConsole();
console.on("jsdomError", (error) => errors.push(error.message));
let copied = "";
const dom = new JSDOM(html, {
  url: "https://cutaway.abhay.gg/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: console,
  resources: new class extends ResourceLoader {
    fetch(url) {
      requests.push(url);
      const resource = new URL(url);
      assert.equal(resource.origin, "https://cutaway.abhay.gg", "Website loads only its own assets");
      if (resource.pathname.endsWith(".html")) return null;
      return Promise.resolve(readFileSync(join(output, resource.pathname)));
    }
  }(),
  beforeParse(window) {
    window.navigator.clipboard = { writeText: async (value) => { copied = value; } };
  },
});
try {
  await new Promise((resolve) => dom.window.addEventListener("load", resolve, { once: true }));
  const doc = dom.window.document;
  assert.equal(doc.querySelectorAll("[data-interactive][hidden]").length, 0, "Interactive controls become available");
  const ids = [...doc.querySelectorAll("[id]")].map((element) => element.id);
  assert.equal(ids.length, new Set(ids).size, "Inline SVG and page IDs are unique");
  checkLinks(doc, dom.window.location.href);
  const content = (id) => doc.getElementById(id).textContent;
  const copy = doc.querySelector("[data-copy]");
  const topic = doc.getElementById("prompt-topic");
  const prompts = new Set();
  for (const option of topic.options) {
    topic.value = option.value;
    topic.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    copy.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(copied, `@Cutaway ${content("example-prompt").trim()}`, "Copy delivers the selected visible prompt and mention");
    prompts.add(copied);
  }
  assert.equal(prompts.size, topic.options.length, "Each subject selects its own prompt");
  dom.window.navigator.clipboard.writeText = async () => { throw new Error("Clipboard denied"); };
  copy.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(dom.window.getSelection().toString(), content("example-prompt"), "Denied clipboard access leaves selectable prompt text");
  assert.deepEqual(errors, [], "No page runtime or stylesheet errors");
  assert(requests.length > 0, "The page loaded its bundled script");
  for (const path of filesBelow(output)) assert(!/(?:\.mov$|\.DS_Store|anatomy\.png|isoglow\.png|iso-glow\.zip|HANDOFF|\.env|\.git\/)/.test(path), `Private/reference input excluded: ${path}`);
  const report = {
    checks: ["Demo links, hero iframe target and downloads resolve", "Support and policy URLs resolve to complete pages with working local links", "Unique page IDs", "Subject selection changes the prompt", "Clipboard success and denied-access fallback", "Local resource loading", "No runtime errors", "Reference inputs excluded"],
    limitations: ["DOM checks don't cover layout, native keyboard behavior, or browser SVG filters", "Demo runtimes have separate model and DOM checks; this check doesn't run the iframe"],
  };
  mkdirSync(join(root, "dist/verification"), { recursive: true });
  writeFileSync(join(root, "dist/verification/site-report.json"), JSON.stringify(report, null, 2) + "\n");
  process.stdout.write("Website links, shipped runtime, subject selection, prompt copying, and public output checks passed.\n");
} finally {
  dom.window.close();
}
