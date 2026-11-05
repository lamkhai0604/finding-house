# Sprint 1 — "A landlord can post a room"

| Field | Value |
| --- | --- |
| Goal | A landlord can register, log in, and post a listing with image links; anyone can open the listing's detail page. |
| Dates | 2026-11-05 → 2026-11-19 (2 weeks, proposed) |
| Requirements | FR-01, FR-02, FR-04 |
| Tasks | T-101 to T-106 (see [BACKLOG.md](../BACKLOG.md)) |

## Plan

| Order | Task | Depends on | Notes |
| --- | --- | --- | --- |
| 1 | T-101 Auth API | — | Users table, register/login/me, JWT (D-009), JSON error format |
| 2 | T-103 Listing API | T-101 | Listings + amenities + image links tables; ownership and 403 checks (completes FR-01 AC5) |
| 3 | T-104 Image links + placeholder | T-103 | API part with T-103; UI part with T-105/T-106 |
| 4 | T-105 Listing detail API + page | T-103 | Hidden listing → 404 for non-owners |
| 5 | T-102 Auth UI | T-101 | Register and login pages, token in memory + sessionStorage |
| 6 | T-106 Landlord listing form UI | T-102, T-103 | Create/edit/hide, my listings |

Delivers a vertical slice: database → API → UI for posting and viewing a listing.

## Capacity assumptions

- Claude implements during sessions Khai starts.
- Khai reviews the `dev → main` PR at least once mid-sprint and once at the end.

## Dependencies and open decisions

- None blocking. T-006 (LLM key) is not needed in this sprint.

## Verification approach

- Backend: Testcontainers integration tests for every FR acceptance criterion in scope, run by the `backend` workflow.
- Frontend: Vitest + Testing Library for form validation and state logic; manual check of pages noted as a gap until a browser run is available.

## Design updates

- ER diagram unchanged (tables match ARCHITECTURE §4). API list unchanged.

## Sprint review

_To be filled at the end of the sprint._
