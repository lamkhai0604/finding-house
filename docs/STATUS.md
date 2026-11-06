# Current Checkpoint

| Field | Value |
| --- | --- |
| Updated | 2026-11-05 |
| Sprint | Sprint 4 — "Looks finished" (UI/UX redesign, D-032, D-033). Sprint 3 in `main` (PR #7, PR #8). |
| Repository | github.com/lamkhai0604/finding-house (`main` and `dev` created at `4de096d`) |
| Active work | Sprint 4: T-208 to T-215 done (tokens, fonts, header, footer, home, browse, listing page, landlord pages, toasts and empty states, demo content); the live demo-data run waits for Khai (secret + approval). Live site: https://finding-house.vercel.app |
| Source revision | `dev` (see `git log dev`) |
| Outstanding changes | Engineering standard is held outside the repo (D-016) in `lamkhai0604/engineering-standard` (`2fae0b0`) |
| Verification | Backend: run 42169385441 (119 tests). Frontend: run 42169652230 (125/125). Smoke: run 42169798299 (Docker backend image, cross-origin production build with CSP). |
| Blockers | None. Environment gap: Maven Central, the npm registry, and GitHub artifact storage are unreachable from Claude's workspace, so checks run on GitHub Actions. |
| Next action | T-216, then the Sprint 4 report in order; screenshots to Khai after each frontend task. AI search is Sprint 5. |
