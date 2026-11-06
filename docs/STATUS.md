# Current Checkpoint

| Field | Value |
| --- | --- |
| Updated | 2026-11-05 |
| Sprint | Sprint 2 — "A tenant can find a room" (Sprint 1 merged to `main` in PR #2, `620d7f3`) |
| Repository | github.com/lamkhai0604/finding-house (`main` and `dev` created at `4de096d`) |
| Active work | Sprint 2: T-121, T-120, T-115 to T-119 Done; T-201 browse/filter API, T-122 newest listings on the home page, and T-202 browse page, T-205 folding phone filters, T-203 synthetic data, and T-204 performance check (p95 40.8 ms with 10,000 listings) Done. Sprint 2 report written (`docs/reports/sprint-2-report.md`). |
| Source revision | `dev` (see `git log dev`) |
| Outstanding changes | Engineering standard is held outside the repo (D-016) in `lamkhai0604/engineering-standard` (`2fae0b0`) |
| Verification | Backend: run 42142023037 (94 tests). Frontend: run 42141051469 (102/102). Smoke: run 42141051453 (all page checks, CSP build). |
| Blockers | None. Environment gap: Maven Central, the npm registry, and GitHub artifact storage are unreachable from Claude's workspace, so checks run on GitHub Actions. |
| Next action | Khai reviews the `dev -> main` PR and the Sprint 3 hosting proposal (report §6, §8). |
