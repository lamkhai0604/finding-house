// T-102/T-105: visits the main pages with sample data loaded (T-009), checks what each page
// shows, and saves a JPEG screenshot of each one for review.
// Usage: node page-screenshots.mjs <output dir>   (run where the `playwright` package is installed)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const outDir = process.argv[2];
const frontend = process.env.FRONTEND_URL ?? "http://localhost:5173";
const backend = process.env.BACKEND_URL ?? "http://localhost:8080";
const MAYA = { email: "maya.landlord@example.com", password: "sample-pass-maya" };

if (!outDir) {
  console.error("usage: node page-screenshots.mjs <output dir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

async function listingIdsByTitle() {
  const ids = {};
  for (const [email, password] of [
    [MAYA.email, MAYA.password],
    ["omar.landlord@example.com", "sample-pass-omar"],
  ]) {
    const login = await fetch(`${backend}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const { accessToken } = await login.json();
    const mine = await fetch(`${backend}/api/v1/me/listings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    for (const listing of await mine.json()) ids[listing.title] = listing.id;
  }
  return ids;
}

const ids = await listingIdsByTitle();
// The runner's installed Google Chrome (see smoke.yml).
const browser = await chromium.launch({ channel: "chrome" });
let failures = 0;
const cspViolations = [];

/** T-110: any Content Security Policy violation in the browser fails the run. */
function watchForCspViolations(page) {
  page.on("console", (message) => {
    const text = message.text();
    if (/Content Security Policy|Refused to (load|execute|apply|connect)/i.test(text)) {
      cspViolations.push(text);
    }
  });
}

// D-027: My listings and Log out live in the avatar menu.
async function openAccountMenu(page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
}

// `ready` (optional) is a locator that must appear first, so a check never passes on text left
// over from the previous page while the next one is still loading.
async function shot(page, name, expectedText, ready) {
  try {
    if (ready) await ready.waitFor({ timeout: 15000 });
    await page.getByText(expectedText, { exact: false }).first().waitFor({ timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({ path: `${outDir}/${name}.jpg`, type: "jpeg", quality: 70, fullPage: true });
    console.log(`ok   ${name}: shows "${expectedText}"`);
  } catch (error) {
    failures += 1;
    await page.screenshot({ path: `${outDir}/${name}-FAILED.jpg`, type: "jpeg", quality: 70 });
    console.error(`FAIL ${name}: expected "${expectedText}": ${error.message.split("\n")[0]}`);
  }
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await desktop.newPage();
  watchForCspViolations(page);

  // T-122: the home carousel shows the newest real listings (never the hidden one), and a slide
  // opens that listing.
  await page.goto(`${frontend}/`);
  const newest = page.getByRole("region", { name: "Newest rooms" });
  await shot(page, "01-home-logged-out", "/month ·", newest);
  try {
    if ((await newest.getByText("Basement studio (paused)").count()) > 0) {
      throw new Error("the hidden listing is in the carousel");
    }
    const firstSlide = newest.getByRole("link").first();
    const title = (await firstSlide.locator("strong").textContent()) ?? "";
    await firstSlide.click();
    await page.getByRole("heading", { level: 1, name: title }).waitFor({ timeout: 15000 });
    console.log(`ok   01b-carousel-opens-listing: "${title}"`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL 01b-carousel-opens-listing: ${error.message.split("\n")[0]}`);
  }

  await page.goto(`${frontend}/register`);
  await page.getByLabel("Account type").selectOption("LANDLORD");
  await shot(page, "02-register-landlord", "Contact phone (optional)");

  await page.goto(`${frontend}/login`);
  await page.getByLabel("Email").fill(MAYA.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await shot(page, "03-login-wrong-password", "Invalid email or password");

  await page.getByLabel("Password").fill(MAYA.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await shot(page, "04-home-logged-in", "Welcome back, Maya Chen.");

  await page.goto(`${frontend}/listings/${ids["Capitol Hill 1BR, pets welcome"]}`);
  await shot(page, "05-detail-five-photos", "Capitol Hill 1BR, pets welcome");

  await page.goto(`${frontend}/listings/${ids["Basement studio (paused)"]}`);
  await shot(page, "06-detail-hidden-owner-view", "Hidden — only you can see this");

  // T-106: landlord flows through the UI.
  await openAccountMenu(page);
  await page.getByRole("link", { name: "My listings" }).click();
  await shot(
    page,
    "11-my-listings",
    "Basement studio (paused)",
    page.getByRole("heading", { name: "My listings" }),
  );

  // T-123: hovering a secondary button changes its background.
  const editButton = page.getByRole("link", { name: "Edit", exact: true }).first();
  const background = () =>
    editButton.evaluate((el) => getComputedStyle(el).backgroundColor);
  const before = await background();
  await editButton.hover();
  await page.waitForTimeout(250);
  const after = await background();
  if (before === after) {
    failures += 1;
    console.error(`FAIL 11b: hover did not change the Edit button (${before})`);
  } else {
    console.log(`ok   11b: hover changes the Edit button (${before} -> ${after})`);
  }
  await page.screenshot({
    path: `${outDir}/11c-hover-edit-button.jpg`,
    type: "jpeg",
    quality: 70,
    clip: { x: 0, y: 0, width: 1200, height: 420 },
  });

  await page.goto(`${frontend}/listings/${ids["Sunny studio near UW"]}/edit`);
  await shot(
    page,
    "12-edit-listing-form",
    "Edit listing",
    page.getByLabel("Title"),
  );

  await page.goto(`${frontend}/listings/new`);
  await page.getByLabel("Title").fill("Posted from the UI");
  await page.getByLabel("Monthly rent (USD)").fill("1,450.75");
  await page.getByLabel("Area (sq ft)").fill("380");
  await page.getByLabel("Neighborhood").selectOption("Fremont");
  await page.getByLabel("Street address").fill("3500 Example Ave N, Seattle, WA");
  await page.getByLabel("Description (optional)").fill("Created by the smoke test.");
  await page.getByLabel("Wi-Fi").check();
  await page.getByLabel("Kitchen").check();
  await page.getByRole("button", { name: "Add photo link" }).click();
  await page.getByLabel("Photo link 1").fill("https://picsum.photos/seed/fh-ui-1/800/600");
  await shot(page, "13-new-listing-form-filled", "Post a room");
  await page.getByRole("button", { name: "Post listing" }).click();
  await shot(
    page,
    "14-new-listing-created",
    "$1,450.75",
    page.getByRole("heading", { name: "Posted from the UI" }),
  );

  await openAccountMenu(page);
  await page.getByRole("link", { name: "My listings" }).click();
  const newCard = page
    .getByRole("article")
    .filter({ hasText: "Posted from the UI" });
  await newCard.getByRole("button", { name: "Hide" }).click();
  await shot(
    page,
    "15-my-listings-after-hide",
    "Posted from the UI",
    newCard.getByRole("button", { name: "Unhide" }),
  );

  // T-120: delete asks first, then removes the card.
  await newCard.getByRole("button", { name: "Delete" }).click();
  await shot(
    page,
    "16-delete-confirm-dialog",
    "cannot be undone",
    page.getByRole("dialog", { name: "Delete this listing?" }),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete listing" })
    .click();
  await newCard.waitFor({ state: "detached", timeout: 15000 });
  console.log("ok   16b: deleted listing card removed");

  await openAccountMenu(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await page.goto(`${frontend}/listings/${ids["Fremont room, no photos yet"]}`);
  await shot(page, "07-detail-no-photos", "No photo yet");

  await page.goto(`${frontend}/listings/${ids["Queen Anne view studio"]}`);
  await shot(page, "08-detail-broken-photo-link", "No photo yet");

  await page.goto(`${frontend}/listings/${ids["Basement studio (paused)"]}`);
  await shot(page, "09-detail-hidden-public-view", "Listing not found");

  // T-202: browse page against the real API.
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`ok   ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${name}: ${error.message.split("\n")[0]}`);
    }
  };
  const priceOf = (text) => Number(text.replace(/[^0-9.]/g, ""));
  const browseResults = page.locator(".browse-results");
  await page.goto(`${frontend}/`);
  await page.getByRole("banner").getByRole("link", { name: "Browse rooms" }).click();
  await shot(page, "18-browse-all", "rooms found", page.getByRole("heading", { name: "Browse rooms" }));
  await check("18b: hidden listing is not listed", async () => {
    await browseResults.getByRole("article").first().waitFor();
    if ((await browseResults.getByText("Basement studio (paused)").count()) > 0) {
      throw new Error("hidden listing shown");
    }
  });

  await page.getByLabel("Max rent ($)").fill("1500");
  await page.getByLabel("Sort by").selectOption("price_asc");
  await page.getByRole("button", { name: "Show rooms" }).click();
  await page.waitForURL(/maxPrice=1500/);
  await shot(page, "19-browse-filtered", "rooms found", browseResults.getByRole("article").first());
  await check("19b: filtered prices are at most $1,500 and ascending", async () => {
    const prices = (await browseResults.locator(".listing-card-price").allTextContents()).map(
      (text) => priceOf(text.split("/")[0]),
    );
    if (prices.length === 0) throw new Error("no results");
    if (prices.some((p) => p > 1500)) throw new Error(`price above max: ${prices}`);
    if (prices.some((p, i) => i > 0 && p < prices[i - 1])) throw new Error(`not ascending: ${prices}`);
  });
  await check("19c: the URL restores the filters after a reload", async () => {
    await page.reload();
    await browseResults.getByRole("article").first().waitFor({ timeout: 15000 });
    const max = await page.getByLabel("Max rent ($)").inputValue();
    if (max !== "1500") throw new Error(`max rent field is "${max}"`);
  });

  await page.getByLabel("Min rent ($)").fill("2000");
  await page.getByRole("button", { name: "Show rooms" }).click();
  await shot(page, "20-browse-invalid-range", "Must be at least the minimum price.");

  const mobile = await browser.newContext({ viewport: { width: 375, height: 740 }, isMobile: true });
  const phone = await mobile.newPage();
  watchForCspViolations(phone);
  await phone.goto(`${frontend}/listings/${ids["Sunny studio near UW"]}`);
  await shot(phone, "10-detail-mobile", "Sunny studio near UW");

  // D-027: mobile header menu.
  await phone.getByRole("button", { name: "Menu" }).click();
  await shot(
    phone,
    "17-mobile-menu-open",
    "Sign up",
    phone.getByRole("link", { name: "Sign up" }),
  );

  await phone.goto(`${frontend}/browse`);
  await shot(phone, "21-browse-mobile", "rooms found", phone.getByRole("heading", { name: "Browse rooms" }));
} finally {
  await browser.close();
}

if (cspViolations.length > 0) {
  console.error(`FAIL ${cspViolations.length} CSP violation(s):`);
  for (const text of cspViolations) console.error(`  ${text}`);
  failures += 1;
} else {
  console.log("ok   no Content Security Policy violations");
}

if (failures > 0) {
  console.error(`${failures} page check(s) failed`);
  process.exit(1);
}
console.log("page screenshots done");
