# Finding House

Find a room to rent by just describing it.

> **Status: Sprint 0.** Design baseline approved; backend and frontend skeletons with CI in place. Everything else below describes the *planned* product. The "Verified" section lists only what has actually been implemented and tested.

Finding House is a full-stack web app where landlords post rooms and tenants search them with normal filters or with a plain-language request such as *"studio under $1,800 in Capitol Hill, pets allowed"*. An LLM turns the sentence into structured filters, which go through the same server-side validation as manual filters.

## Planned stack

- **Backend:** Java 21, Spring Boot 4.1, Spring Security (JWT), Spring Data JPA, Flyway, PostgreSQL
- **Frontend:** React, Vite, TypeScript
- **AI:** LLM free tier behind a `QueryParser` adapter, with timeout and fallback to manual filters
- **Quality:** JUnit 5, Testcontainers, GitHub Actions CI

## Documentation

| Document | What it covers |
| --- | --- |
| [AGENTS.md](AGENTS.md) | How contributors (human or AI) start work |
| [docs/SRS.md](docs/SRS.md) | Requirements and acceptance criteria |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture, UML, data model, API |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decision log |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Tasks and sprints |
| [docs/STATUS.md](docs/STATUS.md) | Current checkpoint |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Branching, review, engineering profile |

## Setup and testing

### Backend

Prerequisites: Java 21, Maven 3.9+, Docker (for the local database and for integration tests).

```bash
cp .env.example .env            # optional: change local DB credentials
docker compose up -d postgres   # local PostgreSQL 16 on port 5432
cd backend
mvn spring-boot:run             # API on http://localhost:8080
curl localhost:8080/actuator/health   # {"status":"UP"}
```

Run the checks CI runs (format check, build, tests with a throwaway PostgreSQL container):

```bash
cd backend
mvn verify
mvn spotless:apply              # fix formatting if the check fails
```

### Frontend

Prerequisites: Node.js 22.

```bash
cd frontend
npm ci                          # exact versions from package-lock.json
npm run dev                     # http://localhost:5173, proxies /api and /actuator to the backend on :8080
```

The page shows "API is up" when the backend is running. Set `BACKEND_URL` to point the dev proxy elsewhere.

Checks CI runs:

```bash
npm run lint
npm run format:check            # npm run format to fix
npm test
npm run build                   # type check + production build
```

## Verified

| What | How | Evidence |
| --- | --- | --- |
| Backend starts on Spring Boot 4.1.1, Flyway applies migration V1, `/actuator/health` returns UP | `mvn -B -ntp verify` on GitHub Actions (ubuntu-latest, Temurin 21, Testcontainers `postgres:16-alpine`) | Commit `4e5e9a3`, run 42069891558: 2 tests, 0 failures; Spotless clean; BUILD SUCCESS |
| Frontend lints, is Prettier-formatted, passes tests for the API health indicator (up / down / unreachable), and builds | `npm ci`, lint, format check, `npm test`, `npm run build` on GitHub Actions (ubuntu-latest, Node 22) | Commit `6d6721a`, run 42074077400: 3 tests passed; build OK |
