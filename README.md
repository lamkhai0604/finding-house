# Finding House

Find a room to rent by just describing it.

> **Status: Sprint 0 (design baseline).** No application code exists yet. Everything below describes the *planned* product; the "Verified" section will list only what has actually been implemented and tested.

Finding House is a full-stack web app where landlords post rooms and tenants search them with normal filters or with a plain-language request such as *"studio under $1,800 in Capitol Hill, pets allowed"*. An LLM turns the sentence into structured filters, which go through the same server-side validation as manual filters.

## Planned stack

- **Backend:** Java 21, Spring Boot 3, Spring Security (JWT), Spring Data JPA, Flyway, PostgreSQL
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

Added in T-003 / T-004 once the skeleton exists.

## Verified

Nothing yet.
