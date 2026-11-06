# Current Checkpoint

| Field | Value |
| --- | --- |
| Updated | 2026-11-05 |
| Sprint | Sprint 3 — "Go live" (approved 2026-11-05). Sprint 2 merged to `main` in PR #4 (`362a598`). |
| Repository | github.com/lamkhai0604/finding-house (`main` and `dev` created at `4de096d`) |
| Active work | Sprint 3: **live** at https://finding-house.vercel.app (API https://finding-house.onrender.com). T-114a, T-114b, T-113, T-401, T-405 Done. |
| Source revision | `dev` (see `git log dev`) |
| Outstanding changes | Engineering standard is held outside the repo (D-016) in `lamkhai0604/engineering-standard` (`2fae0b0`) |
| Verification | Backend: run 42154962043 (111 tests). Frontend: run 42154962010 (106/106). Smoke: run 42154962116 (Docker backend image, cross-origin production build with CSP). |
| Blockers | None. Environment gap: Maven Central, the npm registry, and GitHub artifact storage are unreachable from Claude's workspace, so checks run on GitHub Actions. |
| Next action | Khai: try the live site and post a few rooms. Next candidates: T-207 empty-state wording, T-402 README with screenshots, T-403 favorites (FR-06), then Sprint 4 AI search. |
