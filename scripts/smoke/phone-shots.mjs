// T-216: every page at 375 px (iPhone SE / mini width). For each page: a full-page screenshot and a
// check that nothing makes the page wider than the screen (no sideways scrolling).
// Usage: FRONTEND_URL=http://localhost:4173 node phone-shots.mjs <screenshot dir>
// Uses the public sample accounts from scripts/sample-data (local stack only, never live).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const frontend = (process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
const outDir = process.argv[2];
if (!frontend || !outDir) {
  console.error("usage: FRONTEND_URL=... node phone-shots.mjs <screenshot dir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const WIDTH = 375;
let failures = 0;
const browser = await chromium.launch({ channel: "chrome" });

async function phoneShot(page, name, ready) {
  try {
    await ready.waitFor({ timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    const wide = await page.evaluate(() => {
      const width = document.documentElement.scrollWidth;
      const culprits = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const box = el.getBoundingClientRect();
          // Elements inside a sideways-scrolling box are allowed to be wider.
          let parent = el.parentElement;
          while (parent) {
            const style = getComputedStyle(parent);
            if (/(auto|scroll|hidden)/.test(style.overflowX)) return false;
            parent = parent.parentElement;
          }
          return box.right > window.innerWidth + 1;
        })
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`);
      return { width, culprits };
    });
    await page.screenshot({ path: `${outDir}/${name}.jpg`, type: "jpeg", quality: 70, fullPage: true });
    if (wide.width > WIDTH) {
      throw new Error(`page is ${wide.width}px wide; widest: ${wide.culprits.join(", ")}`);
    }
    console.log(`ok   ${name}: fits ${WIDTH}px`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}: ${error.message.split("\n")[0]}`);
  }
}

async function logIn(page, email, password, greeting) {
  await page.goto(`${frontend}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByText(greeting).waitFor({ timeout: 15000 });
}

try {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: 740 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto(`${frontend}/`);
  await phoneShot(page, "P01-home", page.getByRole("region", { name: "Just posted" }).getByRole("article").first());

  await page.goto(`${frontend}/browse`);
  await phoneShot(page, "P02-browse", page.getByRole("article").first());
  await page.getByRole("button", { name: /^Filters/ }).click();
  await phoneShot(page, "P03-browse-filters", page.getByRole("button", { name: "Show rooms" }));

  await page.goto(`${frontend}/browse?neighborhood=Capitol+Hill`);
  await page.getByRole("link", { name: "Capitol Hill 1BR, pets welcome", exact: true }).click();
  await phoneShot(page, "P04-listing", page.getByRole("heading", { level: 1, name: "Capitol Hill 1BR, pets welcome" }));
  // The quick-contact bar stays on screen while reading the top of the page.
  await page.getByRole("region", { name: "Quick contact" }).getByRole("link", { name: "Call" }).waitFor({ timeout: 5000 });
  await page.screenshot({ path: `${outDir}/P04b-listing-first-screen.jpg`, type: "jpeg", quality: 70 });

  await page.goto(`${frontend}/login`);
  await phoneShot(page, "P05-login", page.getByRole("button", { name: "Log in" }));
  await page.goto(`${frontend}/register`);
  await phoneShot(page, "P05b-register-role-cards", page.getByRole("radio", { name: /Rent out a room/ }));
  await page.goto(`${frontend}/register`);
  await phoneShot(page, "P06-register", page.getByRole("heading", { name: /Create/ }));
  await page.goto(`${frontend}/no/such/page`);
  await phoneShot(page, "P07-not-found", page.getByRole("heading", { name: "Page not found" }));

  await logIn(page, "alex.tenant@example.com", "sample-pass-alex", "Welcome back, Alex Nguyen.");
  await page.goto(`${frontend}/my/saved`);
  await phoneShot(page, "P08-saved", page.getByRole("heading", { level: 1, name: "Saved rooms" }));
  // Log out by dropping the stored token (the session lives in sessionStorage).
  await page.evaluate(() => window.sessionStorage.clear());

  // T-218: landlords land on My listings after logging in.
  await logIn(page, "maya.landlord@example.com", "sample-pass-maya", "Basement studio (paused)");
  await phoneShot(page, "P09-my-listings", page.getByRole("article").first());
  await page.goto(`${frontend}/listings/new`);
  await phoneShot(page, "P10-post-form", page.getByRole("button", { name: "Post listing" }));
} finally {
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} phone check(s) failed`);
  process.exit(1);
}
