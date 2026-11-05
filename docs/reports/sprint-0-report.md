# Sprint 0 Report — Preparation

| Field | Value |
| --- | --- |
| Project | Finding House |
| Sprint | 0 — Preparation ([plan](../sprints/sprint-0.md)) |
| Period | 2026-11-05 (planned 2026-11-05 → 2026-11-12; finished early) |
| Product Owner / reviewer | Khai (lamkhai0604) |
| Implementer | Claude |
| Result | **Goal met.** `main` at `954432d` (PR #1 merged by Khai on 2026-11-05) |

## 1. Summary

The sprint goal was a reviewed requirements and design baseline, a working repository skeleton, and green CI, so that feature work could start in Sprint 1. All five planned implementation tasks (T-001 to T-005) were delivered, verified on GitHub Actions, reviewed by Khai in PR #1, and merged into `main`. Two tasks were not done and went back to the backlog: T-006 (LLM free-tier key, now Sprint 4) and T-007 (Maven wrapper, blocked by the build environment).

## 2. Delivered Work

| Task | What was delivered | Implemented | Verified | Reviewed | In `main` |
| --- | --- | --- | --- | --- | --- |
| T-001 | Repository `finding-house` with `main` and `dev`; baseline docs | Yes | n/a (docs) | Khai, PR #1 | Yes |
| T-002 | SRS v1.0 and Architecture v1.0 approved as the baseline; decisions D-001 to D-018 recorded | Yes | n/a | Khai | Yes |
| T-003 | Backend skeleton: Spring Boot 4.1.1, Java 21, Flyway, PostgreSQL via Docker Compose, Spotless, health endpoint | Yes | CI | Khai, PR #1 | Yes |
| T-004 | Frontend skeleton: React 19, Vite 8, TypeScript 5.9, ESLint 10, Prettier, Vitest; API health indicator | Yes | CI | Khai, PR #1 | Yes |
| T-005 | CI: `backend` and `frontend` GitHub Actions workflows | Yes | CI | Khai, PR #1 | Yes |
| T-006 | LLM free tier verification and API key | No | — | — | — |
| T-007 | Maven wrapper | No | — | — | — |

Nothing was deployed; deployment is planned for Sprint 3.

## 3. Verification Evidence

| Check | Revision | Environment | Result |
| --- | --- | --- | --- |
| Backend `mvn -B -ntp verify` (format check, build, 2 integration tests on a Testcontainers PostgreSQL) | `4e5e9a3` | GitHub Actions run 42069891558, ubuntu-latest, Temurin 21 | 2/2 passed, BUILD SUCCESS |
| Frontend `npm ci`, lint, format check, 3 tests, type check, build | `6d6721a` | GitHub Actions run 42074077400, ubuntu-latest, Node 22 | 3/3 passed, build OK |
| Both workflows on the merged `main` | `954432d` | Runs 42074779280 (backend), 42074779082 (frontend) | Passed |

All 11 CI runs during the sprint passed. No test was disabled or weakened.

**Not verified at sprint end:** running the app with `docker compose` and the Vite dev server together. This was closed after the sprint by T-008 (smoke workflow run 42096337624: real database, backend jar, API calls, and a headless browser).

## 4. Decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-001 | Follow the AI-Assisted Software Engineering Standard v1.3 | Approved |
| D-002, D-018 | Java 21 + Spring Boot **4.1** (3.x lost free support on 2026-06-30) | Approved |
| D-003 | React + Vite + TypeScript frontend | Approved |
| D-004, D-012, D-014 | Khai reviews and owns `main`; Claude works on task branches and merges into `dev` after checks pass | Approved |
| D-005 – D-011, D-013 | PostgreSQL + Flyway, layered architecture, Gemini free tier (fallback Groq), JWT auth, MVP scope, doc layout, cloud-based workflow | Approved |
| D-007 | Free tiers only; any cost is reported to Khai immediately | Approved |
| D-015 | Market: Seattle, WA (English UI, USD) | Approved |
| D-016 | The engineering standard is kept in a private repository | Approved |
| D-017 | Listing images are links, with a placeholder when missing | Approved |

Full log: [DECISIONS.md](../DECISIONS.md).

## 5. Problems and How They Were Handled

| Problem | Impact | Handling |
| --- | --- | --- |
| Claude's workspace cannot reach Maven Central, the npm registry, or GitHub artifact storage | No local Java/JS builds | All checks run on GitHub Actions; `google-java-format` runs locally to catch formatting early; the npm lockfile was rebuilt from the CI log and checked by SHA-256 |
| Planned "Spring Boot 3" was already out of free support | Security patches would stop | Raised as D-018 before coding; Khai approved 4.1 |
| Frontend versions written without registry access were outdated (ESLint 9 unsupported) | Starting on unsupported tooling | Upgraded to current majors within T-004; CI now prints `npm outdated` |
| The engineering standard was briefly public on `dev` | Private document exposed | With Khai's approval, the `dev` commit was rewritten and force-pushed; the file now lives in a private repository (D-016) |

## 6. Not Done / Carried Back

- **T-006** (LLM key): not needed until AI search; moved to Sprint 4 (D-019).
- **T-007** (Maven wrapper): blocked until Maven Central is reachable from the workspace.
- **Branch protection on `main`**: not configured or verified; this is a repository setting for Khai.

## 7. Metrics

| Metric | Value |
| --- | --- |
| Planned tasks done | 5 of 7 (T-001–T-005) |
| Commits in PR #1 | 15 |
| Files changed in PR #1 | 37 |
| Automated tests | 5 (backend 2, frontend 3) |
| CI runs / passed | 11 / 11 |

## 8. Next Sprint

**Sprint 1 — "A landlord can post a room"** (FR-01, FR-02, FR-04; [plan](../sprints/sprint-1.md)). Already done when this report was written: T-101 auth API (21 backend tests) and T-008 end-to-end smoke workflow. Next: T-103 listing API, including the 403 checks for FR-01.

Changes since Sprint 0 that affect the plan:
- **D-019:** AI search moves to the last sprint (Sprint 4), after the core features and UI.
- **D-020:** a report like this one is written at the end of every sprint.
