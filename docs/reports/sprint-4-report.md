# Sprint 4 Report — "Looks finished"

| Field | Value |
| --- | --- |
| Project | Finding House |
| Sprint | 4 ([plan](../sprints/sprint-4.md)) |
| Period | 2026-11-06 (planned 2026-11-06 → 2026-11-20; finished early) |
| Product Owner / reviewer | Khai (lamkhai0604) |
| Implementer | Claude |
| Result | **Goal met.** The approved "along the line" design (D-033) is on every page. T-208 to T-215 are live through PR #9 and pass the live checks; T-216 and T-217 are on `dev`, waiting for the next `dev → main` merge. The demo content is ready; loading it on the live site waits for Khai (secret + approval) |

## 1. Summary

The goal was to make the app look and feel finished before adding AI search (D-032). Every page now follows the approved design (D-033): neighborhoods as stops on a Link 1 Line-style strip, listings as tickets, and the Lagoon palette with Archivo and Public Sans. The only API change is one public, read-only endpoint, `GET /api/v1/neighborhoods`, which gives the home page real room counts and the lowest rent per stop.

Two items were added during the sprint. T-215 needed demo content without public passwords, so the demo accounts get their password from a GitHub secret. T-217 came from the live-site review: there was no feedback while a page waited for the server. A full-screen loader was considered and rejected in favour of a progress line plus a "waking up the server" notice, because the free backend sleeps and most waits are short.

The smoke run caught two real bugs before merge. Changing the sort on Browse dropped amounts typed in the filter panel (T-211). An old CSS rule squeezed the rent field on phones below 480 px (T-216).

## 2. Delivered Work

| Task | What was delivered | Verified | In `main` |
| --- | --- | --- | --- |
| T-208 | Lagoon design tokens, self-hosted Archivo and Public Sans, new brand mark and favicon, a title on every page | Frontend and smoke on the task branch | Yes (PR #9) |
| T-209 | Header with a 1200 px row; dark footer with the API status | Frontend 42232796181, smoke 42232796240 | Yes |
| T-210 | Home page: hero with Seattle skyline and a collage of the two newest real rooms, search form, the 1 Line strip with real counts (new `GET /api/v1/neighborhoods`), "Just posted" tickets, how it works | Backend 42233683068 (121 tests, 2 new), frontend 42235521732, smoke 42235521669 | Yes |
| T-211 | Browse: colour band with count and sort, filter panel with the mini line and amenity chips (instant), typed amounts on Show rooms, ticket results with a save heart; Saved rooms as tickets | Frontend 42241047086, smoke 42241677130 | Yes |
| T-212 | Listing page: photo grid by photo count, facts strip, amenity icons, "Getting around" (neighboring stations, or a plain note when there is none), sticky contact card | Frontend 42244852717, smoke 42244852659 | Yes |
| T-213 | Landlord form in four sections with a live ticket preview; My listings with counts of shown and hidden rooms | Frontend 42257458123, smoke 42257458137 | Yes |
| T-214 | Toasts for post, save, hide, unhide, delete; shared empty state for 404, not found, no results, nothing saved, no listings | Frontend 42259260286, smoke 42259829394 | Yes |
| T-215 | Demo content: 8 fictional listings, 16 Unsplash photos checked one by one, loader through the public API with the password from a secret, manual `demo-data` workflow (D-034) | Smoke 42262894914 | Yes (not yet loaded live) |
| T-217 | Progress line at the top while anything waits for the server; "waking up the server" notice after 4 s | Frontend 42267283890, smoke 42267632522 | No (on `dev`) |
| T-216 | Phone pass: 10 pages at 375 px checked for sideways scrolling in every smoke run; vertical 1 Line on phones; quick contact bar on the listing page; rent field fix | Frontend 42269788245, smoke 42269787959 | No (on `dev`) |

## 3. Verification Evidence

| Suite | What it covers | Result | Run |
| --- | --- | --- | --- |
| Backend `mvn verify` | 121 tests on Testcontainers PostgreSQL, incl. neighborhood counts that ignore hidden rooms | 121/121 passed | 42233683068 |
| Frontend | 139 Vitest tests in 22 files; ESLint; Prettier; build checks | 139/139 passed | 42269788245 |
| Smoke | About 35 browser checks on the production build calling the API cross-origin, incl. a held API request for the loading notice; demo content loaded twice with its photos rendered; 10 phone pages at 375 px | All passed | 42269787959 |
| Live | 14 HTTP checks and 5 browser checks against the deployed site after PR #9 | All passed | 42265013560 |

**Not verified:** a real phone (only headless Chrome at 375 px); the demo content on the live site (not loaded yet); screen readers beyond the roles and labels the tests query.

## 4. Decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-033 | "Along the line" design, Lagoon palette, Archivo and Public Sans | Approved by Khai (before the sprint) |
| D-034 | Demo content through the public API, password in a GitHub secret, Unsplash photos checked one by one | Approved (plan); the live run waits for Khai |
| — | T-217 instead of a full-screen loader: a progress line and a waking-up notice; skeletons stay | Approved by Khai, 2026-11-06 |

## 5. Problems and How They Were Handled

| Problem | Found by | Handling |
| --- | --- | --- |
| On Browse, changing the sort before pressing Show rooms dropped amounts typed in the filter panel | Smoke run on T-211 | The panel now resets only when the filters in the URL change, and its applies keep the band's sort. A unit test covers it |
| Below 480 px, the rent and area fields shared the photo row's `4rem` column, so the rent field was tiny | Phone screenshots in T-216 | Separate rules; the phone script now checks every page for sideways scrolling |
| The mini line could not fit seven stop names at 375 px without breaking words | Phone screenshots in T-216 | Hidden on phones: the Neighborhood list does the same job, and the home page shows the whole line vertically |
| Tests found the live preview's heading instead of the listing page's after posting | Unit test failure in T-213 | The test asks for the page's `h1`. The preview is not a link and never sent |
| A local copy of `origin/dev` was stale, so `dev` looked like it lacked a migration before PR #9 | Claude's pre-merge check | Compared through the GitHub API: `dev` was 47 commits ahead, 0 behind, no migrations. Nothing to fix |
| 17 failed CI runs on task branches (formatting, lint, test selectors, one script launch option) | CI | All fixed on the branch before merging; none reached `dev` or `main` |

## 6. Not Done / Carried Over

- **Load the demo content on the live site:** Khai adds the `DEMO_PASSWORD` secret, then runs (or asks Claude to run) the `demo-data` workflow. See [DEMO-CONTENT.md](../DEMO-CONTENT.md).
- **Next `dev → main` merge** for T-216 and T-217: Khai.
- **T-404** image upload: later, after its free tier is verified.
- **T-007** Maven wrapper: still blocked by the workspace's network access.

## 7. Metrics

| Metric | Value |
| --- | --- |
| Tasks done | 9 planned (T-208 to T-216) plus T-217 added during the sprint |
| Non-merge commits since Sprint 3 in `main` (`d24fcf1`) | 45 (on `dev`) |
| Files changed in the sprint | 72 (+4,962 / −1,141 lines) |
| Automated tests | 260 (backend 121, frontend 139), up from 244; about 35 browser checks and 10 phone pages in smoke; 19 live checks |
| CI runs on 2026-11-06 | 100 (81 passed, 17 failed on task branches before merging, 2 cancelled or running) |
| Running cost | $0 (Unsplash photos are free under their license; nothing paid) |

## 8. Next Sprint

**Sprint 5 — AI search** (FR-05, D-019, D-032), proposed:
- **T-006:** check an LLM provider's current free tier and terms. Khai creates the API key.
- **T-301:** `QueryParser` with a timeout and strict JSON parsing.
- **T-302:** the AI search endpoint, validated through the same `SearchFilter` as the manual filters, with its own rate limit.
- **T-303:** the search box on the new home and browse pages, showing the understood filters as editable chips.
- **T-304:** failure-path tests (timeout, invalid JSON, not understood, 429), so manual search always keeps working (NFR-04).

Before Sprint 5, Khai's actions:
1. Add the `DEMO_PASSWORD` secret and approve the demo-data run.
2. Merge `dev → main` (T-216, T-217 and this report go live).
3. Approve the Sprint 5 plan and choose the LLM provider after Claude's free-tier check.
