# Sprint 3 Report — "Go live"

| Field | Value |
| --- | --- |
| Project | Finding House |
| Sprint | 3 ([plan](../sprints/sprint-3.md)) |
| Period | 2026-11-05 (planned 2026-11-05 → 2026-11-19; finished early) |
| Product Owner / reviewer | Khai (lamkhai0604) |
| Implementer | Claude |
| Result | **Goal met.** The app is live at **https://finding-house.vercel.app** (API https://finding-house.onrender.com), and the live checks pass. Everything through T-207 is in `main` (PR #7); T-402 and T-403 are on `dev`, waiting for the next `dev → main` merge |

## 1. Summary

The goal was to put the app on the public internet at no cost, with the same kind of checks that run in CI passing against the live URLs. It is live on Vercel (frontend), Render (backend, Docker), and Neon (PostgreSQL), all on free plans. A manual `live-smoke` workflow checks the live site: API health and auth, CORS, the host's security headers, the page's CSP, client-side routing, and the home and browse pages in Chrome at desktop and phone sizes.

Getting there needed one design change, reported to Khai when it was found: the browser now calls the backend directly instead of through a Vercel rewrite (D-030). Through a rewrite, Render would see Vercel's servers as every user's address, and Render passes `X-Forwarded-For` through unchanged, so it can be forged. The backend now reads the client address only from `CF-Connecting-IP`, which Cloudflare sets in front of every Render service, and the login and sign-up limits key on it.

All planned tasks are done, and both stretch tasks were added at Khai's request: a README for visitors (T-402) and favorites (T-403, FR-06). Khai's review of the live site produced five UI fixes (T-207). Independent review happened through Khai's merges of PR #6 and PR #7; T-402 and T-403 are self-reviewed on `dev` until the next merge.

## 2. Delivered Work

| Task | What was delivered | Requirement | Verified | In `main` |
| --- | --- | --- | --- | --- |
| T-114a | Client address from `CF-Connecting-IP` when configured (never `X-Forwarded-For`); CORS for exact frontend origins only, checked at startup; 413 over 64 KB; `PORT`; small DB pool; `backend/Dockerfile` (non-root, fits 512 MB); smoke runs the image | NFR-01, NFR-05, D-030 | Backend 42153629641, smoke 42153629649 | Yes (PR #6) |
| T-114b | `VITE_API_BASE_URL` at build time; CSP allows exactly that origin (the build fails on anything else); `vercel.json` with SPA routing and security headers incl. `frame-ancestors`; smoke runs the production build cross-origin | NFR-01, NFR-05 | Frontend 42154410104, smoke 42154410160 | Yes (PR #6) |
| T-113 | Sign-up limit: 10 attempts per address per hour, duplicates included (D-031) | FR-01, NFR-01 | Backend 42154962043, frontend 42154962010 | Yes (PR #6) |
| T-401 | Deployment guide (`docs/DEPLOYMENT.md`); Khai deployed through the dashboards | NFR-05, D-029 | Live since 2026-11-05 | — |
| T-405 | `live-smoke` workflow and scripts, self-tested in every smoke run | NFR-05, NFR-08 | Live run 42168599403 | Yes (PR #7; wording fix on `dev`) |
| T-207 | Khai's review of the live site: Sign up text vanished on hover; one main action on the home page; Back on log-in and sign-up; money and area boxes with the unit inside and thousands separators; empty-state wording | D-027, FR-02, FR-03 | Frontend 42166845797, smoke 42166845789 | Yes (PR #7) |
| T-206 | Unique CI check names (`backend`, `frontend`, `smoke`) so `main` can require them | Review O3 | Runs 42142824394, 42142824388 | Yes (PR #6) |
| T-402 | README for visitors: live links, screenshots, what works and what is planned, architecture diagram, highlights with real figures | — | Documentation | No (on `dev`) |
| T-403 | Favorites: tenant-only API (idempotent save, hidden listings drop out, own list only, 200 max), Save buttons on browse and listing pages, Saved rooms page | FR-06 | Backend 42169385441, frontend 42169652230, smoke 42169798299 | No (on `dev`) |

Repository settings done by Khai at the start of the sprint: Dependabot alerts and the `protect-main` ruleset (pull request and the three checks required). That closes review findings O2 and O3.

## 3. Verification Evidence

| Suite | What it covers | Result | Run |
| --- | --- | --- | --- |
| Backend `mvn verify` | 119 tests on Testcontainers PostgreSQL, incl. a deployment-like context (CORS, `CF-Connecting-IP`, 413, sign-up limit) and favorites | 119/119 passed | 42169385441 |
| Frontend | 125 Vitest tests; ESLint; Prettier; build; deployed-style build checks (CSP origin, bad URL refused, `vercel.json`) | 125/125 passed | 42169652230 |
| Smoke | Backend Docker image under 512 MB; API script; sample data ×2; ~30 browser checks on the production build calling the API cross-origin; tenant saves and unsaves a room; the live-check scripts against the local stack | All passed | 42169798299 |
| Live | 14 HTTP checks and 5 browser checks against the deployed site | All passed | 42168599403 |

**Not verified:** many users at once; behaviour after the free backend restarts mid-session (tokens survive, rate-limit counters reset); a real phone (only headless Chrome at 375 px).

## 4. Decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-029 | Free hosting: Vercel, Render (Docker), Neon | Approved by Khai |
| D-030 | Browser calls the API directly with CORS; client address from `CF-Connecting-IP` only when configured | Approved (technical choice within the approved plan; reported to Khai when found) |
| D-031 | Sign-up limit: 10 attempts per address per hour | Approved with T-113; numbers adjustable |

## 5. Problems and How They Were Handled

| Problem | Found by | Handling |
| --- | --- | --- |
| A Vercel rewrite would hide every user behind Vercel's address, and `X-Forwarded-For` on Render can be forged | Research while preparing T-114 | Design changed to D-030 before any code; tests send a forged `X-Forwarded-For` and the limit still holds |
| **The Neon password appeared in a screenshot of the Render log**: it had been pasted inside `DB_URL`, and the driver's error printed the URL | Reading the screenshot Khai sent | Khai reset the password and updated Render the same evening (confirmed). The guide now says how to split the connection string and to hide passwords in screenshots. A merge note had stated the reset before Khai confirmed it; corrected in `DEPLOYMENT.md` |
| First deploys failed: the template word `HOST` pasted into `DB_URL`; then credentials inside `DB_URL`; then a `CORS_ALLOWED_ORIGINS` value that was not an exact origin | Render logs Khai sent | Each fixed in the dashboard; all three added to the guide's troubleshooting table. The CORS one was the startup check doing its job |
| Sign up text vanished on hover (a generic `a:hover` rule recoloured button links) | Khai, on the live site | Fixed in T-207; smoke now checks the colours on hover |
| Vite writes `'self'` as `&#39;self&#39;`, so the CSP grep failed on a correct policy | Frontend and smoke runs on the T-114b branch | Check accepts both forms |
| The live check still expected the old empty-state sentence after T-207 | `live-smoke` run on `main` after PR #7 | Script updated and re-run green against the live site (42168599403) |
| `npx neon skills -y` and Neon's agent setup prompt | Khai's requests | Not run: the workspace cannot reach npm, and the setup prompt assumes a Node.js app and pulls the database password into a local file; the dashboards were used instead |
| Prettier differences (several branches) | CI format check | Applied from the diff CI prints |

## 6. Not Done / Carried Over

- **Next `dev → main` merge** for T-402 (README) and T-403 (favorites): Khai.
- **T-404** image upload: later, after its free tier is verified.
- **T-007** Maven wrapper: still blocked by the workspace's network access.
- **Known limits of the free setup:** the backend sleeps after 15 idle minutes (about a minute to wake); rate-limit counters are in memory and reset when it restarts.

## 7. Metrics

| Metric | Value |
| --- | --- |
| Planned tasks done | 5 of 5 (T-114a, T-114b, T-113, T-401, T-405), plus T-206, T-207, and both stretch tasks (T-402, T-403) |
| Branches merged into `dev` | 14 (excluding syncs from `main`) |
| Non-merge commits since Sprint 2 in `main` (`362a598`) | 28 |
| Files changed in the sprint | 77 (+2,976 / −255 lines) |
| Automated tests | 244 (backend 119, frontend 125), up from 196; ~30 browser checks in smoke; 19 live checks |
| CI runs during the sprint | 52 (42 passed, 7 failed, 3 running at count time). Failures: 6 on task branches before merging, 1 live check on `main` (outdated sentence, fixed) |
| Running cost | $0 |

## 8. Next Sprint

**Sprint 4 — AI search** (FR-05, D-019), proposed: T-006 verify an LLM free tier and get an API key (Khai creates the key; Claude checks the current terms and limits first); T-301 `QueryParser` with timeout and strict JSON parsing; T-302 the AI search endpoint, validated through the same `SearchFilter` as manual filters, with its own rate limit; T-303 the search box with editable filter chips; T-304 failure-path tests (timeout, invalid JSON, not understood, 429), so manual search always keeps working (NFR-04).

Before Sprint 4, Khai's actions:
1. Merge `dev → main` (T-402, T-403 go live).
2. Post a few real rooms on the live site, so it has content for demos.
3. Approve the Sprint 4 plan and choose the LLM provider after Claude's free-tier check.
