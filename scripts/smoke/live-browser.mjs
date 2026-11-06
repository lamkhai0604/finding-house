// T-405: read-only browser checks against the deployed site. Nothing is created or changed.
// Usage: FRONTEND_URL=https://<app>.vercel.app node live-browser.mjs <screenshot dir>
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const frontend = (process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
const outDir = process.argv[2];
if (!frontend || !outDir) {
  console.error("usage: FRONTEND_URL=... node live-browser.mjs <screenshot dir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

let failures = 0;
const problems = [];
const browser = await chromium.launch({ channel: "chrome" });

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}: ${error.message.split("\n")[0]}`);
  }
}

try {
  for (const [label, viewport] of [
    ["desktop", { width: 1200, height: 800 }],
    ["phone", { width: 375, height: 740 }],
  ]) {
    const context = await browser.newContext({ viewport, isMobile: label === "phone" });
    const page = await context.newPage();
    page.on("console", (message) => {
      const text = message.text();
      if (/Content Security Policy|CORS|Refused to|blocked/i.test(text)) problems.push(text);
    });

    await check(`${label}: home page and API status`, async () => {
      await page.goto(`${frontend}/`);
      await page.getByRole("heading", { name: "Find a room in Seattle" }).waitFor({ timeout: 30000 });
      await page
        .getByRole("contentinfo")
        .getByRole("status")
        .filter({ hasText: /^API is up$/ })
        .waitFor({ timeout: 90000 });
      await page.screenshot({ path: `${outDir}/live-home-${label}.jpg`, type: "jpeg", quality: 70 });
    });

    await check(`${label}: browse page loads results from the API`, async () => {
      await page.goto(`${frontend}/browse`);
      await page.getByRole("heading", { name: "Browse rooms" }).waitFor({ timeout: 30000 });
      await page
        .getByText(/rooms? found|No rooms match these filters/)
        .first()
        .waitFor({ timeout: 60000 });
      await page.screenshot({ path: `${outDir}/live-browse-${label}.jpg`, type: "jpeg", quality: 70 });
    });

    await context.close();
  }
} finally {
  await browser.close();
}

if (problems.length > 0) {
  failures += 1;
  console.error(`FAIL ${problems.length} browser security message(s):`);
  for (const text of problems) console.error(`  ${text}`);
} else {
  console.log("ok   no CSP or CORS errors in the browser console");
}
process.exit(failures === 0 ? 0 : 1);
