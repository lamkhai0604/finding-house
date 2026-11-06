// T-215: screenshots of the demo content with its real photos, and a check that every photo on
// the page loaded (no broken image placeholders).
// Usage: FRONTEND_URL=http://localhost:4173 node demo-shots.mjs <screenshot dir>
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const frontend = (process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
const outDir = process.argv[2];
if (!frontend || !outDir) {
  console.error("usage: FRONTEND_URL=... node demo-shots.mjs <screenshot dir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

let failures = 0;
const browser = await chromium.launch({ channel: "chrome" });

async function photosLoaded(page) {
  // Scroll through so lazy images load, then wait for every Unsplash photo to finish.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(
    () =>
      [...document.images]
        .filter((img) => img.src.startsWith("https://images.unsplash.com/"))
        .every((img) => img.complete),
    null,
    { timeout: 30000 },
  );
  return page.evaluate(() => {
    const photos = [...document.images].filter((img) =>
      img.src.startsWith("https://images.unsplash.com/"),
    );
    return { total: photos.length, broken: photos.filter((img) => img.naturalWidth === 0).length };
  });
}

async function shot(page, name, path, ready) {
  try {
    await page.goto(`${frontend}${path}`);
    await ready(page).waitFor({ timeout: 15000 });
    const { total, broken } = await photosLoaded(page);
    if (total === 0) throw new Error("no demo photos on the page");
    if (broken > 0) throw new Error(`${broken} of ${total} photos did not load`);
    await page.screenshot({ path: `${outDir}/${name}.jpg`, type: "jpeg", quality: 70, fullPage: true });
    console.log(`ok   ${name}: ${total} demo photos loaded`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}: ${error.message.split("\n")[0]}`);
  }
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await desktop.newPage();
  await shot(page, "D1-demo-home", "/", (p) =>
    p.getByRole("region", { name: "Just posted" }).getByRole("article").first(),
  );
  await shot(page, "D2-demo-browse", "/browse", (p) => p.getByRole("article").first());
  const title = "Bright room off Pine, 5 min to the station";
  await page.goto(`${frontend}/browse?neighborhood=Capitol+Hill`);
  await page.getByRole("link", { name: title, exact: true }).click();
  await page.waitForURL(/\/listings\/\d+$/);
  await shot(page, "D3-demo-listing", new URL(page.url()).pathname, (p) =>
    p.getByRole("heading", { level: 1, name: title }),
  );
} finally {
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} demo check(s) failed`);
  process.exit(1);
}
