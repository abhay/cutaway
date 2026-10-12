import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import worker from "../dist/site/_worker.js";

const base = "https://cutaway.abhay.gg";
const env = { ASSETS: { async fetch(request) {
  try { return new Response(await readFile(new URL(`../dist/site${new URL(request.url).pathname}`, import.meta.url))); }
  catch { return new Response("Not found", { status: 404 }); }
} } };
const fetchWorker = (input, init) => worker.fetch(new Request(input, init), env);

async function connect(endpoint = base) {
  const client = new Client({ name: "cutaway-check", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${endpoint}/mcp`), { fetch: fetchWorker }));
  return client;
}

test("MCP clients discover tools, open distinct views, and read their UI resources", async () => {
  const preview = "https://mcp-preview.cutaway-abhay.pages.dev";
  const [first, second] = await Promise.all([connect(), connect(preview)]);
  try {
    const { tools } = await first.listTools();
    const widget = tools.find(({ name }) => name === "open_ge9x")._meta.ui.resourceUri;
    const resource = await first.readResource({ uri: widget });
    expect(resource.contents[0].mimeType).toBe("text/html;profile=mcp-app");
    expect(resource.contents[0].text).toContain("<svg");
    const [compressor, shafts] = await Promise.all([
      first.callTool({ name: "open_ge9x", arguments: { component: "compressor" } }),
      second.callTool({ name: "open_ge9x", arguments: { component: "shafts", flow: false } }),
    ]);
    expect(compressor.structuredContent.state.component).toBe("compressor");
    expect(shafts.structuredContent.state.component).toBe("shafts");
    expect(new URL(shafts.structuredContent.links.html).origin).toBe(preview);
    expect(compressor.structuredContent.explanation).toContain("11 rotor stages");
    expect(compressor.structuredContent.sources.some(({ url }) => new URL(url).hostname === "www.geaerospace.com")).toBe(true);
    for (const [tool, settings] of [
      ["open_wing", { shape: "tapered", flap: 30, slat: true }],
      ["open_espresso", { stage: "Finished", component: "valve" }],
      ["open_boxer", { angle: 180, pair: 2 }],
    ]) {
      const result = await first.callTool({ name: tool, arguments: settings });
      expect(result.isError).not.toBe(true);
      for (const [key, value] of Object.entries(settings)) expect(result.structuredContent.state[key]).toBe(value);
      for (const format of ["html", "svg"]) {
        const download = await fetchWorker(result.structuredContent.links[format]);
        expect(download.status).toBe(200);
        expect(download.headers.get("Content-Disposition")).toContain("attachment;");
        expect(await download.text()).toContain("Copyright");
      }
    }
    const invalid = await first.callTool({ name: "open_wing", arguments: { flap: 90 } });
    expect(invalid.isError).toBe(true);
    const unknown = await first.callTool({ name: "open_espresso", arguments: { component: "steam-wand" } });
    expect(unknown.isError).toBe(true);
    const injection = await first.callTool({ name: "open_boxer", arguments: { angle: "<script>" } });
    expect(injection.isError).toBe(true);
    const defaultView = await second.callTool({ name: "open_ge9x", arguments: {} });
    expect(defaultView.structuredContent.state).toEqual({ component: "fan", flow: true });
  } finally { await Promise.all([first.close(), second.close()]); }
});

test("the HTTP boundary rejects untrusted origins, oversized requests, and unsupported methods", async () => {
  expect((await fetchWorker(`${base}/mcp`, { method: "POST", headers: { Origin: "https://unrelated.example" }, body: "{}" })).status).toBe(403);
  expect((await fetchWorker("https://attacker.example/mcp", { method: "POST", body: "{}" })).status).toBe(403);
  expect((await fetchWorker(`${base}/mcp`, { method: "POST", body: "x".repeat(16385) })).status).toBe(413);
  expect((await fetchWorker(`${base}/mcp`)).status).toBe(405);
  const preflight = await fetchWorker(`${base}/mcp`, { method: "OPTIONS", headers: { Origin: "https://chatgpt.com" } });
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("https://chatgpt.com");
  expect((await fetchWorker(`${base}/export/wing.html?state=invalid`)).status).toBe(400);
  expect((await fetchWorker(`${base}/export/unknown.svg`)).status).toBe(404);
  const malformed = await fetchWorker(`${base}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: "not json" });
  expect(malformed.status).toBe(400);
  expect((await fetchWorker(`${base}/index.html`)).status).toBe(200);
});
