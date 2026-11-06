# Current Checkpoint

| Field | Value |
| --- | --- |
| Updated | 2026-11-05 |
| Sprint | Sprint 3 — "Go live" (approved 2026-11-05). Sprint 2 merged to `main` in PR #4 (`362a598`). |
| Repository | github.com/lamkhai0604/finding-house (`main` and `dev` created at `4de096d`) |
| Active work | Sprint 3: live at https://finding-house.vercel.app. Done: T-114a, T-114b, T-113, T-401, T-405, T-207, T-402 (README), T-403 (favorites, FR-06). |
| Source revision | `dev` (see `git log dev`) |
| Outstanding changes | Engineering standard is held outside the repo (D-016) in `lamkhai0604/engineering-standard` (`2fae0b0`) |
| Verification | Backend: run 42169385441 (119 tests). Frontend: run 42169652230 (125/125). Smoke: run 42169798299 (Docker backend image, cross-origin production build with CSP). |
| Blockers | None. Environment gap: Maven Central, the npm registry, and GitHub artifact storage are unreachable from Claude's workspace, so checks run on GitHub Actions. |
| Next action | Khai: merge `dev -> main` (T-402, T-403 go live) and review the Sprint 3 report; then Sprint 4 plan (AI search, FR-05). |
