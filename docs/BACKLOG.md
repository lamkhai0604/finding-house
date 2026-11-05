# Product Backlog — Finding House

Authoritative backlog (D-011). States: Proposed → Ready → In Progress → In Review → Done; also Blocked, Awaiting Approval, Cancelled.
Priorities: P1 = blocks the current milestone, P2 = planned, P3 = deferrable.
Acceptance criteria for feature tasks are the referenced SRS criteria plus any listed here. Evidence is added when a task is moved to Done.

## Sprint 0 — Preparation

| ID | Title | Req | Owner | Priority | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | Initialize repo `finding-house` (`main` + `dev`) and push baseline docs to `dev` | — | Khai (initialize `main`), Claude (push to `dev`) | P1 | Done — `main`/`dev` at `4de096d`; docs pushed to `dev` (see `git log dev`) | — | Repo exists; docs on `dev` |
| T-002 | Review and approve SRS + architecture baseline | all | Khai | P1 | Done — all Sprint 0 decisions approved by Khai on 2026-11-05 except D-018 (raised during T-003) | T-001 | Each Proposed decision in DECISIONS.md is Approved, changed, or rejected |
| T-003 | Backend skeleton | — | Claude | P1 | Done — commit `4e5e9a3`, GitHub Actions run 42069891558 (ubuntu-latest, Temurin 21): `mvn -B -ntp verify` → 2 tests passed (Flyway V1 applied on Testcontainers `postgres:16-alpine`; `/actuator/health` 200 UP), Spotless clean, BUILD SUCCESS. Not verified: running against `docker compose` locally (no Docker daemon in Claude's workspace) | T-001 | Spring Boot app starts; `GET /actuator/health` returns UP; Flyway baseline migration runs against Docker Postgres; Spotless check passes; one passing test |
| T-004 | Frontend skeleton | — | Claude | P1 | Done — commit `6d6721a`, GitHub Actions run 42074077400 (ubuntu-latest, Node 22): `npm ci`, ESLint, Prettier check, 3 Vitest tests passed, `tsc -b && vite build` OK. Health indicator calls `/actuator/health` via the Vite dev proxy. Not verified: dev server against a running backend (no browser/backend run in Claude\'s workspace) | T-001 | Vite React TS app builds; ESLint + Prettier pass; calls backend health endpoint in dev |
| T-005 | CI workflow | NFR-08 | Claude | P1 | Done — `backend` and `frontend` workflows run on every push and on PRs into `dev`/`main` (runs 42069891558, 42074077400). Branch protection on `main` is not configured or verified (Khai\'s setting) | T-003, T-004 | GitHub Actions runs backend `mvn verify` and frontend lint + build on every push to `dev`, task branches, and PRs into `main`; result visible in GitHub Actions |
| T-006 | Verify LLM free tier and get API key | FR-05, D-008 | Khai (key), Claude (verify docs) | P2 | Ready | — | Current model name, limits, and terms checked against the provider's official pages and recorded in D-008; key stored only as a secret, never in the repo |
| T-007 | Add Maven wrapper (`mvnw`) and switch docs/CI to it | — | Claude | P3 | Proposed | Maven Central reachable from workspace | `./mvnw verify` passes locally and in CI |

## Sprint 1 — "A landlord can post a room" ([plan](sprints/sprint-1.md))

| ID | Title | Req | Priority | Status |
| --- | --- | --- | --- | --- |
| T-101 | Auth API: register, login, JWT, `/me` | FR-01 | P2 | Ready (Sprint 1) |
| T-102 | Auth UI: register and login pages | FR-01 | P2 | Ready (Sprint 1) |
| T-103 | Listing API: create, edit, hide/unhide, my listings | FR-02 | P2 | Ready (Sprint 1) |
| T-104 | Listing image links + placeholder frame | FR-02 | P2 | Ready (Sprint 1) |
| T-105 | Listing detail API + page | FR-04 | P2 | Ready (Sprint 1) |
| T-106 | Landlord listing form UI | FR-02 | P2 | Ready (Sprint 1) |

## Sprint 2 — "A tenant can find a room"

| ID | Title | Req | Priority | Status |
| --- | --- | --- | --- | --- |
| T-201 | Browse/filter API with validation, sort, pagination | FR-03 | P2 | Proposed |
| T-202 | Browse page with filter panel | FR-03 | P2 | Proposed |
| T-203 | Synthetic seed data generator (dev profile only) | NFR-02, NFR-06 | P2 | Proposed |
| T-204 | Testcontainers integration tests + NFR-02 measurement | FR-03, NFR-02 | P2 | Proposed |

## Sprint 3 — "Search in plain language"

| ID | Title | Req | Priority | Status |
| --- | --- | --- | --- | --- |
| T-301 | `QueryParser` interface + Gemini adapter (timeout, JSON parsing) | FR-05 | P2 | Proposed |
| T-302 | AI search endpoint: validation via `SearchFilter`, rate limit | FR-05 | P2 | Proposed |
| T-303 | AI search UI with editable filter chips | FR-05 | P2 | Proposed |
| T-304 | Failure-path tests: timeout, invalid JSON, not understood, 429 | FR-05, NFR-04 | P2 | Proposed |

## Sprint 4 — "Go live"

| ID | Title | Req | Priority | Status |
| --- | --- | --- | --- | --- |
| T-401 | Deploy demo on free hosting | NFR-05 | P2 | Proposed (blocked by OQ-05; needs Khai's approval per D-012) |
| T-402 | README with screenshots/GIF, architecture summary, and "what is verified" section | — | P2 | Proposed |
| T-403 | Favorites | FR-06 | P3 | Proposed |
| T-404 | Image file upload to a free storage service (free tier verified first, D-007) | FR-02 | P3 | Proposed |
