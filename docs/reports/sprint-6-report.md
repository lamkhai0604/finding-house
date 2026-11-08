# Sprint 6 Report — "Keep the site clean" (moderation)

| Field | Value |
| --- | --- |
| Project | Finding House |
| Sprint | 6 ([plan](../sprints/sprint-6.md)) |
| Period | 2026-11-07 (planned 1 week; code finished the same day) |
| Product Owner / reviewer | Khai (lamkhai0604) |
| Implementer | Claude |
| Result | **Code complete.** Reporting and moderation (FR-08) are on `dev` with backend, frontend and browser tests. Live use needs one setting on Render (T-606) |

## 1. Summary

Signed-in users can report a listing with a reason. An administrator sees the reports grouped by listing and can remove the listing with a reason, dismiss the reports, or restore a removed listing. A removed listing disappears for everyone except its landlord, who sees the reason and cannot change it. Every action is written to a record that the database itself refuses to change or delete.

There is no public way to become an administrator. An existing tenant account is promoted when the backend starts, from the `ADMIN_EMAILS` setting on the host (D-036).

## 2. Delivered Work

| Task | What was delivered | Verified |
| --- | --- | --- |
| T-601 | V5 migration: role `ADMIN`, status `REMOVED` with a required reason (database check), `listing_reports` with a partial unique index for one open report per user and listing, `moderation_actions` made append-only by a trigger. Startup promotion from `ADMIN_EMAILS` (tenants only, counts in the log, never addresses). Owners cannot edit, unhide, delete or set `REMOVED` | Backend runs 42432207596, 42433366168 |
| T-602 | `POST /api/v1/listings/{id}/reports`: signed-in only, not one's own listing, active listings only, one open report per listing, 10 per day with Retry-After | Backend run 42432231144 |
| T-603 | Admin API under `/api/v1/admin/**`, ADMIN only: queue, removed listings, recent actions, remove, restore (as hidden), dismiss; each action and its record in one transaction | Backend run 42432368426, including a permission matrix for every endpoint and role |
| T-604 | Report dialog on the listing page, removed state in My listings, `/admin` page, Admin badge and menu link, admins start on `/admin` | Frontend run 42433035828 (154 tests) |
| T-605 | Smoke flow `moderation.mjs` with a smoke-only administrator; docs | Smoke run 42433657800 (M01 to M07, desktop and phone) |

## 3. Verification Evidence

| Suite | Result | Run |
| --- | --- | --- |
| Backend `mvn verify` | 168 passed (1 skipped: the manual AI evaluation) | 42433366168 |
| Frontend | 154 passed | 42433035828 |
| Smoke | All passed, including report → remove → 404 for visitors → landlord sees the reason → restore, and the moderation page at 375 px | 42433657800 |

## 4. Decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-036 | ADMIN granted only by `ADMIN_EMAILS` at startup | Approved |
| D-037 | Moderators remove (reversible), never delete | Approved |
| D-038 | Only signed-in users report, with limits | Approved |

## 5. Problems and How They Were Handled

| Problem | Found by | Handling |
| --- | --- | --- |
| Startup promotion logged "1 promoted" but the account stayed a tenant | Smoke run (the integration tests called the method through Spring's proxy and passed) | The startup method called the transactional method on the same object, so no transaction applied and the change was never written. Each promotion is now saved explicitly, and a test calls it the way startup does |
| An existing test used `ADMIN` as an example of an unknown role | Backend run 42431985545 | The test now uses a role that does not exist; the refusal of `ADMIN` at sign-up has its own test |
| A smoke check read the actions table before it reloaded | Smoke run | The check waits for the new row |

## 6. Not Done / Carried Over

- **T-606:** Khai signs up a tenant account for moderation on the live site, then sets `ADMIN_EMAILS` to its address on Render.
- Not planned: banning users, notifications, appeals, photo upload (T-404).

## 7. Metrics

| Metric | Value |
| --- | --- |
| Tasks done | T-601 to T-605 |
| Automated tests | 322 (backend 168, frontend 154), up from 291 |
| New endpoints | 7 |
| Running cost | $0 |
