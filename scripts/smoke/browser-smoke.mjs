// T-008: opens the frontend in headless Chromium and checks the API health indicator.
// Usage: node browser-smoke.mjs <expected text[|alternative...]> <screenshot path>
// Run from a directory where the `playwright` package is installed.
import { chromium } from "playwright";

const [expected, screenshotPath] = process.argv.slice(2);
const url = process.env.FRONTEND_URL ?? "http://localhost:5173";

if (!expected || !screenshotPath) {
  console.error("usage: node browser-smoke.mjs <expected text> <screenshot path>");
  process.exit(2);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  await page.goto(url);
  await page.getByRole("heading", { name: "Finding House" }).waitFor({ timeout: 15000 });
  const status = page.getByRole("status");
  const alternatives = expected.split("|").map((text) => text.replace(/[.*+?^${}()[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`^(${alternatives.join("|")})$`);
  await status.filter({ hasText: pattern }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: screenshotPath });
  console.log(`ok   page shows "${(await status.textContent())?.trim()}"`);
} catch (error) {
  console.error(`FAIL: expected "${expected}" on ${url}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
