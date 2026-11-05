# Current Checkpoint

| Field | Value |
| --- | --- |
| Updated | 2026-11-05 |
| Sprint | Sprint 1 — "A landlord can post a room" (Sprint 0 closed; review in docs/sprints/sprint-0.md) |
| Repository | github.com/lamkhai0604/finding-house (`main` and `dev` created at `4de096d`) |
| Active work | Pre-release review before the Sprint 1 `dev → main` merge: T-109, T-110 Done; T-111 cleanup; T-112 branch sync next. |
| Source revision | `dev` (see `git log dev`) |
| Outstanding changes | Engineering standard is held outside the repo (D-016) in `lamkhai0604/engineering-standard` (`2fae0b0`) |
| Verification | Backend: run 42113180536 (69/69). Frontend: run 42115527137 (62/62, 0 runtime advisories). Smoke: run 42115527225 (15 page checks on the CSP build). |
| Blockers | None. Environment gap: Maven Central, the npm registry, and GitHub artifact storage are unreachable from Claude's workspace, so checks run on GitHub Actions. |
| Next action | T-112 sync, then Khai reviews the [pre-release review](reviews/2026-11-05-pre-release-review.md), chooses D-025, and merges `dev → main`. |
