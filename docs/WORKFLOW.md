# Workflow and Engineering Profile — Finding House

Status: **Approved** (D-011, D-012, D-014).

## Branching and pull requests

- **`main`** belongs to Khai and is always demo-ready. Nobody pushes to it directly. It changes only through a `dev → main` PR that Khai reviews and merges (D-014).
- **`dev`** is the integration branch. Claude works here (D-012).
- Every task gets its own branch cut from the latest `dev`: `feat/T-103-listing-api`, `fix/T-xxx-short-name`, `docs/T-xxx-short-name`, `chore/T-xxx-short-name`, `test/T-xxx-short-name`.
- When the task's checks pass (build, format/lint, tests; for docs, link and ID consistency), Claude merges the branch into `dev` with `--no-ff`, so each task shows up as one merge commit (D-012).
- Commits follow Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`) and mention the task ID.
- One task branch has one purpose. Its merge commit into `dev` states the task ID, the problem, the resulting behavior, how it was verified, any security or data implications, and that review was self-review.
- The author reviews their own diff before merging into `dev`.
- Khai reviews the accumulated work in a `dev → main` PR (independent review) and is the only one who merges it (D-014).
- Review findings on the `dev → main` PR are classified Blocker / Major / Minor / Nit. Unresolved Blocker or Major findings prevent merge.

## Task flow

Proposed → Ready → In Progress → In Review → Done, tracked in [BACKLOG.md](BACKLOG.md). A task is Done only when its acceptance criteria are met and evidence (command, environment, commit, result) is recorded. Merge and release are tracked separately.

## Engineering profile (standard §16)

```text
Languages, versions, platforms:
  Java 21 (Temurin), Spring Boot 4.1.x, Maven 3.9+ (Maven wrapper to be added, see tracked debt); Node 22 LTS, TypeScript, React, Vite;
  PostgreSQL 16; modern evergreen browsers, 360 px minimum width.
Style, formatter, linter, commands:
  Backend: Spotless with google-java-format  ->  mvn spotless:check / mvn spotless:apply (check also runs in mvn verify)
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
  Backend: JUnit 5 + Mockito (unit), Spring Boot Test + Testcontainers PostgreSQL (integration) -> mvn verify
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
  No exceptions.
  Debt: Maven wrapper (mvnw) not yet generated because Maven Central was unreachable from Claude's
  workspace during T-003; add it when it is reachable (T-003 follow-up in BACKLOG).
  Debt: CI shows harmless warnings (Flyway POM metadata repositories return 401; Mockito/ByteBuddy
  dynamic agent warning). Revisit if they become errors on newer JDKs.
```
