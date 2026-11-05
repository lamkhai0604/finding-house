# Finding House

Find a room to rent by just describing it.

> **Status: Sprint 0.** Design baseline approved; backend and frontend skeletons with CI in place. Everything else below describes the *planned* product. The "Verified" section lists only what has actually been implemented and tested.

Finding House is a full-stack web app where landlords post rooms and tenants search them with normal filters or with a plain-language request such as *"studio under $1,800 in Capitol Hill, pets allowed"*. An LLM turns the sentence into structured filters, which go through the same server-side validation as manual filters.

## Planned stack

- **Backend:** Java 21, Spring Boot 4.1, Spring Security (JWT), Spring Data JPA, Flyway, PostgreSQL
- **Frontend:** React, Vite, TypeScript
- **AI (planned last, after the core features):** LLM free tier behind a `QueryParser` adapter, with timeout and fallback to manual filters
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
| [docs/reports/](docs/reports/) | Sprint reports |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Branching, review, engineering profile |

## Setup and testing

### Backend

Prerequisites: Java 21, Maven 3.9+, Docker (for the local database and for integration tests).

```bash
cp .env.example .env            # then set JWT_SECRET (required): openssl rand -base64 48
docker compose up -d postgres   # local PostgreSQL 16 on port 5432
cd backend
mvn spring-boot:run             # API on http://localhost:8080
curl localhost:8080/actuator/health   # {"status":"UP"}
```

Try the auth API (FR-01):

```bash
curl -X POST localhost:8080/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"correct-horse","displayName":"Ana","role":"LANDLORD"}'
curl -X POST localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"correct-horse"}'      # returns accessToken
curl localhost:8080/api/v1/me -H "Authorization: Bearer <accessToken>"
```

Post a listing as a landlord (FR-02; price in US cents):

```bash
curl -X POST localhost:8080/api/v1/listings -H "Authorization: Bearer <accessToken>" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Sunny studio near UW","monthlyPriceCents":165000,"areaSqft":420,
       "neighborhood":"University District","address":"4500 Brooklyn Ave NE",
       "amenities":["WIFI"],"imageUrls":["https://example.com/a.jpg"]}'
curl localhost:8080/api/v1/me/listings -H "Authorization: Bearer <accessToken>"
curl localhost:8080/api/v1/reference-data          # neighborhoods and amenities
```

Run the checks CI runs (format check, build, tests with a throwaway PostgreSQL container):

```bash
cd backend
mvn verify
mvn spotless:apply              # fix formatting if the check fails
```

### Sample data

[`scripts/sample-data/sample-data.json`](scripts/sample-data/sample-data.json) holds fictional test data with every field the API accepts: 5 users (3 landlords, 2 tenants), 12 Seattle listings (all amenities, 0–5 images, one hidden, one with a broken image link, one without images), and 8 invalid requests with their expected errors.

Load it into a running backend (Python 3, no extra packages):

```bash
python3 scripts/sample-data/load_sample_data.py                  # users + listings, safe to run twice
python3 scripts/sample-data/load_sample_data.py --check-invalid  # also checks the invalid examples
```

Then log in as `maya.landlord@example.com` / `sample-pass-maya` (other passwords are in the JSON file).

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
| FR-01 register / login / `/me`: field validation, case-insensitive duplicate email → 409, BCrypt-only storage, identical 401 for wrong password and unknown email, 401 for missing / malformed / expired / foreign-key / foreign-issuer tokens, app refuses weak JWT secrets | 21 tests (Testcontainers PostgreSQL) via `mvn -B -ntp verify` on GitHub Actions | Commit `6b6f324`, run 42095282281: 21 tests passed; Spotless clean |
| FR-02 listing API: landlords create, edit, hide/unhide, and list their listings; tenants and other landlords get 403; field validation incl. https-only image links (max 5) and known Seattle neighborhoods | 30 new tests (19 integration over HTTP, 11 unit) via `mvn -B -ntp verify` on GitHub Actions | Commit `5d52800`, run 42098935164: 51 tests passed |
| FR-04 listing detail: public view with landlord name and phone (never email); hidden listings are 404 for everyone except the owner, with the same body as a missing listing | 6 integration tests over HTTP | Commit `32df262`, run 42105905522 (attempt 2): 57 tests passed |
| Sample data loads through the real API (12 listings, 5 users), all 8 invalid examples are rejected with the expected status and field errors, and a second load creates no duplicates | `smoke` workflow, `load_sample_data.py --check-invalid`, then a second run | Commit `998031a`, run 42103027735: passed |
| The app runs as the README describes: `docker compose` PostgreSQL, backend with `.env`, API flow, and the page in a real browser shows "API is up" (and "API is down" when the backend stops) | `smoke` workflow: `scripts/smoke/api-smoke.sh` + headless Chromium via Playwright | Commit `504c909`, run 42096337624: all checks passed |
