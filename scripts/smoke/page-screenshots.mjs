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

  // T-122 / T-210: "Just posted" shows the newest real listings (never the hidden one) as tickets,
  // and a ticket opens that listing. The 1 Line strip shows real room counts.
  await page.goto(`${frontend}/`);
  const newest = page.getByRole("region", { name: "Just posted" });
  const line = page.getByRole("region", { name: "Rooms along the 1 Line" });
  await shot(page, "01-home-logged-out", " a month", newest.getByRole("article").first());
  try {
    if ((await newest.getByText("Basement studio (paused)").count()) > 0) {
      throw new Error("the hidden listing is in Just posted");
    }
    const counts = await line.getByText(/^\d+ rooms?$/).count();
    if (counts === 0) throw new Error("no stop on the 1 Line shows a room count");
    console.log(`ok   01a-line-counts: ${counts} stops show a room count`);
    const firstTicket = newest.getByRole("article").first().getByRole("link");
    const title = (await firstTicket.textContent()) ?? "";
    await firstTicket.click();
    await page.getByRole("heading", { level: 1, name: title }).waitFor({ timeout: 15000 });
    console.log(`ok   01b-ticket-opens-listing: "${title}"`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL 01b-ticket-opens-listing: ${error.message.split("\n")[0]}`);
  }

  // T-210: the hero search opens browse with the neighborhood and max rent filled in.
  await page.goto(`${frontend}/`);
  {
    const form = page.getByRole("form", { name: "Search rooms" });
    await form.getByLabel("Neighborhood").selectOption("Capitol Hill");
    await form.getByLabel("Max rent per month").fill("3000");
    await form.getByRole("button", { name: "Search rooms" }).click();
    await shot(page, "01d-home-search-to-browse", "Capitol Hill 1BR, pets welcome");
    const url = new URL(page.url());
    if (url.searchParams.get("neighborhood") !== "Capitol Hill" || url.searchParams.get("maxPrice") !== "3000") {
      failures += 1;
      console.error(`FAIL 01d: browse opened with ${url.search}`);
    }
  }
  await page.goto(`${frontend}/`);

  // T-207: a primary button link keeps readable text on hover (it used to turn the same green as
  // its hover background).
  {
    const signUp = page.getByRole("banner").getByRole("link", { name: "Sign up" });
    await signUp.hover();
    await page.waitForTimeout(250);
    const [color, background] = await signUp.evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.color, style.backgroundColor];
    });
    if (color === background) {
      failures += 1;
      console.error(`FAIL 01c: Sign up text disappears on hover (${color} on ${background})`);
    } else {
      console.log(`ok   01c: Sign up stays readable on hover (${color} on ${background})`);
    }
  }

  await page.goto(`${frontend}/register`);
  // T-218: the account type is two cards (native radios); tenant is the default.
  await shot(page, "02a-register-role-cards", "Rent out a room");
  await page.getByRole("radio", { name: /Rent out a room/ }).check();
  await shot(page, "02-register-landlord", "Contact phone (optional)");

  // T-220: a real sign-up ends with a confirmation of the account type.
  await page.getByLabel("Name").fill("Smoke Signup");
  await page.getByLabel("Email").fill(`signup-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("smoke-signup-password");
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.getByText("Your landlord account is ready.").waitFor();
  await page.waitForTimeout(400); // let the toast finish fading in
  await shot(page, "02b-signup-confirmed", "Your landlord account is ready.");
  await page.evaluate(() => window.sessionStorage.clear());

  await page.goto(`${frontend}/login`);
  await page.getByLabel("Email").fill(MAYA.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await shot(page, "03-login-wrong-password", "Invalid email or password");

  await page.getByLabel("Password").fill(MAYA.password);
  await page.getByRole("button", { name: "Log in" }).click();
  // T-218: a landlord starts on My listings, and the header shows the role.
  await shot(page, "04-landlord-login-my-listings", "Basement studio (paused)");
  {
    const badge = page.getByRole("banner").getByText("Landlord", { exact: true });
    if (await badge.isVisible()) {
      console.log("ok   04b: header shows the Landlord role badge");
    } else {
      failures += 1;
      console.error("FAIL 04b: no Landlord role badge in the header");
    }
  }

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
  await page.getByLabel("Monthly rent").fill("1,450.75");
  await page.getByLabel("Area").fill("380");
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
  // T-214: a toast confirms the post. It is fixed to the screen, so take the viewport only.
  try {
    const toasts = page.getByRole("region", { name: "Notifications" });
    await toasts.getByText("Your room is posted.").waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${outDir}/14b-toast-posted.jpg`, type: "jpeg", quality: 70 });
    console.log('ok   14b-toast-posted: shows "Your room is posted."');
  } catch (error) {
    failures += 1;
    console.error(`FAIL 14b-toast-posted: ${error.message.split("\n")[0]}`);
  }

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

  // T-214: an unknown address shows the not-found page with ways back.
  await page.goto(`${frontend}/no/such/page`);
  await shot(page, "09b-page-not-found", "This stop is not on our line");

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

  await page.getByLabel("Rent up to").fill("1500");
  await page.getByLabel("Sort by").selectOption("price_asc");
  await page.getByRole("button", { name: "Show rooms" }).click();
  await page.waitForURL(/maxPrice=1500/);
  await shot(page, "19-browse-filtered", "rooms found", browseResults.getByRole("article").first());
  await check("19b: filtered prices are at most $1,500 and ascending", async () => {
    const prices = (await browseResults.locator(".ticket-price").allTextContents()).map(priceOf);
    if (prices.length === 0) throw new Error("no results");
    if (prices.some((p) => p > 1500)) throw new Error(`price above max: ${prices}`);
    if (prices.some((p, i) => i > 0 && p < prices[i - 1])) throw new Error(`not ascending: ${prices}`);
  });
  await check("19c: the URL restores the filters after a reload", async () => {
    await page.reload();
    await browseResults.getByRole("article").first().waitFor({ timeout: 15000 });
    const max = await page.getByLabel("Rent up to").inputValue();
    if (max !== "1,500") throw new Error(`max rent field is "${max}"`);
  });

  // T-211: a stop on the mini 1 Line filters by its neighborhood at once.
  await check("19d: a stop on the mini line filters by neighborhood", async () => {
    await page.goto(`${frontend}/browse`);
    await page
      .getByRole("group", { name: "Stops on the 1 Line" })
      .getByRole("button", { name: "Capitol Hill" })
      .click();
    await page.waitForURL(/neighborhood=Capitol\+Hill/);
    // The old results stay until the new ones arrive, so wait for the filtered list itself.
    let stops = [];
    for (let tries = 0; tries < 30; tries += 1) {
      stops = await browseResults.locator(".ticket-stop").allTextContents();
      if (stops.length > 0 && stops.every((t) => t.startsWith("Capitol Hill"))) break;
      await page.waitForTimeout(500);
    }
    if (stops.length === 0 || stops.some((t) => !t.startsWith("Capitol Hill"))) {
      throw new Error(`results outside Capitol Hill: ${stops}`);
    }
  });
  await page.goto(`${frontend}/browse?maxPrice=1500&sort=price_asc`);
  await browseResults.getByRole("article").first().waitFor({ timeout: 15000 });

  await page.getByLabel("Rent from").fill("2000");
  await page.getByRole("button", { name: "Show rooms" }).click();
  await shot(page, "20-browse-invalid-range", "Must be at least the minimum price.");

  // T-403 (FR-06): a tenant saves a room, finds it under Saved rooms, and unsaves it.
  await page.goto(`${frontend}/login`);
  await page.getByLabel("Email").fill("alex.tenant@example.com");
  await page.getByLabel("Password").fill("sample-pass-alex");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByText("Welcome back, Alex Nguyen.").waitFor({ timeout: 15000 });
  const room = "Green Lake one-bedroom";
  await page.goto(`${frontend}/browse`);
  const saveButton = page.getByRole("button", { name: `Save ${room}` });
  await check("23a: tenant saves a room from the browse page", async () => {
    await saveButton.waitFor({ timeout: 15000 });
    if ((await saveButton.getAttribute("aria-pressed")) === "true") {
      await saveButton.click(); // left over from an earlier run on the same database
      await page.waitForFunction(
        (name) => document.querySelector(`[aria-label="${name}"]`)?.getAttribute("aria-pressed") === "false",
        `Save ${room}`,
      );
    }
    await saveButton.click();
    await page.waitForFunction(
      (name) => document.querySelector(`[aria-label="${name}"]`)?.getAttribute("aria-pressed") === "true",
      `Save ${room}`,
    );
  });
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("link", { name: "Saved rooms" }).click();
  await shot(page, "23-saved-rooms", room, page.getByRole("heading", { name: "Saved rooms" }));
  await check("23b: unsaving removes the room from Saved rooms", async () => {
    await page.getByRole("button", { name: `Save ${room}` }).click();
    await page.getByRole("heading", { name: "No saved rooms yet" }).waitFor({ timeout: 15000 });
  });
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("button", { name: "Log out" }).click();

  // T-217: when the server is slow (the free backend waking up), a progress line runs along the
  // top and, after 4 s, a notice explains why. Simulated by holding the browse request for 6 s.
  try {
    await page.route("**/api/v1/listings?*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      await route.continue();
    });
    await page.goto(`${frontend}/browse`);
    if ((await page.locator('.nav-progress[data-state="loading"]').count()) !== 1) {
      throw new Error("no progress line while the page loads");
    }
    await page.getByText("Waking up the server").waitFor({ timeout: 5500 });
    await page.screenshot({ path: `${outDir}/24-slow-server-notice.jpg`, type: "jpeg", quality: 70 });
    await page.getByRole("article").first().waitFor({ timeout: 15000 });
    if ((await page.getByText("Waking up the server").count()) !== 0) {
      throw new Error("the notice stayed after the results arrived");
    }
    console.log("ok   24-slow-server-notice: progress line, notice after 4 s, gone once loaded");
  } catch (error) {
    failures += 1;
    console.error(`FAIL 24-slow-server-notice: ${error.message.split("\n")[0]}`);
  } finally {
    await page.unroute("**/api/v1/listings?*");
  }

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

  // T-205: on a phone the filters start folded behind a button, so results come first.
  await phone.goto(`${frontend}/browse`);
  await shot(phone, "21-browse-mobile", "rooms found", phone.getByRole("heading", { name: "Browse rooms" }));
  await check("21b: phone filters start folded", async () => {
    if (await phone.getByLabel("Rent up to").isVisible()) throw new Error("filter panel is open");
  });
  await phone.getByRole("button", { name: "Filters" }).click();
  await shot(phone, "22-browse-mobile-filters-open", "Show rooms", phone.getByLabel("Rent up to"));
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
