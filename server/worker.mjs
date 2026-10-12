import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./mcp.mjs";
import { exportView } from "./exports.mjs";
import { isServiceOrigin, models, origin } from "../app/models.mjs";
import { version } from "../package.json";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const error = (message, status) => new Response(message, { status, headers });

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new RangeError("Request too large"); }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(body);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!isServiceOrigin(url.origin)) return error("Unknown host", 403);
    if (url.pathname === "/health") return Response.json({ name: "cutaway", version }, { headers });
    if (url.pathname.startsWith("/export/") || url.pathname.startsWith("/view/")) {
      if (!["GET", "HEAD"].includes(request.method)) return error("Method not allowed", 405);
      const match = url.pathname.match(/^\/(?:export\/([a-z-]+)\.(html|svg)|view\/([a-z-]+))$/);
      const id = match?.[1] ?? match?.[3];
      if (!id || !Object.hasOwn(models, id)) return error("Cutaway not found", 404);
      if (url.search.length > 2048) return error("Settings too large", 400);
      let state;
      try { state = JSON.parse(url.searchParams.get("state") ?? "{}"); }
      catch { return error("Invalid settings", 400); }
      const format = match[2] ?? "html";
      try {
        const body = await exportView(env, id, state, format);
        return new Response(request.method === "HEAD" ? null : body, { headers: {
          ...headers,
          "Content-Type": format === "svg" ? "image/svg+xml; charset=utf-8" : "text/html; charset=utf-8",
          "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
          ...(match[1] ? { "Content-Disposition": `attachment; filename="cutaway-${id}.${format}"` } : {}),
        } });
      } catch (cause) {
        if (cause.message === "Missing built asset") return error("Cutaway unavailable", 503);
        return error("Invalid settings", 400);
      }
    }
    if (url.pathname !== "/mcp") return env.ASSETS.fetch(request);
    const browserOrigin = request.headers.get("Origin");
    if (browserOrigin && ![origin, "https://chatgpt.com", url.origin].includes(browserOrigin)) return error("Origin not allowed", 403);
    const cors = browserOrigin ? { "Access-Control-Allow-Origin": browserOrigin, Vary: "Origin" } : {};
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      ...headers, ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, mcp-protocol-version, mcp-session-id",
    } });
    if (request.method !== "POST") return new Response("Use POST for MCP requests", { status: 405, headers: { ...headers, ...cors, Allow: "POST, OPTIONS" } });
    let body;
    try { body = await readBody(request); }
    catch { return error("Request too large", 413); }
    const server = createServer(env, url.origin);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await server.connect(transport);
      const response = await transport.handleRequest(new Request(request.url, { method: "POST", headers: request.headers, body }));
      const result = new Response(response.body, response);
      for (const [name, value] of Object.entries({ ...headers, ...cors })) result.headers.set(name, value);
      return result;
    } catch {
      return error("MCP request failed", 500);
    } finally {
      await server.close();
    }
  },
};
