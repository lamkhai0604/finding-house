# Sprint 4 — "Looks finished"

| Field | Value |
| --- | --- |
| Goal | The app looks and feels like a finished product: the approved "along the line" design (D-033) on every page, real-looking content, and small touches (toasts, empty states, page titles). No change to what the API does, except one read-only endpoint for the home page. |
| Dates | 2026-11-06 → 2026-11-20 (2 weeks, proposed) |
| Requirements | NFR-07; D-027, D-032, D-033 |
| Tasks | T-208 to T-216 |
| Approved | Khai, 2026-11-05 (six UI areas and the visual design, D-033) |
| Status | **Done** 2026-11-06, plus T-217 (added during the sprint). [Report](../reports/sprint-4-report.md) |

## Plan

| Order | Task | Notes |
| --- | --- | --- |
| 1 | T-208 Design tokens and fonts | Lagoon colours as CSS variables, Archivo and Public Sans self-hosted (npm font packages, D-033), new logo mark and favicon, page titles |
| 2 | T-209 Header and footer | New logo, navigation, dark footer |
| 3 | T-210 Home page | Hero with skyline and ticket collage, search form, 1 Line strip with real room counts and lowest rent per stop (new read-only endpoint), "Just posted", how-it-works |
| 4 | T-211 Listing card and browse page | Ticket cards in a grid with a save heart on the photo, colour title band, filter panel with the mini line and amenity chips |
| 5 | T-212 Listing page | Two columns, sticky contact card with call button, amenity icons, "Getting around" |
| 6 | T-213 Landlord pages | Post/edit form in sections with a live card preview; My listings with counts of shown and hidden rooms |
| 7 | T-214 Finishing touches | Toasts for save, post, hide, delete; 404 and empty states; per-page titles |
| 8 | T-215 Demo content | Free-licence room photos (licence checked first); a demo-data loader for the live site whose passwords are not in the repository |
| 9 | T-216 Phone pass | Every page at 375 px; smoke screenshots on phone and desktop |

## Verification approach

- Existing tests keep passing; tests change only where text or structure changed on purpose.
- New behaviour gets tests (stats endpoint, toasts, preview).
- Screenshots from the smoke run after every frontend task, attached for review.
- Contrast of every text colour pair checked against WCAG AA.

## Sprint review

_To be filled at the end of the sprint; full report in `docs/reports/sprint-4-report.md` (D-020)._
