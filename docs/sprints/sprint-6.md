# Sprint 6 — "Keep the site clean" (moderation)

| Field | Value |
| --- | --- |
| Goal | Signed-in users can report a listing; an administrator reviews reports, removes or restores listings, and every moderation action is recorded. Needed before the site is promoted beyond a demo |
| Dates | 2026-11-08 → 2026-11-15 (1 week, proposed) |
| Requirements | FR-08 (new, below), NFR-01; D-036 to D-038 (proposed) |
| Tasks | T-601 to T-606 |
| Approved | Pending: Khai |

## FR-08 — Reporting and moderation (Should)

1. A signed-in tenant or landlord can report another user's active listing with a reason (Scam or fraud, Wrong information, No longer available, Offensive, Other) and an optional note of up to 500 characters. One open report per user per listing; at most 10 reports per user per day.
2. An administrator sees open reports grouped by listing (number of reports, reasons, newest first) and can **remove** the listing, **dismiss** the reports, or open the listing.
3. A removed listing disappears from browse, AI search and favorites. Its landlord still sees it in My listings, marked "Removed by a moderator" with the reason, and cannot unhide or edit it. An administrator can restore it.
4. Every remove, restore and dismiss is recorded with the administrator, time, listing and reason; the record is never edited or deleted.
5. Administrator accounts cannot be created through sign-up or any public endpoint.

## Decisions (proposed)

| ID | Decision | Alternatives | Why |
| --- | --- | --- | --- |
| D-036 | **ADMIN role, granted by configuration**: `ADMIN_EMAILS` (comma-separated, set only on the host) lists existing accounts; at startup the backend promotes them to `ADMIN` and logs how many (not who). Removing an email does not demote automatically; demotion is a documented manual step | Admin sign-up code; a database script run by hand; a separate admin app | No public path to admin; no database access needed from GitHub; one setting on Render |
| D-037 | **Remove = a new listing status `REMOVED`**, reversible by an administrator; no hard delete by moderators | Hard delete; reuse `HIDDEN` | Mistakes can be undone; the landlord cannot undo a moderator's decision, which they could with `HIDDEN` |
| D-038 | **Only signed-in users can report**, with per-user limits | Anonymous reports | Anonymous reports are easy to flood; accounts already have sign-up limits (D-031) |

## Plan

| Task | What | Acceptance |
| --- | --- | --- |
| T-601 | V5 migration: role `ADMIN`, status `REMOVED`, `listing_reports`, `moderation_actions`. `ADMIN_EMAILS` promotion at startup | Migration test on Testcontainers; admin cannot be chosen at sign-up (400); promotion test |
| T-602 | `POST /api/v1/listings/{id}/reports`: reason enum, note ≤ 500, one open report per user per listing (409), 10 per user per day (429), not on your own listing (403) | Integration tests for each rule and each role; guests get 401 |
| T-603 | Admin API under `/api/v1/admin/**` (ADMIN only): report queue, remove (reason required), restore, dismiss; each writes a `moderation_actions` row in the same transaction | Permission matrix test: every admin endpoint returns 403 for tenant and landlord, 401 for guests; removed listings are absent from browse, interpret results, favorites and detail (404 for others, visible to owner and admins) |
| T-604 | Frontend: "Report this listing" on the detail page (dialog with reasons), "Removed by a moderator" state in My listings, Admin page `/admin` (queue, actions with confirmation), "Admin" role badge and menu link | Vitest for each state; smoke: report → admin removes → gone from browse → restore; desktop and phone screenshots |
| T-605 | Demo and docs: a demo administrator for the smoke stack only (never on the live site, D-034); ARCHITECTURE, SRS FR-08, README | Docs updated; live site gets an administrator only through `ADMIN_EMAILS` |
| T-606 | Live enablement: Khai sets `ADMIN_EMAILS` to his own account on Render | live-smoke still green; Khai can open `/admin` |

## Risks

| Risk | Mitigation |
| --- | --- |
| A new role widens what a stolen token can do | 2-hour tokens (D-025); admin endpoints in one URL prefix with one rule; permission-matrix test |
| Report flooding | Signed-in only, one open report per listing, daily limit |
| Removed content still reachable | Status checked in the repository queries used by browse, detail, favorites and AI search, with a test for each |

## Out of scope

Banning users, email notifications, an appeal flow, photo upload (T-404).
