# Sprint 5 Report — "Ask for a room" (AI search)

| Field | Value |
| --- | --- |
| Project | Finding House |
| Sprint | 5 ([plan](../sprints/sprint-5.md)) |
| Period | 2026-11-06 → 2026-11-07 (planned 2 weeks; code finished early) |
| Product Owner / reviewer | Khai (lamkhai0604) |
| Implementer | Claude |
| Result | **Done.** AI search (T-301 to T-304) is live on Groq `openai/gpt-oss-20b` since 2026-11-07 (D-035). A live check found a token-limit failure, fixed in T-306. The evaluation (T-305) gets every filter right for 29 of 30 sentences ([report](ai-eval-report.md)) |

## 1. Summary

A visitor types what they want in plain words and gets the same results as with the filters. The AI only proposes filters. The model's reply must follow a strict JSON schema whose neighborhood and amenity values are the market's own lists. The server then checks every value again with the manual filters' rules and drops anything that does not fit, with a note. The browse page shows the result as chips that can be removed. The search itself, the results and the URL are the same as for manual filters.

The design goal was that AI can never break search (NFR-04). Every failure (no key, timeout, rate limit, provider error, unreadable reply, a sentence that is not a room search) gives a short message, and the manual filters keep working. Each case is tested in the backend and in Chrome.

The provider is configuration: any OpenAI-compatible API. T-006 compared the free plans on 2026-11-06 and proposes Groq over Gemini (D-035). Groq does not train on prompts, has higher free limits and offers strict JSON. The decision and the API key are pending.

Role-based access was re-checked at the start of the sprint: landlord and tenant roles have been in place since Sprint 1 (chosen at sign-up, enforced by the API, covered by tests). The UI does not show the role clearly; improvements are listed in section 6.

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

**Real model:** verified after enablement. Live run 42393151023 passes three fixed sentences on the deployed site; the T-305 evaluation gets every filter right for 29 of 30 sentences (run 42414603562, [report](ai-eval-report.md)).

## 4. Decisions

| ID | Decision | Status |
| --- | --- | --- |
| D-035 | Groq as the primary provider (`openai/gpt-oss-20b`, strict JSON), Gemini as the fallback; switching is configuration only | Proposed; pending approval |

## 5. Problems and How They Were Handled

| Problem | Found by | Handling |
| --- | --- | --- |
| The backend check failed on PR #13 and on the `dev` PR: a timeout case was followed by a 504 where a 429 was expected | CI on the pull requests | The fake provider in tests handled one request at a time, so a deliberately slow reply could delay the next test's request. It now serves requests in parallel; three runs in a row pass. Production code was not affected |
| PR #13 targeted `main` directly from a task branch, outside the branch model (D-014) | Check of the open PRs | PR #13 closed; the changes reached `main` through the `dev → main` PR (#12), which also had the fix |
| Provider account sign-in failed at first | Product Owner | Key created 2026-11-07; AI search switched on the same day |

## 6. Not Done / Carried Over

- Known miss from T-305: a search for a place outside Seattle (E25, Tacoma) is marked "not a room search".
- Role clarity was done after the sprint as T-218. Larger and not planned: an admin role for moderation; one account with both roles.
- **T-404** photo upload: not planned yet. T-007 (Maven wrapper) was done after the sprint.

## 7. Metrics

| Metric | Value |
| --- | --- |
| Tasks done | T-301 to T-306, the T-006 check |
| Automated tests | 284 (backend 140, frontend 144), up from 260 |
| New endpoints | 2 (`GET` and `POST /api/v1/search/interpret`) |
| Running cost | $0; AI search will use the provider's free plan within the limits above |
