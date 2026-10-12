import { afterAll, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const initializer = join(root, "skills/cutaway/scripts/create-project.mjs");
const scratch = mkdtempSync(join(tmpdir(), "cutaway-test-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

test.each(["dial-indicator", "desk-computer", "token-bucket", "lru-cache", "connection-pool", "circuit-breaker"])("%s builds standalone artifacts from a separate project", (example) => {
  const project = join(scratch, `${example} with spaces`);
  execFileSync("bun", [initializer, project, "--example", example], { cwd: scratch });
  for (const theme of ["light", "dark"]) {
    const original = existsSync(join(project, "build.mjs"));
    const build = original ? join(project, "build.mjs") : join(project, "examples", example, "build.mjs");
    execFileSync("bun", [build, ...(theme === "light" ? ["--light"] : [])], { cwd: scratch });
    const page = join(original ? project : join(project, "examples", example), `${example}${theme === "light" ? "-light" : ""}.html`);
    const html = readFileSync(page, "utf8");
    expect(html).toMatch(/<svg\b/);
    expect(html).toContain(`data-theme="${theme}"`);
    expect(html).not.toMatch(/<(?:script|link)\b[^>]*(?:src|href)\s*=/i);
    expect(html).not.toMatch(/(?:NaN|Infinity)/);
    if (original) {
      const svg = readFileSync(page.replace(/\.html$/, ".svg"), "utf8");
      for (const artifact of [html, svg]) {
        for (const author of ["Abhay Kumar", "Ryan", "April Zhu", "Tolga Cohce"]) {
          expect(artifact).toContain(`Copyright (c) 2026 ${author}`);
        }
      }
    }
    const scripts = [...html.matchAll(/<script\b(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const [index, [, script]] of scripts.entries()) {
      const documentMarkup = script.match(/<!doctype\b|<\/?(?:html|head|body)(?:\s|>)/i)?.[0] ?? null;
      expect({ example, theme, documentMarkup }).toEqual({ example, theme, documentMarkup: null });
      const scriptPath = join(project, `browser-${theme}-${index}.mjs`);
      writeFileSync(scriptPath, script);
      execFileSync("node", ["--check", scriptPath]);
    }
  }
  expect(readFileSync(join(project, "LICENSE"), "utf8")).toContain("Copyright (c) 2026 Ryan");
  expect(readFileSync(join(project, "LICENSE"), "utf8")).toContain("Copyright (c) 2026 Abhay Kumar");
  const glowLicense = readFileSync(join(project, "glow/LICENSE"), "utf8");
  expect(glowLicense).toContain("Copyright (c) 2026 April Zhu");
  expect(glowLicense).toContain("Copyright (c) 2026 Tolga Cohce");
  const palette = execFileSync("node", ["--input-type=module", "-e", 'import { appearance } from "./glow/palettes.mjs"; console.log(appearance({palette:"sodium",theme:"dark"}).palette);'], { cwd: project, encoding: "utf8" });
  expect(palette.trim()).toBe("sodium");
});

test("the initializer preserves existing work and rejects invalid input before writing", () => {
  const sentinel = join(scratch, "existing.txt");
  writeFileSync(sentinel, "user work\n");
  const existing = spawnSync("bun", [initializer, scratch], { encoding: "utf8" });
  expect(existing.status).not.toBe(0);
  expect(existing.stderr).toContain("Destination already exists");
  expect(readFileSync(sentinel, "utf8")).toBe("user work\n");
  const invalid = join(scratch, "invalid");
  const result = spawnSync("bun", [initializer, invalid, "--example", "../../elsewhere"], { encoding: "utf8" });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Unknown example");
  expect(existsSync(invalid)).toBe(false);
});
