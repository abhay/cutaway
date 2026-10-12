import { resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "../dist/site");
const { default: worker } = await import(resolve(root, "_worker.js"));
const assets = {
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (["/_worker.js", "/_routes.json", "/_headers"].includes(pathname)) return new Response("Not found", { status: 404 });
    return serveAsset(request);
  },
};
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4322,
  fetch: (request) => worker.fetch(request, { ASSETS: assets }),
});
async function serveAsset(request) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url).pathname); }
  catch { return new Response("Invalid path", { status: 400 }); }
  const path = resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
  if (!path.startsWith(root + sep)) return new Response("Not found", { status: 404 });
  const file = Bun.file(path);
  if (!await file.exists()) return new Response(Bun.file(resolve(root, "404.html")), { status: 404 });
  return new Response(file, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
console.log(`Cutaway preview: ${server.url}`);
