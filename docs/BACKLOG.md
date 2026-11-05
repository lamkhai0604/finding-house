# Product Backlog — Finding House

Authoritative backlog (D-011). States: Proposed → Ready → In Progress → In Review → Done; also Blocked, Awaiting Approval, Cancelled.
Priorities: P1 = blocks the current milestone, P2 = planned, P3 = deferrable.
Acceptance criteria for feature tasks are the referenced SRS criteria plus any listed here. Evidence is added when a task is moved to Done.
Task IDs are stable identifiers; their numbers do not change when work moves between sprints (for example T-3xx now sits in Sprint 4).

## Sprint 0 — Preparation

| ID | Title | Req | Owner | Priority | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | Initialize repo `finding-house` (`main` + `dev`) and push baseline docs to `dev` | — | Khai (initialize `main`), Claude (push to `dev`) | P1 | Done — `main`/`dev` at `4de096d`; docs pushed to `dev` (see `git log dev`) | — | Repo exists; docs on `dev` |
| T-002 | Review and approve SRS + architecture baseline | all | Khai | P1 | Done — all Sprint 0 decisions approved by Khai on 2026-11-05 except D-018 (raised during T-003) | T-001 | Each Proposed decision in DECISIONS.md is Approved, changed, or rejected |
| T-003 | Backend skeleton | — | Claude | P1 | Done — commit `4e5e9a3`, GitHub Actions run 42069891558 (ubuntu-latest, Temurin 21): `mvn -B -ntp verify` → 2 tests passed (Flyway V1 applied on Testcontainers `postgres:16-alpine`; `/actuator/health` 200 UP), Spotless clean, BUILD SUCCESS. Running via `docker compose` verified later by T-008 | T-001 | Spring Boot app starts; `GET /actuator/health` returns UP; Flyway baseline migration runs against Docker Postgres; Spotless check passes; one passing test |
| T-004 | Frontend skeleton | — | Claude | P1 | Done — commit `6d6721a`, GitHub Actions run 42074077400 (ubuntu-latest, Node 22): `npm ci`, ESLint, Prettier check, 3 Vitest tests passed, `tsc -b && vite build` OK. Health indicator calls `/actuator/health` via the Vite dev proxy. Not verified: dev server against a running backend (no browser/backend run in Claude\'s workspace) | T-001 | Vite React TS app builds; ESLint + Prettier pass; calls backend health endpoint in dev |
| T-005 | CI workflow | NFR-08 | Claude | P1 | Done — `backend` and `frontend` workflows run on every push and on PRs into `dev`/`main` (runs 42069891558, 42074077400). Branch protection on `main` is not configured or verified (Khai\'s setting) | T-003, T-004 | GitHub Actions runs backend `mvn verify` and frontend lint + build on every push to `dev`, task branches, and PRs into `main`; result visible in GitHub Actions |
| T-008 | End-to-end smoke workflow: `docker compose` PostgreSQL, backend jar with `.env`, API calls, Vite dev server, headless browser | NFR-08 | Claude | P2 | Done — commit `504c909`, run 42096337624 (ubuntu-latest): PostgreSQL container healthy; backend healthy after 9 s; 6 API checks passed (register 201, duplicate 409, wrong password 401, login 200, `/me` 200 / 401); Chromium (Playwright 1.64.1) showed "API is up", then "API is down" after stopping the backend; screenshots reviewed | T-003, T-004, T-101 | Workflow green; screenshots match |
| T-009 | Synthetic sample data JSON with every API field + idempotent loader script | FR-01, FR-02 | Claude | P2 | Done — commit `998031a`, smoke run 42103027735: 5 users and 12 listings loaded through the API; 8/8 invalid examples returned the expected status and field errors; second load created 0 duplicates. Requested by Khai | T-103 | Loads cleanly twice; invalid examples behave as documented |
| T-006 | Verify LLM free tier and get API key | FR-05, D-008 | Khai (key), Claude (verify docs) | P2 | Deferred to Sprint 4 (D-019) | — | Current model name, limits, and terms checked against the provider's official pages and recorded in D-008; key stored only as a secret, never in the repo |
| T-007 | Add Maven wrapper (`mvnw`) and switch docs/CI to it | — | Claude | P3 | Proposed | Maven Central reachable from workspace | `./mvnw verify` passes locally and in CI |

## Sprint 1 — "A landlord can post a room" ([plan](sprints/sprint-1.md))

| ID | Title | Req | Priority | Status |
| --- | --- | --- | --- | --- |
| T-101 | Auth API: register, login, JWT, `/me` | FR-01 | P2 | Done — commit `6b6f324`, run 42095282281 (ubuntu-latest, Temurin 21): 21 tests passed. FR-01 AC1–AC4 verified; AC5 verified for 401 (missing/malformed/expired/wrong key/wrong issuer); 403 verified later in T-103. Assumptions: tenants cannot store a phone (400; DB check constraint); emails are stripped and lower-cased. Known risk: no login rate limiting or lockout (not in SRS) — see T-108 |
| T-102 | Auth UI: register and login pages | FR-01 | P2 | Done — commit `c8f7187`: frontend run 42108090385 (30 Vitest tests incl. login, logout, session restore, expired token, register with landlord-only phone, 409 email) and smoke run 42108682551 (real browser against the real backend with sample data; 10 page checks + screenshots) |
| T-103 | Listing API: create, edit, hide/unhide, my listings | FR-02 | P2 | Done — commit `5d52800`, backend run 42098935164 (ubuntu-latest, Temurin 21): 51 tests passed (19 listing integration, 11 image-link unit); smoke run 42098935759 green. FR-02 AC1–AC6 verified over HTTP; FR-01 AC5 403 verified (tenant create, non-owner edit/hide, tenant "my listings"). Refinements in D-021 |
| T-104 | Listing image links + placeholder frame | FR-02 | P2 | Done — API in T-103; UI placeholder (no link or failed load) in `ListingImage`, unit-tested and verified in smoke run 42108682551 (screenshots 07, 08) |
| T-105 | Listing detail API + page | FR-04 | P2 | Done — page: commit `c8f7187`, smoke run 42108682551 (screenshots 05–10, incl. hidden listing for owner vs. public, and mobile width). API: commit `32df262`, backend run 42105905522 attempt 2: 57 tests passed (6 new for FR-04 AC1–AC3). Attempt 1 failed before compiling: Maven Central returned HTTP 502 for `spring-boot-actuator:pom:4.1.1` (environment, not code; the smoke run on the same commit built fine), rerun once. Page remains: built with T-102 (both need client-side routing) |
| T-106 | Landlord listing form UI | FR-02 | P2 | Done — commit `e2d2759`: frontend run 42110970580 (58 Vitest tests: create with cents conversion, client and server field errors, edit prefill + PUT, owner-only edit, landlord-only routes, my listings hide/unhide); smoke run 42111365352 (a listing posted, viewed, and hidden through the real UI; 15 page checks). Found and fixed: card photos linked to the raw image file instead of the listing |
| T-108 | Decide on login rate limiting / brute-force protection (needs an SRS change if adopted) | NFR-01 | P3 | Proposed |

## Sprint 2 — "A tenant can find a room"

| ID | Title | Req | Priority | Status |
| --- | --- | --- | --- | --- |
| T-201 | Browse/filter API with validation, sort, pagination | FR-03 | P2 | Proposed |
| T-202 | Browse page with filter panel | FR-03 | P2 | Proposed |
| T-203 | Synthetic seed data generator (dev profile only) | NFR-02, NFR-06 | P2 | Proposed |
| T-204 | Testcontainers integration tests + NFR-02 measurement | FR-03, NFR-02 | P2 | Proposed |

## Sprint 3 — "Go live with the core features" (D-019)

| ID | Title | Req | Priority | Status |
| --- | --- | --- | --- | --- |
| T-401 | Deploy demo on free hosting | NFR-05 | P2 | Proposed (blocked by OQ-05; needs Khai's approval per D-012) |
| T-402 | README with screenshots/GIF, architecture summary, and "what is verified" section | — | P2 | Proposed |
| T-403 | Favorites | FR-06 | P3 | Proposed |
| T-404 | Image file upload to a free storage service (free tier verified first, D-007) | FR-02 | P3 | Proposed |

## Sprint 4 — "Search in plain language" (deferred until core features and UI are done, D-019)

| ID | Title | Req | Priority | Status |
| --- | --- | --- | --- | --- |
| T-301 | `QueryParser` interface + Gemini adapter (timeout, JSON parsing) | FR-05 | P2 | Proposed |
| T-302 | AI search endpoint: validation via `SearchFilter`, rate limit | FR-05 | P2 | Proposed |
| T-303 | AI search UI with editable filter chips | FR-05 | P2 | Proposed |
| T-304 | Failure-path tests: timeout, invalid JSON, not understood, 429 | FR-05, NFR-04 | P2 | Proposed |
