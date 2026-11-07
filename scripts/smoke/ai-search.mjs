// T-303 / T-304: AI search in the browser against the smoke stack, whose backend talks to
// fake-ai.mjs. Covers the happy path (filters, chips, note) and every failure message, then checks
// manual filters still work. Usage: FRONTEND_URL=... node ai-search.mjs <screenshot dir>
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const frontend = (process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
const outDir = process.argv[2];
if (!frontend || !outDir) {
  console.error("usage: FRONTEND_URL=... node ai-search.mjs <screenshot dir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}: ${error.message.split("\n")[0]}`);
  }
}

const browser = await chromium.launch({ channel: "chrome" });

async function ask(page, text) {
  const box = page.getByRole("search", { name: "Describe the room you want" });
  await box.waitFor({ timeout: 15000 });
  await box.getByRole("textbox").fill(text);
  await box.getByRole("button", { name: "Ask" }).click();
  return box;
}

async function expectMessage(page, text, pattern, shotName) {
  await page.goto(`${frontend}/browse`);
  const box = await ask(page, text);
  await box.getByText(pattern).waitFor({ timeout: 12000 });
  if (shotName) {
    await page.screenshot({ path: `${outDir}/${shotName}.jpg`, type: "jpeg", quality: 70 });
  }
  // Manual search is untouched (NFR-04).
  await page.getByRole("article").first().waitFor({ timeout: 15000 });
}

try {
  for (const [label, viewport, isMobile] of [
    ["desktop", { width: 1200, height: 800 }, false],
    ["phone", { width: 375, height: 740 }, true],
  ]) {
    const context = await browser.newContext({ viewport, isMobile });
    const page = await context.newPage();

    await check(`${label}: home shows the AI box and a sentence opens browse with chips`, async () => {
      await page.goto(`${frontend}/`);
      await page.getByRole("search", { name: "Describe the room you want" }).waitFor({ timeout: 15000 });
      await page.screenshot({ path: `${outDir}/A1-home-ai-box-${label}.jpg`, type: "jpeg", quality: 70 });
      await ask(page, "laundry room in Ballard under 1500");
      await page.waitForURL(/\/browse\?/, { timeout: 15000 });
      const url = new URL(page.url());
      const got = `${url.searchParams.get("neighborhood")}|${url.searchParams.get("maxPrice")}|${url.searchParams.getAll("amenities").join(",")}`;
      if (got !== "Ballard|1500|WASHING_MACHINE") throw new Error(`browse opened with ${url.search}`);
      const chips = page.getByRole("list", { name: "Filters in use" });
      await chips.getByText("Ballard").waitFor({ timeout: 15000 });
      await page.getByText("Left out an amenity we do not list.").waitFor();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.screenshot({ path: `${outDir}/A2-browse-from-ai-${label}.jpg`, type: "jpeg", quality: 70, fullPage: true });
      await chips.getByRole("button", { name: "Remove Ballard" }).click();
      await page.waitForURL((u) => !u.searchParams.has("neighborhood"), { timeout: 15000 });
    });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  await check("not a room search is explained", () =>
    expectMessage(page, "write me a poem", /does not look like a room search/, "A3-not-understood"),
  );
  await check("a slow provider times out with a clear message", () =>
    expectMessage(page, "slow please", /took too long/, "A4-timeout"),
  );
  await check("a busy provider is explained", () =>
    expectMessage(page, "busy room", /busy right now/, "A5-busy"),
  );
  await check("an unreadable reply is explained", () =>
    expectMessage(page, "garbage", /could not read that/, null),
  );
  await context.close();
} finally {
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} AI search check(s) failed`);
  process.exit(1);
}
