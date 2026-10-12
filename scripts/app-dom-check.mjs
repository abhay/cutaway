import { check } from "../tests/app-dom.mjs";

await check(new URL("../dist/site/", import.meta.url));
console.log("Cutaway settings, standalone exports, and MCP Apps bridge checks passed.");
