# Project Contributor Entry Point

Project: Finding House — AI-assisted room-rental search (portfolio project)
Standard: AI-Assisted Software Engineering Standard, pinned version 1.3. Kept in the private repository `lamkhai0604/engineering-standard` (D-016); contributors need access from Khai. A local copy may be placed in `docs/standard/`, which is git-ignored.
Adoption: Approved by Khai (Product Owner), 2026-11-05 — see D-001 in `docs/DECISIONS.md`

## Read before work

1. This file
2. `docs/STATUS.md`: current checkpoint and next action
3. `docs/SRS.md`: requirements (check approval status)
4. `docs/ARCHITECTURE.md`: components, boundaries, UML views
5. `docs/DECISIONS.md`: approved and proposed decisions
6. `docs/BACKLOG.md`: your assigned task and its acceptance criteria
7. `docs/WORKFLOW.md`: branching, review, engineering profile, commands
8. `README.md`: setup and how to run tests

Then verify the actual repository state (branch, latest commit, uncommitted changes, open PRs) before making changes. Never invent repository state, test results, or approvals.

## Permissions (D-012, proposed)

Implementation: tasks marked Ready in BACKLOG.md, within their acceptance criteria
Branch / commit / push / PR: Claude works on `dev` and task branches cut from `dev`; PRs target `dev` (D-012, D-014)
`main`: Khai's branch; never push to it. Only Khai merges `dev → main`
Merge / deployment / release: Khai only
Paid services / destructive actions: not permitted without Khai's explicit approval (D-007)
Delegation / communication: through Khai; chat in Vietnamese, records in English

## Project-specific rules

Engineering profile: `docs/WORKFLOW.md`
Approved exceptions: none
Current starting point: `docs/STATUS.md`
