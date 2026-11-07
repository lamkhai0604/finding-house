// Records the README demo on the live site: an AI search, the result, the listing page.
// Usage: FRONTEND_URL=... node record-demo.mjs <out dir>   (writes demo.webm; uses 1 AI search)
import { chromium } from "playwright";
import { mkdirSync, readdirSync, renameSync } from "node:fs";

const frontend = (process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
const outDir = process.argv[2];
if (!frontend || !outDir) {
  console.error("usage: FRONTEND_URL=... node record-demo.mjs <out dir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const size = { width: 1200, height: 750 };

// Wake the free API before recording, so the video does not start with a long wait.
const api = (process.env.API_URL ?? "").replace(/\/+$/, "");
for (let i = 0; i < 36; i += 1) {
  const ok = await fetch(`${api}/api/v1/listings?size=1`).then((r) => r.ok).catch(() => false);
  if (ok) break;
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
const warm = await chromium.launch({ channel: "chrome" });
const warmPage = await warm.newPage();
await warmPage.goto(`${frontend}/browse`);
try {
  await warmPage.getByRole("article").first().waitFor({ timeout: 60000 });
} catch (error) {
  await warmPage.screenshot({ path: `${outDir}/warm-failed.png` });
  console.log("SHOT-BEGIN"); console.log((await import("node:fs")).readFileSync(`${outDir}/warm-failed.png`).toString("base64")); console.log("SHOT-END");
  throw error;
}
await warm.close();

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: size, recordVideo: { dir: outDir, size } });
const page = await context.newPage();
const pause = (ms) => page.waitForTimeout(ms);

await page.goto(`${frontend}/`);
await page.getByRole("search", { name: "Describe the room you want" }).waitFor({ timeout: 60000 });
await page.waitForLoadState("networkidle").catch(() => {});
await pause(1500);

const box = page.getByRole("search", { name: "Describe the room you want" });
await box.getByRole("textbox").click();
await page.keyboard.type("studio in Capitol Hill under $2,200", { delay: 70 });
await pause(600);
await box.getByRole("button", { name: "Ask" }).click();
await page.waitForURL(/\/browse\?/, { timeout: 20000 });
await page.getByRole("list", { name: "Filters in use" }).waitFor();
await page.waitForLoadState("networkidle").catch(() => {});
await pause(1200);
await page.mouse.wheel(0, 380);
await pause(2200);

await page.getByRole("article").first().locator("a[href^='/listings/']").first().click();
await page.waitForURL(/\/listings\/\d+/, { timeout: 20000 });
await page.waitForLoadState("networkidle").catch(() => {});
await pause(2000);
await page.mouse.wheel(0, 450);
await pause(2200);
await page.mouse.wheel(0, -450);
await pause(800);

await context.close();
await browser.close();
const video = readdirSync(outDir).find((f) => f.endsWith(".webm"));
renameSync(`${outDir}/${video}`, `${outDir}/demo.webm`);
console.log("recorded demo.webm");
