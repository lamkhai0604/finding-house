# Sprint 5 Report — "Ask for a room" (AI search)

| Field | Value |
| --- | --- |
| Project | Finding House |
| Sprint | 5 ([plan](../sprints/sprint-5.md)) |
| Period | 2026-11-06 → 2026-11-07 (planned 2 weeks; code finished early) |
| Product Owner / reviewer | Khai (lamkhai0604) |
| Implementer | Claude |
| Result | **Code complete, not yet switched on live.** AI search (T-301 to T-304) is in `main` through PR #12 and passes every check against a fake provider. On the live site it is off (`"available": false`) until Khai creates a provider key and sets it on Render. T-305 (accuracy report) needs that key and has not started |

## 1. Summary

A visitor types what they want in plain words and gets the same results as with the filters. The AI only proposes filters. The model's reply must follow a strict JSON schema whose neighborhood and amenity values are the market's own lists. The server then checks every value again with the manual filters' rules and drops anything that does not fit, with a note. The browse page shows the result as chips that can be removed. The search itself, the results and the URL are the same as for manual filters.

The design goal was that AI can never break search (NFR-04). Every failure (no key, timeout, rate limit, provider error, unreadable reply, a sentence that is not a room search) gives a short message, and the manual filters keep working. Each case is tested in the backend and in Chrome.

The provider is configuration: any OpenAI-compatible API. T-006 compared the free plans on 2026-11-06 and proposes Groq over Gemini (D-035). Groq does not train on prompts, has higher free limits and offers strict JSON. Khai has not decided yet: his GitHub login to the Groq console looped back to the login page, so creating the key was postponed.

Before the sprint started, Khai asked whether landlord and tenant permissions had been forgotten. The check showed they were in place since Sprint 1 (role at sign-up, enforced by the API and covered by tests). The only gap was that the UI made them hard to see; possible improvements are listed in section 6.

## 2. Delivered Work

| Task | What was delivered | Verified | In `main` |
| --- | --- | --- | --- |
| T-006 (check) | Free plans of Groq, Gemini, OpenRouter and Mistral compared on limits, data use, JSON support and API shape; recommendation D-035 | Sources and dates in the sprint plan | Yes |
| T-301 | `QueryParser` and an OpenAI-compatible adapter: strict JSON schema with the market's values, temperature 0, one attempt, 5 s timeout; key, model and URL from the environment, off when unset; the key is refused over plain HTTP except to localhost | Backend run 42326899523 (9 new tests with a fake provider) | Yes (PR #12) |
| T-302 | `GET`/`POST /api/v1/search/interpret`: re-validation through `SearchFilter`, notes for dropped values, 20 searches per address per hour, 8 a minute and 800 a day overall, clear error codes | Backend run 42327463544 (10 new tests) | Yes |
| T-303 | AI box on the home and browse pages (hidden when off), removable chips for every filter in use, a note after an AI search, a request not to type personal details | Frontend run 42329077479 (5 new tests); smoke with a fake provider on desktop and phone | Yes |
| T-304 | Every failure path tested in the backend and in Chrome, with manual search still working | Backend run 42330648718 (three times), smoke run 42329077496 | Yes |
| — | `live-smoke` now reports whether AI search is on | Live run 42332466693: `"available": false` | On `dev` |
| — | README rewritten for the current product with fresh screenshots | Documentation | On `dev` |

## 3. Verification Evidence

| Suite | What it covers | Result | Run |
| --- | --- | --- | --- |
| Backend `mvn verify` | 140 tests on Testcontainers PostgreSQL, 19 of them for AI search against a fake provider on localhost | 140/140, stable over three runs | 42330648718 |
| Frontend | 144 Vitest tests in 23 files; ESLint; Prettier; build | 144/144 | 42329077479 |
| Smoke | Earlier checks, plus a fake AI provider (`fake-ai.mjs`): sentence → browse URL, chips and note on desktop and phone; not understood, timeout, busy and unreadable replies, each with manual search working | All passed | 42329077496 |
| Live | 19 checks after PR #12, plus the AI status check | All passed; AI off | 42332371251, 42332466693 |

**Not verified:** a real model. The fake provider proves the plumbing and every failure path, not how well a model reads Seattle room searches. T-305 measures that once a key exists.

## 4. Decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-035 | Groq as the primary provider (`openai/gpt-oss-20b`, strict JSON), Gemini as the fallback; switching is configuration only | Proposed; waiting for Khai |

## 5. Problems and How They Were Handled

| Problem | Found by | Handling |
| --- | --- | --- |
| The backend check failed on PR #13 and on the `dev` PR: a timeout case was followed by a 504 where a 429 was expected | CI on the pull requests | The fake provider in tests handled one request at a time, so a deliberately slow reply could delay the next test's request. It now serves requests in parallel; three runs in a row pass. Production code was not affected |
| PR #13 was opened from a task branch straight to `main` | Claude's check of the open PRs | Khai closed it and merged the `dev → main` PR (#12), which had everything plus the fix |
| Creating a Groq key: GitHub login to the console loops back to the login page | Khai | Postponed. Suggested: a private window, Google or email login, or allowing the site's cookies |

## 6. Not Done / Carried Over

- **Switch AI search on:** Khai creates a key (D-035), sets `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` on Render; then `live-smoke` should report `"available": true`.
- **T-305:** 30 example sentences with expected filters, run against the real model by a manual workflow; accuracy per field. Needs the key and Khai's approval to run.
- **Optional, from the permissions question:** show the role in the account menu; role choice as two cards at sign-up; send landlords to My listings after logging in. Larger and not planned: an admin role for moderation; one account with both roles.
- **T-404** photo upload, **T-007** Maven wrapper: unchanged.

## 7. Metrics

| Metric | Value |
| --- | --- |
| Tasks done | T-301 to T-304, the T-006 check; T-305 waiting for a key |
| Automated tests | 284 (backend 140, frontend 144), up from 260 |
| New endpoints | 2 (`GET` and `POST /api/v1/search/interpret`) |
| Running cost | $0; AI search will use the provider's free plan within the limits above |
