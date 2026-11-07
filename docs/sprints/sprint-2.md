# Sprint 2 — "A tenant can find a room"

| Field | Value |
| --- | --- |
| Goal | A tenant can browse and filter active listings, and the app feels finished: navigation, loading states, back buttons, footer, and a landlord can delete a listing safely. |
| Dates | 2026-11-05 → 2026-11-19 (2 weeks, proposed) |
| Requirements | FR-03, FR-07; D-025, D-026, D-027 |
| Tasks | T-121, T-120, T-115 to T-119, T-201 to T-204, T-122; added: T-123, T-205 |

## Plan

| Order | Task | Depends on | Notes |
| --- | --- | --- | --- |
| 1 | T-121 Token lifetime 2 h | — | Config default + tests |
| 2 | T-120 Delete listing | — | API + reusable confirmation dialog |
| 3 | T-115 to T-119 UI polish | — | Reusable components, screenshots for review |
| 4 | T-201 Browse/filter API | — | Pagination; avoid the N+1 pattern noted in the review (O4) |
| 5 | T-122 Home carousel | T-201 | Newest listings, scroll-snap, no auto-rotate |
| 6 | T-202 Browse page | T-201 | Reuses ListingCard |
| 7 | T-203, T-204 Data generator, integration tests, NFR-02 measurement | T-201 | p95 < 500 ms with 10,000 listings |

## Capacity assumptions

- Claude implements during sessions Khai starts; screenshots are sent after each frontend task.
- Khai reviews one `dev → main` PR mid-sprint and one at the end.

## Verification approach

- Backend: Testcontainers integration tests per acceptance criterion.
- Frontend: Vitest + Testing Library; smoke page checks on the production build with CSP, with screenshots.

## Sprint review

Goal met on `dev` (2026-11-05): all 11 planned tasks plus T-123 and T-205; NFR-02 measured at p95 40.8 ms with 10,000 listings. Full report: [sprint-2-report.md](../reports/sprint-2-report.md) (D-020).
