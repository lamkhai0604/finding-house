# Current Checkpoint

| Field | Value |
| --- | --- |
| Updated | 2026-11-05 |
| Sprint | Sprint 3 — "Go live" (approved 2026-11-05). Sprint 2 merged to `main` in PR #4 (`362a598`). |
| Repository | github.com/lamkhai0604/finding-house (`main` and `dev` created at `4de096d`) |
| Active work | Sprint 3: T-114a and T-114b Done (deployment-ready backend image and frontend build). Next: T-401 deploy (needs Khai's accounts) and T-113. |
| Source revision | `dev` (see `git log dev`) |
| Outstanding changes | Engineering standard is held outside the repo (D-016) in `lamkhai0604/engineering-standard` (`2fae0b0`) |
| Verification | Backend: run 42153629641 (106 tests). Frontend: run 42154410104 (105/105). Smoke: run 42154410160 (Docker backend image, cross-origin production build with CSP). |
| Blockers | None. Environment gap: Maven Central, the npm registry, and GitHub artifact storage are unreachable from Claude's workspace, so checks run on GitHub Actions. |
| Next action | T-401 deploy following docs/DEPLOYMENT.md; T-113 meanwhile; meanwhile Khai creates the Vercel, Render, and Neon accounts. |
