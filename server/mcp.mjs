import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { version } from "../package.json";
import { describeView, models, normalizeState, origin, viewLinks } from "../app/models.mjs";
import { loadAsset } from "./exports.mjs";

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const securitySchemes = [{ type: "noauth" }];
const resourceUri = (id) => `ui://cutaway/${version}/${id}.html`;

function inputSchema(fields) {
  return z.object(Object.fromEntries(Object.entries(fields).map(([key, rule]) => {
    const numeric = rule.type === "number" || rule.type === "integer";
    let field = numeric ? z.number().min(rule.minimum).max(rule.maximum) : rule.enum ? z.enum(rule.enum) : z.boolean();
    if (rule.type === "integer") field = field.int();
    return [key, field.describe(`${rule.description} Default: ${rule.default}.`).optional()];
  }))).strict();
}

export function createServer(env, base = origin) {
  const server = new McpServer({ name: "cutaway", version });
  server.registerTool("list_cutaways", {
    title: "Browse cutaways",
    description: "List the available interactive educational cutaways and their controls. Use a model's open tool to display it. Custom drawings are handled by the bundled Cutaway skill.",
    inputSchema: z.object({}).strict(), annotations, _meta: { securitySchemes },
  }, async () => ({
    content: [{ type: "text", text: "Explore a GE9X jet engine, wing designs, an espresso machine, or a boxer engine." }],
    structuredContent: { models: Object.entries(models).map(([id, model]) => ({ id, title: model.title, tool: model.tool, controls: model.fields, limitations: model.limits })) },
  }));

  for (const [id, model] of Object.entries(models)) {
    const uri = resourceUri(id);
    server.registerResource(id, uri, { title: model.title, mimeType: "text/html;profile=mcp-app" }, async () => ({
      contents: [{
        uri, mimeType: "text/html;profile=mcp-app", text: await loadAsset(env, `/app/${id}-widget.html`),
        _meta: {
          ui: { domain: origin, prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } },
          "openai/widgetDescription": `Interactive ${model.title} with component controls, sources, and HTML/SVG downloads.`,
          "openai/widgetCSP": { connect_domains: [], resource_domains: [], redirect_domains: [base] },
        },
      }],
    }));
    server.registerTool(model.tool, {
      title: `Explore ${model.title}`, description: model.description,
      inputSchema: inputSchema(model.fields), annotations,
      _meta: { securitySchemes, ui: { resourceUri: uri }, "openai/outputTemplate": uri, "openai/toolInvocation/invoking": "Opening cutaway", "openai/toolInvocation/invoked": "Cutaway ready" },
    }, async (input) => {
      const state = normalizeState(id, input);
      const explanation = describeView(id, state);
      const links = viewLinks(id, state, base);
      return {
        content: [{ type: "text", text: `${explanation}\n\n${model.limits}\n\n[Open cutaway](${links.view}) · [Download HTML](${links.html}) · [Download SVG](${links.svg})\n\nSources: ${model.sources.map(([title, url]) => `[${title}](${url})`).join("; ")}` }],
        structuredContent: { model: id, title: model.title, state, explanation, limitations: model.limits, sources: model.sources.map(([title, url]) => ({ title, url })), links },
      };
    });
  }
  return server;
}
