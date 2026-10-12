import { applyState, readState } from "./controls.mjs";
import { watchLinks, updateLinks, useServiceOrigin } from "./links.mjs";
import { models } from "./models.mjs";
import { version } from "../package.json";

const model = document.documentElement.dataset.cutawayModel;
const status = document.querySelector("#cutaway-status");
const main = document.querySelector("main");
const discuss = document.querySelector("#cutaway-discuss");
const pending = new Map();
let nextId = 0;
let hostOrigin;
let ready = false;
let resizeObserver;

function send(message) {
  window.parent.postMessage({ jsonrpc: "2.0", ...message }, hostOrigin ?? "*");
}

function request(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error("The host did not respond"));
    }, 10000);
    pending.set(id, { resolve, reject, timeout });
    send({ id, method, params });
  });
}

function render(result) {
  if (result?.isError) { status.textContent = "This view couldn’t be opened. Try the request again."; return; }
  const output = result?.structuredContent;
  if (!output || output.model !== model) return;
  try {
    if (output.links?.view) useServiceOrigin(new URL(output.links.view).origin);
    applyState(model, output.state);
    main.hidden = false;
    status.textContent = "";
    updateLinks(model);
  } catch {
    status.textContent = "The view settings weren’t recognized. Try the request again.";
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent || hostOrigin && event.origin !== hostOrigin) return;
  const message = event.data;
  if (!message || message.jsonrpc !== "2.0") return;
  if (pending.has(message.id)) {
    if (!hostOrigin && event.origin !== "null") hostOrigin = event.origin;
    const task = pending.get(message.id);
    clearTimeout(task.timeout);
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  } else if (message.method === "ui/notifications/tool-result") render(message.params);
  else if (message.method === "ui/notifications/tool-cancelled") status.textContent = "Opening this cutaway was cancelled.";
  else if (message.method === "ui/resource-teardown") {
    window.dispatchEvent(new Event("pagehide"));
    send({ id: message.id, result: {} });
  }
});

watchLinks(model);
main.hidden = true;
discuss.addEventListener("click", async () => {
  if (!ready) return;
  discuss.disabled = true;
  try {
    await request("ui/message", {
      role: "user",
      content: [{ type: "text", text: `Explain this ${models[model].title} view: ${JSON.stringify(readState(model))}. What should I notice?` }],
    });
    status.textContent = "View sent to the conversation.";
  } catch {
    status.textContent = "The view couldn’t be sent. You can describe these settings in the conversation.";
  } finally { discuss.disabled = false; }
});

window.addEventListener("pagehide", () => {
  resizeObserver?.disconnect();
  for (const task of pending.values()) { clearTimeout(task.timeout); task.reject(new Error("View closed")); }
  pending.clear();
});

request("ui/initialize", { appInfo: { name: "cutaway", version }, appCapabilities: {}, protocolVersion: "2026-01-26" })
  .then(() => {
    ready = true;
    discuss.hidden = false;
    send({ method: "ui/notifications/initialized", params: {} });
    if (typeof ResizeObserver === "function") {
      let height = 0;
      resizeObserver = new ResizeObserver(() => {
        const next = Math.ceil(document.documentElement.getBoundingClientRect().height);
        if (next !== height) { height = next; send({ method: "ui/notifications/size-changed", params: { height } }); }
      });
      resizeObserver.observe(document.documentElement);
    }
  })
  .catch(() => {
    status.textContent = "The ChatGPT connection isn’t available. Open the cutaway in your browser to explore it.";
    main.hidden = false;
  });
