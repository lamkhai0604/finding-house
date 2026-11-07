# Sprint 3 — "Go live"

| Field | Value |
| --- | --- |
| Goal | The app runs on the public internet at no cost, with the same checks that run in CI passing against the live URLs. |
| Dates | 2026-11-05 → 2026-11-19 (2 weeks, proposed) |
| Requirements | NFR-01, NFR-05; D-029, D-030 |
| Tasks | T-114a, T-114b, T-401, T-405, T-113; stretch: T-402, T-403 (both done); added: T-206, T-207 |
| Approved | Khai, 2026-11-05 (chat) |

## Plan

| Order | Task | Depends on | Notes |
| --- | --- | --- | --- |
| 1 | T-114a Backend deployment readiness | — | Real client address from `CF-Connecting-IP` when configured; CORS for the frontend origin only; `PORT`; small connection pool; request size limit; Dockerfile; smoke runs the Docker image |
| 2 | T-114b Frontend deployment readiness | T-114a | API base URL at build time; CSP allows exactly that API origin; `vercel.json` with SPA routing and security headers (incl. `frame-ancestors`); smoke runs the production build cross-origin, like the deployment |
| 3 | T-401 Deploy | T-114a, T-114b; Khai's accounts | Neon (database), Render (backend, Docker), Vercel (frontend); secrets only in the dashboards |
| 4 | T-405 Smoke checks against the live URLs | T-401 | Read-only checks plus a throwaway account; manual `workflow_dispatch` |
| 5 | T-113 Registration rate limit | T-114a | Uses the same client-address resolver |
| — | Stretch: T-402 README with screenshots; T-403 Favorites (FR-06) | — | FR-06 is part of the core set in D-019; Khai to decide whether it goes before AI search |

## What Khai does

- Create accounts on Vercel, Render, and Neon (sign in with GitHub); no payment method.
- Enter secrets in the dashboards when Claude gives the step-by-step list (never paste secrets in chat).
- Approve the go-live (D-012) before the first public deploy.

## Verification approach

- Backend: integration tests for the client-address resolver and CORS; the smoke workflow builds and runs the same Docker image that Render runs.
- Frontend: unit tests for the API base URL; smoke runs the production build on another origin with the CSP that will be deployed.
- Live: T-405 checks the deployed URLs.

## Sprint review

Goal met (2026-11-05): live at https://finding-house.vercel.app with the live checks green; all planned tasks plus T-206, T-207, T-402, and T-403. Full report: [sprint-3-report.md](../reports/sprint-3-report.md) (D-020).
