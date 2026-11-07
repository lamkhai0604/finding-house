// Live AI search check (after D-035 is switched on): asks the real model a few fixed sentences on
// the deployed site and checks each one opens Browse with filters and chips. Skips when AI search
// is off. Uses 3 queries per run, well inside the per-address limit.
// Usage: FRONTEND_URL=... API_URL=... node live-ai.mjs <screenshot dir>
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const frontend = (process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
const api = (process.env.API_URL ?? "").replace(/\/+$/, "");
const outDir = process.argv[2];
if (!frontend || !api || !outDir) {
  console.error("usage: FRONTEND_URL=... API_URL=... node live-ai.mjs <screenshot dir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const status = await fetch(`${api}/api/v1/search/interpret`).then((r) => r.json());
if (!status.available) {
  console.log("skip AI search is off on this deployment");
  process.exit(0);
}

// Each sentence names at least one thing the model must turn into a filter.
const CASES = [
  {
    label: "desktop",
    viewport: { width: 1200, height: 800 },
    text: "studio in Capitol Hill under $2200",
    expect: (u) => u.get("neighborhood") === "Capitol Hill" && u.get("maxPrice") === "2200",
  },
  {
    label: "desktop",
    viewport: { width: 1200, height: 800 },
    text: "room near UW with wifi, max 1300 a month",
    expect: (u) => u.get("maxPrice") === "1300" && u.getAll("amenities").includes("WIFI"),
  },
  {
    label: "phone",
    viewport: { width: 375, height: 740 },
    text: "somewhere in Ballard with a washing machine",
    expect: (u) => u.get("neighborhood") === "Ballard" && u.getAll("amenities").includes("WASHING_MACHINE"),
  },
];

let failures = 0;
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const [index, c] of CASES.entries()) {
    const name = `L${index + 1}-${c.label}`;
    const context = await browser.newContext({ viewport: c.viewport, isMobile: c.label === "phone" });
    const page = await context.newPage();
    try {
      await page.goto(`${frontend}/`);
      const box = page.getByRole("search", { name: "Describe the room you want" });
      await box.waitFor({ timeout: 60000 });
      await box.getByRole("textbox").fill(c.text);
      await box.getByRole("button", { name: "Ask" }).click();
      await page.waitForURL(/\/browse\?/, { timeout: 20000 });
      const params = new URL(page.url()).searchParams;
      await page.getByRole("list", { name: "Filters in use" }).waitFor({ timeout: 15000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.screenshot({ path: `${outDir}/${name}.jpg`, type: "jpeg", quality: 70, fullPage: true });
      if (!c.expect(params)) throw new Error(`filters were ${params.toString()}`);
      console.log(`ok   ${name}: "${c.text}" -> ${params.toString()}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${name}: "${c.text}": ${error.message.split("\n")[0]}`);
      await page.screenshot({ path: `${outDir}/${name}-failed.jpg`, type: "jpeg", quality: 70 }).catch(() => {});
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`${failures} failure(s)`);
process.exit(failures ? 1 : 0);
