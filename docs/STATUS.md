# Current Checkpoint

| Field | Value |
| --- | --- |
| Updated | 2026-11-07 |
| Sprint | Sprint 6 — moderation (FR-08): done and live ([report](reports/sprint-6-report.md)). Sprints 0–5 done. |
| Repository | github.com/lamkhai0604/finding-house (`main` = reviewed releases, `dev` = integration) |
| Live | Frontend https://finding-house.vercel.app · API https://finding-house.onrender.com · database on Neon. Demo content loaded (D-034). AI search live on Groq (D-035). Moderation live; administrator set through `ADMIN_EMAILS` (T-606). |
| Source revision | `dev` (see `git log dev`); `main` up to PR #18; PR #20 (`dev → main`) open |
| Outstanding changes | Engineering standard is held outside the repo (D-016) in `lamkhai0604/engineering-standard` |
| Verification | Backend: run 42433366168 (168 tests). Frontend: run 42433035828 (154 tests). Smoke: run 42448786644 (incl. moderation M01–M07 and phone layout checks). Live: run 42449705434 (site, security headers, browser and three real AI searches, 0 failures). |
| Blockers | None. Environment gap: Maven Central, the npm registry and GitHub artifact storage are unreachable from Claude's workspace, so checks run on GitHub Actions. |
| Next action | Khai reviews and merges PR #20 (`dev → main`) and engineering-standard PR #2 (v1.6) |
