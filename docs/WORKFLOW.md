# Workflow and Engineering Profile — Finding House

Status: **Proposed** (part of the Sprint 0 baseline, D-011 and D-012).

## Branching and pull requests

- **`main`** belongs to Khai and is always demo-ready. Nobody pushes to it directly. It changes only through a `dev → main` PR that Khai reviews and merges (D-014).
- **`dev`** is the integration branch. Claude works here (D-012).
- Proposed: each task gets a short-lived branch from `dev` (`feat/T-103-listing-api`, `fix/T-xxx-...`, `docs/...`, `chore/...`) and a PR into `dev`, so each task can be reviewed on its own.
- Commits follow Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`) and mention the task ID.
- One PR has one purpose and links to its task and requirement IDs. The description states the problem, the resulting behavior, how it was verified, and any security or data implications (standard §11).
- The author reviews their own diff before asking for review.
- Claude opens PRs into `dev` as **draft** and marks them ready after CI passes. Khai reviews them. Only Khai opens or merges `dev → main` PRs (D-012, D-014).
- Review findings are classified Blocker / Major / Minor / Nit. Unresolved Blocker or Major findings prevent merge.

## Task flow

Proposed → Ready → In Progress → In Review → Done, tracked in [BACKLOG.md](BACKLOG.md). A task is Done only when its acceptance criteria are met and evidence (command, environment, commit, result) is recorded. Merge and release are tracked separately.

## Engineering profile (standard §16)

```text
Languages, versions, platforms:
  Java 21 (Temurin), Spring Boot 3.x, Maven wrapper; Node 22 LTS, TypeScript, React, Vite;
  PostgreSQL 16; modern evergreen browsers, 360 px minimum width.
Style, formatter, linter, commands:
  Backend: Spotless with google-java-format  ->  ./mvnw spotless:check / spotless:apply
  Frontend: ESLint + Prettier                ->  npm run lint / npm run format
Architecture, boundaries, dependency direction:
  See ARCHITECTURE.md §1–2 (controller -> service -> repository; search -> QueryParser interface).
Error handling, logging, state, concurrency:
  One JSON error shape via @RestControllerAdvice; no stack traces in responses;
  SLF4J logging without secrets, tokens, or passwords; stateless API (state lives in PostgreSQL);
  the in-memory rate limiter is the only shared mutable state and must be thread-safe.
Dependency management:
  Maven wrapper + pinned versions; package-lock.json committed. New runtime dependencies are noted in the PR (CODE-14).
Tests and commands:
  Backend: JUnit 5 + Mockito (unit), Spring Boot Test + Testcontainers PostgreSQL (integration) -> ./mvnw verify
  Frontend: Vitest + React Testing Library for components with logic -> npm test
  Requires Docker for integration tests.
Required CI checks and branch protection:
  CI (T-005): backend verify, frontend lint + build + test. Branch protection on main: to be configured by Khai
  and then verified against the actual GitHub settings; until verified, it is recorded as a gap.
Review, merge, release, communication:
  Khai reviews and merges; deployments need Khai's approval each time. Chat with Khai is in Vietnamese;
  repository records are in English.
Authorized delegation and permissions:
  See D-012.
Quality thresholds:
  No numeric coverage threshold (TEST-07). Every FR has integration tests for its acceptance criteria.
Approved exceptions and tracked debt:
  None yet.
```
