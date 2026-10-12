import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = resolve(process.argv[2] ?? join(root, "dist/examples"));
const output = join(root, "dist/verification");
mkdirSync(output, { recursive: true });
const { chromium } = await import(process.env.CUTAWAY_PLAYWRIGHT ?? "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.CUTAWAY_BROWSER ? { executablePath: process.env.CUTAWAY_BROWSER } : {}) });
const report = { checkedAt: new Date().toISOString(), artifacts, checks: [], screenshots: [] };

async function metric(page, label, value) {
  const actual = await page.locator(".metrics > div").filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd").innerText();
  assert.equal(actual, value, `${label} readout`);
}

async function click(page, name, times = 1) {
  for (let i = 0; i < times; i++) await page.getByRole("button", { name, exact: true }).click();
}

async function exercise(page, id) {
  if (id === "token-bucket") {
    await click(page, "Burst of 11");
    await metric(page, "Accepted", "10");
    await metric(page, "Rejected", "1");
    await metric(page, "Tokens", "0.00");
    assert.equal(await page.locator("#token-0").getAttribute("opacity"), "0");
    await click(page, "+1 second");
    await metric(page, "Tokens", "2.00");
    assert.equal(await page.locator("#token-1").getAttribute("opacity"), "1");
    const request = page.getByRole("button", { name: "Send request", exact: true });
    await request.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await metric(page, "Accepted", "12");
    await click(page, "Send request");
    await metric(page, "Rejected", "2");
    await page.getByLabel("Capacity").focus();
    await page.keyboard.press("Home");
    await click(page, "+1 second", 2);
    await metric(page, "Tokens", "2.00");
    await page.getByLabel("Tokens per second").focus();
    await page.keyboard.press("Home");
    await click(page, "Burst of 11");
    await click(page, "+1 second");
    await metric(page, "Tokens", "0.00");
    await click(page, "Reset");
    await click(page, "Burst of 11");
    await click(page, "+1 second");
  } else if (id === "lru-cache") {
    for (const key of ["A", "B", "C", "A", "D"]) await click(page, `Request ${key}`);
    await metric(page, "Hits", "1");
    await metric(page, "Misses", "4");
    assert.match(await page.locator("#detail").innerText(), /D → A → C\. Evicted: B/);
    assert.deepEqual(await page.locator('[id^="cache-key-"]').allTextContents(), ["D", "A", "C"]);
  } else if (id === "connection-pool") {
    await click(page, "Submit job", 8);
    await metric(page, "Borrowed", "3 / 3");
    await metric(page, "Waiting", "4 / 4");
    await metric(page, "Rejected", "1");
    await click(page, "+1 second", 3);
    assert.match(await page.locator("#slot-0").innerText(), /Job 4/);
    assert.match(await page.locator("#slot-2").innerText(), /Job 6/);
    await metric(page, "Waiting", "1 / 4");
    await page.getByRole("button", { name: "Return", exact: true }).nth(1).click();
    assert.match(await page.locator("#slot-1").innerText(), /Job 7/);
    await metric(page, "Waiting", "0 / 4");
  } else {
    await click(page, "Fail downstream");
    await click(page, "Send request", 3);
    await metric(page, "Relay", "open");
    await click(page, "Send request");
    await metric(page, "Rejected", "1");
    await click(page, "+1 second", 5);
    await metric(page, "Relay", "half-open");
    await click(page, "Restore downstream");
    await click(page, "Send request", 2);
    await metric(page, "Rejected", "2");
    assert.equal(await page.getByRole("button", { name: "Resolve probe", exact: true }).isEnabled(), true);
    await click(page, "Resolve probe");
    await metric(page, "Relay", "closed");
    await metric(page, "Failures", "0 / 3");
    await click(page, "Fail downstream");
    await click(page, "Send request", 3);
  }
}

try {
  for (const theme of ["light", "dark"]) {
    for (const id of ["token-bucket", "lru-cache", "connection-pool", "circuit-breaker"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce", offline: true });
      const page = await context.newPage();
      const errors = [];
      const remoteRequests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("request", (request) => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
      await page.goto(pathToFileURL(join(artifacts, `${id}${theme === "light" ? "-light" : ""}.html`)).href);
      await page.locator("button.primary").first().focus();
      await page.keyboard.press("Enter");
      if (id === "token-bucket") await metric(page, "Accepted", "1");
      if (id === "lru-cache") await metric(page, "Resident", "1 / 3");
      if (id === "connection-pool") await metric(page, "Borrowed", "1 / 3");
      if (id === "circuit-breaker") assert.match(await page.locator("#detail").innerText(), /1 succeeded/);
      await click(page, id === "lru-cache" ? "Reset cabinet" : "Reset");
      await exercise(page, id);
      const metricsBefore = await page.locator(".metrics").innerText();
      await page.getByLabel("Theme", { exact: true }).selectOption("dark");
      await page.getByLabel("Palette", { exact: true }).selectOption("cyan");
      const activePart = page.locator('.stage .cutaway-active[data-active="true"]').first();
      assert.notEqual(await activePart.evaluate((element) => getComputedStyle(element).filter), "none", "Active parts glow in dark mode");
      await page.getByLabel("Style", { exact: true }).selectOption("technical");
      assert.equal(await activePart.evaluate((element) => getComputedStyle(element).filter), "none", "Technical mode removes bloom");
      await page.getByLabel("Style", { exact: true }).selectOption("glow");
      await page.getByLabel("Theme", { exact: true }).selectOption("light");
      assert.equal(await activePart.evaluate((element) => getComputedStyle(element).filter), "none", "Light mode uses flat accents");
      assert.equal(await page.locator(".metrics").innerText(), metricsBefore, "Appearance controls preserve the mechanism state");
      await page.getByLabel("Theme", { exact: true }).selectOption(theme);
      for (const [layout, viewport] of [["desktop", { width: 1440, height: 1100 }], ["phone", { width: 390, height: 844 }]]) {
        await page.setViewportSize(viewport);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${id} ${layout} horizontal overflow`);
        const clippedControls = await page.locator("button, input, select").evaluateAll((elements) => elements.filter((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.width < 1 || bounds.left < 0 || bounds.right > innerWidth;
        }).length);
        assert.equal(clippedControls, 0, `${id} ${layout} controls stay inside viewport`);
        const filename = `${id}-${theme}-${layout}.png`;
        await page.screenshot({ path: join(output, filename), fullPage: true });
        report.screenshots.push(filename);
      }
      if (id !== "lru-cache") {
        await click(page, "Reset");
        await page.waitForTimeout(150);
        assert.equal(await page.locator("#time").innerText(), "0.0 s", "reduced motion starts with a paused clock");
      }
      if (id === "token-bucket" && theme === "light") {
        await page.setViewportSize({ width: 1440, height: 1100 });
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await click(page, "Burst of 11");
        await click(page, "Run clock");
        await page.waitForFunction(() => Number(document.querySelector("#metric-0").textContent) >= 1, undefined, { timeout: 5000 });
        await click(page, "Pause clock");
        const before = await page.locator("#metric-0").innerText();
        await page.waitForTimeout(200);
        assert.equal(await page.locator("#metric-0").innerText(), before, "Pause stops refill");
        await click(page, "Run clock");
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.getByRole("button", { name: "Run clock", exact: true }).waitFor();
      }
      assert.deepEqual(errors, [], `${id} browser errors`);
      assert.deepEqual(remoteRequests, [], `${id} must work without network requests`);
      report.checks.push(`${id}: ${theme} controls, readouts, drawing state, appearance switching, keyboard, reduced motion, desktop/phone, offline`);
      await context.close();
    }
  }
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(artifacts, "lru-cache-light.svg")).href);
  assert.equal(await page.locator("script").count(), 0);
  assert.deepEqual(await page.locator('[id^="cache-key-"]').allTextContents(), ["D", "A", "C"]);
  assert.notEqual(await page.locator(".iso-top").first().evaluate((node) => getComputedStyle(node).fill), "rgb(0, 0, 0)");
  await page.screenshot({ path: join(output, "standalone-svg.png") });
  report.checks.push("Standalone SVG opens with styles and the documented snapshot, without JavaScript");
  writeFileSync(join(output, "browser-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("Browser exercises passed. Screenshots and report: " + output);
} finally {
  await browser.close();
}
