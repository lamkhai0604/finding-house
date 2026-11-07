# Sprint 1 Report — "A landlord can post a room"

| Field | Value |
| --- | --- |
| Project | Finding House |
| Sprint | 1 ([plan](../sprints/sprint-1.md)) |
| Period | 2026-11-05 (planned 2026-11-05 → 2026-11-19; finished early) |
| Product Owner / reviewer | Khai (lamkhai0604) |
| Implementer | Claude |
| Result | **Goal met on `dev`** at `5d0bf80`. Not yet in `main`: waiting for Khai's `dev → main` review |

## 1. Summary

The goal was that a landlord can register, log in, and post a listing with photo links, and that anyone can open the listing's page. All six planned tasks (T-101 to T-106) are done, verified on GitHub Actions, and merged into `dev`. Two tasks were added by the Product Owner during the sprint: an end-to-end smoke workflow (T-008) and synthetic sample data (T-009). The smoke workflow now runs the app the way a developer does (Docker Compose database, backend jar, Vite dev server) and drives a real browser through 15 page checks, including posting and hiding a listing through the UI.

Independent review has not happened yet: every merge into `dev` was self-reviewed, as recorded in each merge commit. Khai's review of the `dev → main` PR is the independent review for this sprint.

## 2. Delivered Work

| Task | What was delivered | Requirement | Verified | Merged to `dev` | In `main` |
| --- | --- | --- | --- | --- | --- |
| T-101 | Register, login, `/me`; JWT (HS256, 24 h, issuer-checked); BCrypt; one JSON error shape | FR-01 | Backend run 42095282281 | Yes | No |
| T-103 | Create, edit, hide/unhide listings; "my listings"; reference data endpoint | FR-02 | Backend run 42098935164 | Yes | No |
| T-104 | Image links (https only, max 5) and placeholder for missing or broken photos | FR-02 AC2, AC7 | Backend run 42098935164; smoke run 42108682551 | Yes | No |
| T-105 | Public listing detail with landlord name and phone; hidden listings 404 except for the owner | FR-04 | Backend run 42105905522; smoke run 42108682551 | Yes | No |
| T-102 | Sign-up and login pages; session kept in memory + `sessionStorage`; logout | FR-01 | Frontend run 42108090385; smoke run 42108682551 | Yes | No |
| T-106 | Post a room, Edit, My listings with hide/unhide; landlord-only pages | FR-02 | Frontend run 42110970580; smoke run 42111365352 | Yes | No |
| T-008 | Smoke workflow: Compose PostgreSQL, backend jar, API script, Vite dev server, headless Chromium, screenshots | NFR-08 | Run 42096337624, then every run since | Yes | No |
| T-009 | Sample data JSON (5 users, 12 listings, 8 invalid requests) and an idempotent loader | FR-01, FR-02 | Smoke run 42103027735 | Yes | No |

Released: nothing deployed (deployment is Sprint 3).

## 3. Verification Evidence

Latest results on the sprint's final `dev` commit and the last runs of each suite:

| Suite | What it covers | Result | Run |
| --- | --- | --- | --- |
| Backend `mvn verify` | 57 tests: auth (15), listings (19), listing detail (6), image-link rules (11), startup (2), JWT config (4); real PostgreSQL via Testcontainers; Spotless | 57/57 passed | 42105905522 (attempt 2) |
| Frontend | 58 Vitest tests across 10 files; ESLint; Prettier; `tsc` + Vite build | 58/58 passed | 42110970580 |
| Smoke | API script (6 checks), sample data load ×2 with 8 invalid examples, 15 browser page checks, API up/down indicator | All passed | 42111760191 on `5d0bf80` |

All 11 CI runs on `dev` during the sprint passed. No test was disabled or weakened.

**FR coverage.** FR-01 AC1–AC5, FR-02 AC1–AC7, and FR-04 AC1–AC3 each have at least one automated test over HTTP against a real database. The 403 case of FR-01 AC5 was verified once the first role-restricted endpoint existed (T-103).

**Not verified:** behaviour on a real phone (only a 375 px headless browser); screen-reader use beyond the accessibility queries the tests rely on.

## 4. Decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-019 | AI search (FR-05) moves to the last sprint, after the core features and UI | Approved |
| D-020 | A sprint report like this one at the end of every sprint | Approved |
| D-021 | Listing API refinements: image links in the listing body, `GET /api/v1/reference-data`, no client-sent city, prices in integer cents, last-write-wins edits | Approved |
| D-022 | React Router for frontend routing (installed: 8.5.1) | Approved |
| D-023 | Reusable components first: shared UI lives in `frontend/src/components`, with tests | Approved |

Full log: [DECISIONS.md](../DECISIONS.md).

## 5. Problems and How They Were Handled

CI failed 10 times during the sprint, all on task branches and all before merging. Each failure was either a real defect (fixed in code) or a check that needed to follow an intended change.

| Problem | Found by | Handling |
| --- | --- | --- |
| A pasted email with surrounding spaces was rejected as invalid | Backend test, run 42095055938 | Fixed in code: the email is stripped before validation |
| Each listing card had two links named after the listing, and the photo opened the raw image file | Frontend test, run 42110478040 | Fixed in code: card and preview photos are no longer links |
| A smoke page check could pass on text left over from the previous page | Reviewing screenshot 11 of run 42110970948 | Each check now waits for the target page first |
| Session restore called `setState` synchronously inside an effect | ESLint (`react-hooks`), run 42107784031 | Effect rewritten to set state only in promise callbacks |
| A test helper had an `unknown` error type | `tsc`, run 42107944621 | Typed helper added |
| The old smoke check looked for the previous home-page heading | Smoke runs on the T-102 branch | Check updated to the new heading (intended change) |
| Prettier differences | CI format check | Applied from the diff CI prints |
| Maven Central returned HTTP 502 | Backend run 42105905522, attempt 1 | Environment issue (the smoke run built the same commit); rerun once |
| Claude's workspace cannot reach npm or GitHub artifact storage | Adding React Router | CI resolved the dependency and printed the lockfile; the copy was checked by SHA-256 |
| GitHub masked a test string that looked like a token in the CI log | Applying a Prettier patch | Restored by hand before applying |

## 6. Not Done / Carried Back

- **T-007** Maven wrapper: still blocked by the workspace's network access.
- **T-108** Login rate limiting: open decision for Khai; not in the SRS.
- **T-404** Image file upload: planned for Sprint 3, free tier to be verified first.
- **Technical debt** (WORKFLOW.md): TypeScript kept on 5.9; the smoke workflow reinstalls Playwright on every run (up to 13 minutes once); harmless CI warnings.
- **Branch protection on `main`**: still not configured; a repository setting for Khai.

## 7. Metrics

| Metric | Value |
| --- | --- |
| Planned tasks done | 6 of 6 (plus 2 added tasks) |
| Task branches merged into `dev` | 9 (7 task branches + 2 docs) |
| Non-merge commits since `main` | 25 |
| Files changed since `main` | 102 (+6,799 / −84 lines) |
| Automated tests | 115 (backend 57, frontend 58), plus 15 browser page checks and 6 API smoke checks |
| CI runs during the sprint | 37 (24 passed, 10 failed on task branches, 3 still running at count time); all on `dev` passed |

## 8. Next Sprint

**Sprint 2 — "A tenant can find a room"** (FR-03): browse/filter API with validation, sorting, and pagination (T-201); a browse page with a filter panel reusing `ListingCard` (T-202); a synthetic data generator for performance checks (T-203); Testcontainers integration tests and the NFR-02 measurement (p95 < 500 ms with 10,000 listings) (T-204).

Before Sprint 2 starts, Khai's actions:
1. Review `dev` and merge the `dev → main` PR (the sprint's independent review).
2. Optional: decide on T-108 (login rate limiting).
