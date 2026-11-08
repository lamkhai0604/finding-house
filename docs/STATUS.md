# Current Checkpoint

| Field | Value |
| --- | --- |
| Updated | 2026-11-07 |
| Sprint | Sprint 6 — moderation (FR-08): code complete ([report](reports/sprint-6-report.md)). Sprints 0–5 done. |
| Repository | github.com/lamkhai0604/finding-house (`main` = reviewed releases, `dev` = integration) |
| Live | Frontend https://finding-house.vercel.app · API https://finding-house.onrender.com · database on Neon. Demo content loaded (D-034). AI search off until a provider key is set. |
| Source revision | `dev` (see `git log dev`); `main` up to PR #12 |
| Outstanding changes | Engineering standard is held outside the repo (D-016) in `lamkhai0604/engineering-standard` |
| Verification | Backend: run 42330648718 (140 tests, three green runs). Frontend: run 42329077479 (144 tests). Smoke: run 42329077496 (incl. AI search against a fake provider). Live: run 42332371251 (19 checks), AI status run 42332466693 (`available: false`). |
| Blockers | AI provider API key not yet created (D-035 pending). Environment gap: Maven Central, the npm registry and GitHub artifact storage are unreachable from Claude's workspace, so checks run on GitHub Actions. |
| Next action | T-606 (Khai): sign up a tenant account for moderation on the live site, then set `ADMIN_EMAILS` to it on Render |
