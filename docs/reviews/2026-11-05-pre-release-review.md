# Pre-release Review — Sprint 1 (`dev → main`)

| Field | Value |
| --- | --- |
| Date | 2026-11-05 |
| Scope | Everything on `dev` since `main` (`954432d`): backend, frontend, CI workflows, scripts, repository contents |
| Requested by | Khai (Product Owner), with five findings of his own (marked **[Khai]**) |
| Reviewer | Claude — this is a **self-review** of Claude's own code; Khai's review of the `dev → main` PR remains the independent review |
| Method | Read every source file; scanned the repository for secrets, generated files, and risky code patterns; wrote tests to reproduce each suspected defect before fixing it; re-ran all CI suites |

Severity: **Blocker** prevents merge; **Major** must be fixed or explicitly accepted before exposure to the Internet; **Minor** should be fixed; **Info** is an observation.

## 1. Summary

| Result | Count |
| --- | --- |
| Fixed in this review | 7 (2 Major defects found by Claude, 2 P1 + 2 P2 from Khai, 1 CI reliability issue) |
| Mitigated, decision needed from Khai | 1 (token lifetime, D-025) |
| Accepted with reasons | 4 |
| Open for later sprints | 4 |
| Blockers remaining | **0** |

All suites pass on the merge candidate (see §6). Nothing found blocks the `dev → main` merge. Before the app is opened to the Internet (Sprint 3), T-114 must be done and D-025 decided.

## 2. Findings and Resolution

### Fixed

| # | Severity | Finding | Location | Resolution and evidence |
| --- | --- | --- | --- | --- |
| F1 | Major | **Registration crashed (HTTP 500) for passwords over 72 bytes but under 72 characters**, e.g. 40 accented letters. BCrypt rejects more than 72 bytes; validation counted characters. | `AuthService.register` | Reproduced first (run 42112969681: expected 400, got 500, `IllegalArgumentException: password cannot be more than 72 bytes`). Now a 400 on `password`. Login with an over-long password is a normal 401. Tests in `AuthIntegrationTest`. |
| F2 | Major **[Khai P1]** | **No login rate limiting**: unlimited password guessing (brute force, credential stuffing). | `AuthService.login` | D-024: 5 failures per email or 20 per client address in 15 minutes → HTTP 429 with Retry-After, checked before the password, applies to unknown emails too, temporary only. 6 unit tests (controllable clock) + 6 integration tests. Run 42113180536. |
| F3 | Major | **An owner opening their hidden listing by URL saw "Listing not found"**: the page fetched before the stored session token was restored. | `ListingDetailPage` | Found by smoke run 42115177435 (check 06) once page checks ran on the production build. Page now waits for the session and reloads when the viewer changes. Regression test added. |
| F4 | Minor **[Khai P1]** | Expired token left the UI "logged in" while every call failed. | `api/client.ts`, `SessionProvider` | A 401 on a request that carried a token now ends the session. Tests in `client.test.ts` and `LandlordPages.test.tsx`. |
| F5 | Minor **[Khai P2]** | Generated file tracked: `scripts/sample-data/__pycache__/load_sample_data.cpython-313.pyc`. | Repository | Removed from tracking; `__pycache__/` and `*.pyc` ignored (T-111). It contained compiled bytecode of a public script, so nothing sensitive was exposed. |
| F6 | Minor **[Khai P2]** | README said "Status: Sprint 0" while STATUS.md said Sprint 1. | `README.md` | README now points to `docs/STATUS.md` as the single status source (T-111). |
| F7 | Minor | Smoke workflow installed a browser and system packages on every run (13+ minutes; one run took 27 minutes, close to the 25-minute job limit). | `.github/workflows/smoke.yml` | Uses the runner's preinstalled Google Chrome; the step now takes about 3 seconds. |

### Mitigated — decision needed

| # | Severity | Finding | Assessment |
| --- | --- | --- | --- |
| M1 | Major **[Khai P1]** | **JWT in `sessionStorage` can be read by JavaScript if an XSS bug exists.** | **No XSS found.** Checked: React escapes all rendered text; no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `document.write`, or `localStorage` anywhere in `frontend/src`; links built from data are limited by server rules (image links must be https with a host; phone numbers allow only digits and `+ ( ) - .`); no third-party scripts. **Added (T-110):** a Content Security Policy in the production build (`script-src 'self'`, `connect-src 'self'`, `object-src 'none'`, photos from https only), verified with zero violations across 15 browser checks; `npm audit` gate (0 runtime advisories); photos load with `referrerPolicy="no-referrer"`. **Remaining risk:** a stolen token stays valid until it expires (24 h), and logout cannot revoke it (stateless JWT). **Decision D-025 for Khai:** keep 24 h, shorten to 2 h (recommended), or move to an httpOnly cookie with CSRF protection. |

### Accepted, with reasons

| # | Severity | Finding | Reason |
| --- | --- | --- | --- |
| A1 | Minor | Registration answers 409 for an existing email, so anyone can check whether an email has an account. | Required by FR-01 AC2. Registration rate limiting (T-113) will make bulk checking slow. |
| A2 | Info | 10 moderate advisories in dev tooling (`minimatch`, GHSA-g3hv-75wg-m249, via ESLint and typescript-eslint). | Only used by the linter on trusted source files, never shipped. The suggested fix downgrades ESLint to the unsupported 9.x. Re-checked on every CI run. |
| A3 | Info | Visitors' browsers load listing photos from whatever host the landlord linked, so that host sees the visitor's IP address. | Inherent to link-only photos (D-017). Referrer is suppressed. File upload (T-404) would remove it. |
| A4 | Info | Concurrent edits to one listing: last write wins. | Recorded in D-021; one owner per listing makes conflicts unlikely. |

### Open for later sprints

| # | Severity | Finding | Plan |
| --- | --- | --- | --- |
| O1 | Major (before going public) | Behind a reverse proxy the backend sees the proxy's address, which would make the per-address login limit apply to everyone at once. HSTS and `frame-ancestors` must be HTTP headers from the host. JSON request bodies have no size limit before parsing. | T-114 with deployment (Sprint 3). |
| O2 | Minor | No automated dependency alerts for the backend (Maven). | **Resolved 2026-11-05**: Khai enabled Dependabot alerts (confirmed by Khai; Claude's token cannot read the alerts API). Dependabot security-update PRs left off so changes still go through `dev`. |
| O3 | Minor | Branch protection on `main` is not configured. | **Resolved 2026-11-05**: ruleset `protect-main` (id 26663656, active, default branch): pull request required (0 approvals), required checks `backend`, `frontend`, `smoke` (made unique in T-206), deletion and force push blocked, no bypass. Read back through the rulesets API. |
| O4 | Info | "My listings" loads amenities and photos with 2 extra queries per listing. | **Resolved in T-201**: collections load in batches of 50; a test asserts at most 5 statements for a page of 12 listings. |

## 3. Areas Checked Without Findings

- **Secrets:** no secrets found in the files on `dev` (pattern scan of every tracked file; history was not scanned). Test-only credentials are labeled as such. `.env` is ignored; CI generates random secrets. The app refuses to start without a JWT secret of at least 32 bytes.
- **Authentication:** HS256 tokens with issuer and expiry checks; tokens signed with another key, from another issuer, expired, or malformed are rejected (tests). Same 401 body for unknown email and wrong password, with equalized timing.
- **Authorization:** role checks in `SecurityConfig`, ownership checks in `ListingService`; hidden listings are indistinguishable from missing ones (tests for each).
- **Input validation:** every request body is validated on the server; image links must be https with a host; neighborhoods and amenities come from fixed lists; prices are integer cents.
- **Error handling:** one JSON error shape; no stack traces or internal messages returned; Spring MVC errors such as an unknown route keep their status (404, tested) instead of becoming 500.
- **Exposure:** only `/actuator/health` is exposed, without details. No CORS is configured, so other sites cannot call the API from a browser.
- **SQL:** Spring Data JPA with parameters only; no string-built queries.

## 4. Branch Comparison (`main` vs `dev`) **[Khai P2]**

- `main` has exactly one commit that `dev` lacks: `954432d`, the merge commit of PR #1. Its tree is identical to `dev` at `bdf5387`, so it carries no content of its own.
- A trial merge of `main` into `dev` produced no conflicts, and the merged tree was identical to `dev`'s tree, so no change on `main` is missing from `dev`.
- T-112 merges `main` into `dev` so the two histories reconnect and the next `dev → main` PR contains only Sprint 1 work. CI must be green on that exact commit before the PR is merged (§6).

## 5. Changes Made by This Review

| Branch | Task | Merged into `dev` |
| --- | --- | --- |
| `fix/T-109-auth-hardening` | F1, F2 | `1139632` |
| `chore/T-110-frontend-security` | F3, F4, F7, M1 mitigations | `f8bd3b6` |
| `chore/T-111-review-cleanup` | F5, F6, decisions D-024 and D-025, this report | `297282e` |
| `chore/T-112-sync-main` | Branch sync (§4) | `4fdfc16` |

## 6. Verification

| Suite | Result | Run |
| --- | --- | --- |
| Backend (69 tests, Spotless) | Passed | 42113180536 |
| Frontend (62 tests, ESLint, Prettier, `tsc`, build, `npm audit` runtime gate) | Passed | 42115527137 |
| Smoke (API, sample data, 15 browser checks on the production build with CSP, no CSP violations) | Passed | 42115527225 |
| All suites on the merge candidate `4fdfc16` | Passed | Backend 42116716315, frontend 42116716376, smoke 42116715397 |

## 7. Decisions and Actions for Khai

1. **D-025 token lifetime:** 24 h, 2 h (recommended), or httpOnly cookie.
2. **Before going public:** T-114 (Sprint 3).
3. **Repository settings:** enable Dependabot alerts (O2) and branch protection on `main` (O3).
4. Review this report and the `dev → main` PR.
