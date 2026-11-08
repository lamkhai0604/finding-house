// T-605 (FR-08): reporting and moderation end to end on the local stack, desktop and phone.
// A tenant reports a sample listing, the administrator removes it with a reason, it disappears for
// visitors, its landlord sees the reason, and the administrator restores it.
// Needs the backend started with ADMIN_EMAILS=moderator.smoke@example.com and that tenant account
// created before the start (the smoke workflow does both). Local stack only, never live.
// Usage: FRONTEND_URL=http://localhost:4173 API_URL=http://localhost:8080 node moderation.mjs <dir>
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const frontend = (process.env.FRONTEND_URL ?? "").replace(/\/+$/, "");
const api = (process.env.API_URL ?? "").replace(/\/+$/, "");
const outDir = process.argv[2];
if (!frontend || !api || !outDir) {
  console.error("usage: FRONTEND_URL=... API_URL=... node moderation.mjs <screenshot dir>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const TITLE = "Budget room in Northgate";
const REASON = "Asked tenants to pay a deposit by wire transfer";
let failures = 0;

function check(name, ok, detail = "") {
  if (ok) console.log(`ok   ${name}`);
  else {
    failures += 1;
    console.error(`FAIL ${name} ${detail}`);
  }
}

async function shot(page, name) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: `${outDir}/${name}.jpg`, type: "jpeg", quality: 70, fullPage: true });
}

async function logIn(page, email, password, landing) {
  await page.goto(`${frontend}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  try {
    await page.waitForURL((url) => url.pathname === landing, { timeout: 15000 });
  } catch (error) {
    await page.screenshot({ path: `${outDir}/login-failed-${landing.replaceAll("/", "_")}.jpg`, type: "jpeg", quality: 70 });
    throw new Error(`login as ${email} stayed on ${new URL(page.url()).pathname}, expected ${landing}`, { cause: error });
  }
}

const search = await fetch(`${api}/api/v1/listings?neighborhood=Northgate&size=50`).then((r) => r.json());
const target = search.items.find((l) => l.title === TITLE);
if (!target) {
  console.error(`FAIL setup: "${TITLE}" not found`);
  process.exit(1);
}
const status = () => fetch(`${api}/api/v1/listings/${target.id}`).then((r) => r.status);

const browser = await chromium.launch({ channel: "chrome" });
const desktop = { viewport: { width: 1200, height: 800 } };
try {
  // 1. A tenant reports the listing.
  const tenant = await (await browser.newContext(desktop)).newPage();
  await logIn(tenant, "alex.tenant@example.com", "sample-pass-alex", "/");
  await tenant.goto(`${frontend}/listings/${target.id}`);
  await tenant.getByRole("button", { name: "Report this listing" }).click();
  const dialog = tenant.getByRole("dialog", { name: "Report this listing" });
  await dialog.getByRole("radio", { name: "Scam or fraud" }).check();
  await dialog.getByLabel("Details (optional)").fill("The landlord asked for a deposit by wire before any viewing.");
  await shot(tenant, "M01-report-dialog");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await tenant.getByText("Thanks. A moderator will review this listing.").waitFor();
  check("M01: tenant sent a report", true);

  // 2. The administrator lands on the queue and removes the listing.
  const adminContext = await browser.newContext(desktop);
  const admin = await adminContext.newPage();
  await logIn(admin, "moderator.smoke@example.com", process.env.MODERATOR_PASSWORD, "/admin");
  const card = admin.getByRole("article").filter({ hasText: TITLE });
  await card.waitFor();
  check("M02: admin lands on Moderation with the report", (await card.textContent()).includes("1 report"));
  await shot(admin, "M02-admin-queue");
  await card.getByRole("button", { name: "Remove listing" }).click();
  const remove = admin.getByRole("dialog", { name: "Remove this listing?" });
  await remove.getByLabel("Reason shown to the landlord").fill(REASON);
  await shot(admin, "M03-remove-dialog");
  await remove.getByRole("button", { name: "Remove listing" }).click();
  await admin.getByText(`"${TITLE}" was removed.`).waitFor();
  await admin.getByText("No open reports").waitFor();
  await shot(admin, "M04-admin-after-remove");
  check("M04: removed listing is 404 for visitors", (await status()) === 404);

  // 3. Its landlord sees the reason and no way to change it.
  const owner = await (await browser.newContext(desktop)).newPage();
  await logIn(owner, "omar.landlord@example.com", "sample-pass-omar", "/my/listings");
  const ownerCard = owner.getByRole("article").filter({ hasText: TITLE });
  await ownerCard.getByText("Removed by a moderator.").waitFor();
  check("M05: landlord sees the reason", (await ownerCard.textContent()).includes(REASON));
  check("M05: landlord has no buttons on it", (await ownerCard.getByRole("button").count()) === 0);
  await shot(owner, "M05-owner-removed");

  // 4. The moderation page on a phone.
  const phone = await (
    await browser.newContext({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })
  ).newPage();
  await logIn(phone, "moderator.smoke@example.com", process.env.MODERATOR_PASSWORD, "/admin");
  await phone.getByRole("table").waitFor();
  const wide = await phone.evaluate(() => document.documentElement.scrollWidth);
  check("M06: moderation page fits 375 px", wide <= 376, `scrollWidth=${wide}`);
  await shot(phone, "M06-admin-phone");

  // 5. The administrator restores it (back as hidden for its owner).
  await admin.reload();
  const row = admin.getByRole("listitem").filter({ hasText: TITLE });
  await row.getByRole("button", { name: "Restore" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
  await admin.getByText(`"${TITLE}" was restored as hidden.`).waitFor();
  // The table reloads after the toast; wait for the new row before reading it.
  await admin.getByRole("cell", { name: "Restored", exact: true }).waitFor();
  const table = await admin.getByRole("table").textContent();
  check("M07: actions record shows Removed and Restored", table.includes("Removed") && table.includes("Restored"));
  await shot(admin, "M07-admin-restored");
} catch (error) {
  failures += 1;
  console.error(`FAIL ${error.message.split("\n")[0]}`);
} finally {
  await browser.close();
}
console.log(`${failures} failure(s)`);
process.exit(failures ? 1 : 0);
