# Sprint 5 — "Ask for a room" (AI search)

| Field | Value |
| --- | --- |
| Goal | A visitor types what they want in plain words ("quiet room near the light rail under $1,300 with laundry") and gets the same results as if they had set the filters by hand. The AI only turns words into filters; the database search, validation and results stay exactly as they are. When the AI is slow, wrong or unavailable, manual search keeps working (NFR-04). |
| Dates | 2026-11-07 → 2026-11-21 (2 weeks, proposed) |
| Requirements | FR-05, NFR-04, NFR-06; D-008, D-019, D-032 |
| Tasks | T-006, T-301 to T-304, T-305 (stretch) |
| Approved | Plan: Khai, 2026-11-06 (chat: "làm tiếp đi" after the plan). Provider (D-035): still open; the code is provider-neutral until then |

## T-006: LLM provider check (done by Claude 2026-11-06; Khai creates the key)

Checked on 2026-11-06. Sources: the provider pages and dated third-party summaries. Limits change, so T-301 reads them again when the key is created.

| | Groq (free plan) | Google Gemini API (unpaid quota) | OpenRouter (`:free` models) | Mistral (Experiment) |
| --- | --- | --- | --- | --- |
| Card needed | No | No | No | No |
| Limits | Per model, e.g. `openai/gpt-oss-20b` / `120b`: 30 requests/min, 1,000/day, 8,000 tokens/min, 200,000 tokens/day; per organisation, not per key | About 5–15 requests/min without billing; per-model numbers are only shown in AI Studio | 20/min, **50/day** (1,000/day after buying $10 of credits once) | Not published; console only |
| Trains on our prompts | No, according to a dated summary of Groq's services agreement (Khai confirms in the console when creating the key) | **Yes**: unpaid use may be used to improve Google products, and human reviewers may read prompts; Google asks not to send personal information | Depends on the upstream model | **Yes** on the Experiment plan |
| Guaranteed JSON | Yes: `json_schema` with `strict: true` (constrained decoding) on `gpt-oss-20b` and `gpt-oss-120b` | Yes (response schema) | Depends on the model | Yes |
| API shape | OpenAI-compatible | Own API (OpenAI-compatible endpoint also offered) | OpenAI-compatible | OpenAI-compatible |

**Recommendation: switch D-008's order — Groq as primary, Gemini as the fallback** (proposed D-035).
1. Visitors type free text, and someone will type a name or a phone number. Groq does not train on prompts; Gemini's unpaid tier may, and humans may read them.
2. 30 requests/min and 1,000/day fit a portfolio demo. Gemini's unpaid per-minute limit is lower and not published as a number.
3. Strict JSON schema means the reply always parses. Our own validation still checks every value (T-302).
4. The client is written against the OpenAI-compatible API with the base URL, model and key from configuration. Moving to Gemini or another provider later is a configuration change, not new code.

**Model:** `openai/gpt-oss-20b` (fast, strict JSON). `openai/gpt-oss-120b` stays as a configuration-only alternative if T-305 shows the small one misreads too often.

**Budget:** each search sends about 700 tokens (instructions, neighborhood and amenity lists, the query) and gets about 100 back. The 8,000 tokens/min limit allows about 10 searches a minute, so the backend caps itself below that (T-302) and answers "busy, use the filters" instead of hitting Groq's 429.

**Khai's part:** create a Groq account and an API key at console.groq.com, then put it only in Render as `AI_API_KEY`. Never paste it in chat, the repository or a screenshot. CI never uses the key: tests run against a fake AI server.

## Plan

| Task | What | Acceptance |
| --- | --- | --- |
| T-301 | `QueryParser` interface. `OpenAiCompatibleQueryParser` uses the JDK `HttpClient`: system prompt with today's neighborhoods and amenities from `Market`, `temperature: 0`, strict `json_schema`, 5 s timeout, no retries. Configuration: `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` (empty = AI search off). The query is the only user data sent; no account, address or IP | Unit tests with a fake server: the request has the schema and no user data; a good reply becomes a filter candidate |
| T-302 | `POST /api/v1/search/interpret` `{ "query": "..." }` (1–200 chars) → `{ "filters": {...}, "understood": true/false, "notes": [...] }`. Every value goes through the same `SearchFilter` validation as manual filters. Unknown neighborhoods or amenities are dropped with a note; impossible numbers are dropped. Limits: 20 per address per hour (same address rules as D-030), and a global budget below Groq's (8/min, 800/day). Public, like browse. Off when no key: `503 AI_UNAVAILABLE` | Integration tests: valid reply → filters; values outside the market or the ranges are dropped; limits return 429 with `Retry-After`; no key → 503 |
| T-303 | "Describe the room you want" box on the home hero and the browse band. The answer shows as filter chips ("Capitol Hill ×", "Up to $1,300 ×", "Washing machine ×") that apply to the normal browse URL, so the results, sharing and Back work as today. Each chip can be removed; nothing is applied silently. A note under the box: do not include personal details. The box is hidden when the API says AI search is off | Unit tests and smoke screenshots on desktop and phone |
| T-304 | Failure paths, end to end: timeout, invalid JSON, schema mismatch, provider 429, provider 5xx, empty or off-topic query ("not understood"). Each shows a short message and leaves the manual filters working (NFR-04) | Backend tests with the fake server; smoke runs the stack with a fake AI server and checks every message |
| T-305 (stretch) | Evaluation set: 30 example queries with the expected filters, run against the real model by a manual workflow (uses the key from a GitHub secret, needs Khai's approval to run) and reported as exact-match and per-field accuracy | Report in `docs/reports/`; used to choose 20b vs 120b |

## Risks

| Risk | Handling |
| --- | --- |
| Free limits or terms change | Limits are read from configuration, the backend caps itself, and the provider can be changed by configuration. T-301 rechecks the limits when the key is created |
| The model invents a neighborhood or a price | Strict schema with enums for neighborhoods and amenities; then our own validation; chips let the user see and remove everything |
| Prompt injection ("ignore your instructions…") | The model's only output is a filter object under a strict schema, and no tool or data is reachable, so the worst case is a wrong filter the user can see and remove |
| Personal data in queries | Groq does not train on prompts; the UI asks not to include personal details; we never log query text (only length and outcome) |
| Free backend sleeps | The T-217 notice already explains the wait |
