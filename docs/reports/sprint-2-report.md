# Sprint 2 Report — "A tenant can find a room"

| Field | Value |
| --- | --- |
| Project | Finding House |
| Sprint | 2 ([plan](../sprints/sprint-2.md)) |
| Period | 2026-11-05 (planned 2026-11-05 → 2026-11-19; finished early) |
| Product Owner / reviewer | Khai (lamkhai0604) |
| Implementer | Claude |
| Result | **Goal met on `dev`** at `74c6114`. Partly in `main`: Khai merged PR #3 (`e3bee15`, up to T-122); T-202 onwards waits for the next `dev → main` review |

## 1. Summary

The goal was that a tenant can browse and filter active listings, and that the app feels finished. Both parts are done. Tenants have a browse page with filters for neighborhood, rent range, minimum area, and required amenities, three sort orders, and pages of 12. The filters live in the URL, so a search can be shared or reloaded. The home page now shows the newest real listings. Landlords can delete a listing after confirming. Every page has a header, footer, back button where it makes sense, loading placeholders, and hover/focus states.

The performance target was measured, not assumed: with 10,000 listings, the 95th-percentile browse response is **40.8 ms** against a target of 500 ms (NFR-02). The plans show that PostgreSQL scans 10,000 rows in 2–4 ms, so no index was added.

All planned tasks are done, plus two added at Khai's request (T-123 hover states, T-205 folding the filters on phones). Independent review has not happened yet: every merge into `dev` was self-reviewed, as recorded in each merge commit. Khai reviewed and merged PR #3 (everything up to T-122) during the sprint; the next `dev → main` PR completes this sprint's independent review.

## 2. Delivered Work

| Task | What was delivered | Requirement | Verified | Merged to `dev` | In `main` |
| --- | --- | --- | --- | --- | --- |
| T-121 | Access tokens last 2 hours instead of 24 | D-025 | Backend run 42122297693 | Yes | Yes (PR #3) |
| T-120 | Owner-only permanent delete; confirmation dialog that names the listing | FR-07, D-026 | Backend 42122526491, frontend 42123201689, smoke 42123201730 | Yes | Yes (PR #3) |
| T-115–T-119 | Back button (warns about unsaved changes), loading skeletons and busy spinners, consistent buttons, footer, header with avatar menu and phone menu | D-027 | Frontend 42123750933, smoke 42123751179 | Yes | Yes (PR #3) |
| T-123 | Hover, pressed, and keyboard-focus states on every clickable element (added) | D-027 | Frontend 42125141917, smoke 42125141843 | Yes | Yes (PR #3) |
| T-201 | Public `GET /api/v1/listings`: price, neighborhood, area, and amenity filters; three sorts; pagination with totals; field-level 400s | FR-03 | Backend 42128660324 | Yes | Yes (PR #3) |
| T-122 | Home carousel shows the 8 newest real listings, each linking to its page | FR-03, D-027 | Frontend 42129758228, smoke 42129758285 | Yes | Yes (PR #3) |
| T-202 | `/browse` page: filter panel, sort, pages, filters in the URL, errors explained before sending | FR-03 | Frontend 42135480928, smoke 42135480822 | Yes | No |
| T-205 | On phones the filters fold behind a "Filters (N active)" button so results come first (added) | FR-03, D-027 | Frontend 42141051469, smoke 42141051453 | Yes | No |
| T-203 | Dev-profile generator for up to 100,000 synthetic listings, deterministic, safe outside dev | NFR-02, D-028 | Backend 42141631858 | Yes | No |
| T-204 | NFR-02 measurement with 10,000 listings, printed with query plans in every backend build | NFR-02 | Backend 42142023037 | Yes | No |

Released: nothing deployed. Deployment is Sprint 3 (see §8).

## 3. Verification Evidence

| Suite | What it covers | Result | Run |
| --- | --- | --- | --- |
| Backend `mvn verify` | 94 tests: auth (21), login throttle (6), listings (19), listing service (11), detail (6), delete (5), browse (12), synthetic data (6), performance (1), startup (3), JWT config (4); real PostgreSQL via Testcontainers; Spotless | 94/94 passed | 42142023037 (branch); 42142216291 on `dev` at `74c6114` |
| Frontend | 102 Vitest tests in 15 files; ESLint; Prettier; `tsc` + Vite build | 102/102 passed | 42141051469 |
| Smoke | API script, sample data loaded twice with 8 invalid examples, 27 browser checks on the dev server and the production build with CSP, API up/down indicator | All passed | 42142023013 (branch); 42142216423 on `dev` at `74c6114` |

**NFR-02 (browse speed).** 10,000 synthetic listings in PostgreSQL 16 on a GitHub Actions runner; 40 warm-up requests, then 400 timed requests over HTTP, one at a time, mixing every filter and sort:

| Query type | p50 ms | p95 ms | max ms |
| --- | --- | --- | --- |
| Newest first | 11.3 | 17.6 | 20.2 |
| One neighborhood | 10.5 | 13.6 | 16.1 |
| Price range | 9.7 | 17.4 | 20.1 |
| Two amenities | 39.9 | 46.2 | 52.4 |
| Combined filters | 12.5 | 18.4 | 20.3 |
| Price sort | 10.1 | 17.4 | 21.0 |
| Deep page (page 300–700) | 15.9 | 21.0 | 22.3 |
| 50 per page | 14.6 | 20.0 | 24.3 |
| **All 400** | **12.8** | **40.8** | **52.4** |

Two-amenity searches are the slowest because each listing is checked against its amenity rows. They are still 10× under the target, so this is noted, not changed.

**FR coverage.** FR-03 AC1–AC5 and FR-07 each have integration tests over HTTP against a real database, and browser checks against the real API: the smoke run filters by maximum rent and checks every price returned and their order, confirms hidden listings never appear, and reloads the page to confirm the URL keeps the filters.

**Not verified:** many users at once (the measurement sends one request at a time); a real phone (only a 375 px headless browser); screen readers beyond the accessibility queries the tests use.

## 4. Decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-025 | Access tokens last 2 hours (option b) | Approved |
| D-026 | Landlords can permanently delete their own listings after confirming | Approved |
| D-027 | UI polish: back buttons, loading states, button styling, footer, header menus, carousel | Approved |
| D-028 | Synthetic data is generated by the backend, only under the `dev` profile | Approved with T-203; approach chosen by Claude, open for review on the PR |

Full log: [DECISIONS.md](../DECISIONS.md). No new dependencies were added in this sprint.

## 5. Problems and How They Were Handled

CI failed 10 times during the sprint, all on task branches and all before merging. Every run on `dev` passed.

| Problem | Found by | Handling |
| --- | --- | --- |
| "My listings" ran 2 extra queries per listing (review finding O4) | Pre-release review | Fixed in T-201: collections load in batches; a test asserts at most 5 SQL statements per page |
| A public request sent with an expired stored token could fail with 401 | Reasoning during T-122 | The home and browse pages wait for the stored token to be checked first; tested |
| With the API down, a smoke locator matched two status messages | Smoke run 42129481189 | The check reads the health status from the footer only (same check, narrower scope) |
| The Max rent box overflowed the filter column; the first fix stretched the checkboxes | Reviewing smoke screenshots before merging T-202 | Fixed twice in CSS, both caught before merge |
| A test called a package-private method | Backend run on the T-204 branch | Method made public |
| Prettier differences | CI format check | Applied from the diff CI prints |
| A docs script stopped part-way, so README and STATUS missed the T-201 update while the merge went ahead | Checking the result | Completed on a separate docs branch (`docs/T-201-status-readme`) the same hour |
| GitHub rejected pushes for a few minutes (`fatal error in commit_refs`) | Push output | Server-side GitHub issue; retried until it went through, nothing lost |

Process slip carried from the start of the sprint: one docs commit (`0e48902`) was pushed directly to `dev` without a task branch. It was reported to Khai at the time; every change since has used a task branch.

## 6. Not Done / Carried Over

- **Deployment (Sprint 3).** Khai asked about Vercel. Proposal for review: frontend on Vercel Hobby, backend on Render free (Docker; sleeps after 15 minutes idle), database on Neon free, all $0. Needs T-114 first: trust forwarded client addresses only from the known proxy (otherwise every user shares one address and the login limit could block everyone; review finding O1), security headers, secrets on the hosting dashboards. Deployment needs Khai's approval.
- **T-113** Registration rate limit; **T-114** deployment security (above).
- **T-007** Maven wrapper: still blocked by the workspace's network access.
- **T-404** Image upload: later, after its free tier is verified.
- ~~Repository settings (review findings O2, O3)~~: done by Khai at the end of the sprint. Dependabot alerts are on, and ruleset `protect-main` requires a pull request and the `backend`, `frontend`, and `smoke` checks (named uniquely in T-206).
- **Backend in Node.js?** Khai asked whether the backend could move to Node later. Answer given: possible, and the API smoke checks would prove the two backends behave the same, but it would cost about a sprint of rework; recommended to finish Sprints 3–4 in Java first. No decision recorded.

## 7. Metrics

| Metric | Value |
| --- | --- |
| Planned tasks done | 11 of 11 (plus 2 added: T-123, T-205) |
| Branches merged into `dev` | 12 (10 task branches + 2 docs) |
| Non-merge commits in the sprint (since Sprint 1 in `main`, `620d7f3`) | 29 |
| Files changed in the sprint | 73 (+4,588 / −179 lines) |
| Automated tests | 196 (backend 94, frontend 102), plus 27 browser checks and the API smoke script; up from 115 |
| CI runs during the sprint | 62 (50 passed, 10 failed on task branches, 2 still running at count time); all completed runs on `dev` passed |
| NFR-02 | p95 40.8 ms with 10,000 listings (target < 500 ms) |

## 8. Next Sprint

**Sprint 3 — "Go live"** (proposed, needs Khai's approval): T-114 deployment security, then deploy the frontend, backend, and database on free tiers; run the smoke checks against the live URL; T-113 registration rate limit. After that, Sprint 4 is AI search (FR-05, D-019).

Before Sprint 3 starts, Khai's actions:
1. Review `dev` and merge a `dev → main` PR for the rest of the sprint (T-202 onwards).
2. Approve or change the hosting proposal in §6, and create the Vercel, Render, and Neon accounts (Claude cannot sign up on Khai's behalf).
