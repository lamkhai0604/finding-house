# Sprint 0 — Preparation

| Field | Value |
| --- | --- |
| Goal | Reviewed requirements and design baseline, a working repository skeleton, and green CI, so Sprint 1 can start on feature work. |
| Dates | 2026-11-05 → 2026-11-12 (1 week, proposed) |
| Tasks | T-001 to T-006 (see [BACKLOG.md](../BACKLOG.md)) |
| Requirements touched | All (baseline review); NFR-08 (CI) |

## Capacity assumptions

- Claude: drafts and implements during sessions started by Khai.
- Khai: about 2–3 hours this week for reviewing docs and PRs, around classes.

## Dependencies and decisions needed

- OQ-04 repository name → unblocks T-001 and everything after it.
- D-005, D-006, D-008 to D-013 approval and OQ-01 → T-002.

## Verification approach

- Docs: Khai's review of the docs on `dev`, with decisions recorded in DECISIONS.md.
- Skeleton: local checks before merging into `dev`, then the CI run on `dev` (command, runner, commit SHA recorded in the task evidence).

## Design updates in this sprint

Initial SRS v0.1 and ARCHITECTURE v0.1 (use case, AI search sequence, ER).

## Sprint review (2026-11-05)

Full report: [Sprint 0 report](../reports/sprint-0-report.md).

| Task | Implemented | Verified | Reviewed | Merged to `dev` | Merged to `main` |
| --- | --- | --- | --- | --- | --- |
| T-001 repo + baseline docs | Yes | n/a (docs) | Khai (PR #1) | Yes | Yes (`954432d`) |
| T-002 baseline approval | Yes | n/a | Khai | Yes | Yes |
| T-003 backend skeleton | Yes | CI run 42069891558 | Khai (PR #1) | Yes | Yes |
| T-004 frontend skeleton | Yes | CI run 42074077400 | Khai (PR #1) | Yes | Yes |
| T-005 CI | Yes | Both workflows green on `dev` | Khai (PR #1) | Yes | Yes |
| T-006 LLM free tier + key | No | — | — | — | — |
| T-007 Maven wrapper | No | — | — | — | — |

Released: nothing deployed (deployment is Sprint 4).

**Unmet / carried back to the backlog:** T-006 (not needed until Sprint 3), T-007 (blocked by environment). Not carried forward automatically; reprioritized in Sprint 1 planning.

**Not verified at sprint end:** running `docker compose` + `npm run dev` together. Verified afterwards by T-008 (run 42096337624).

**Improvement notes:**
- Claude's workspace cannot reach Maven Central, the npm registry, or GitHub artifact storage, so every Java/JS check runs on GitHub Actions. `google-java-format` can be run locally (downloaded from GitHub releases), which catches formatting before CI.
- Versions guessed without registry access were outdated; CI now prints `npm outdated` and dependencies were upgraded in T-004. Check current versions before pinning new dependencies.
