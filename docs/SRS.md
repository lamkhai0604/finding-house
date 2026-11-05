# Software Requirements Specification — Finding House

| Field | Value |
| --- | --- |
| Version | 0.1 (Sprint 0 draft) |
| Status | **Proposed — awaiting baseline review by the Product Owner** |
| Product Owner | Khai (lamkhai0604) |
| Standard | AI-Assisted Software Engineering Standard v1.3 |
| Last updated | 2026-11-05 |

> "Finding House" (from the repository name) is the working name; see OQ-03. Every requirement below is **Proposed** until the Product Owner records approval in [DECISIONS.md](DECISIONS.md).

## 1. Purpose

Finding House is a web application where landlords post rooms for rent and tenants find them. Tenants can search with ordinary filters or by typing a natural-language request (for example *"studio under $1,800 in Capitol Hill, pets allowed"*). An LLM turns that sentence into structured filters.

The project is a portfolio piece. Its goal is a small, working, well-tested product with traceable engineering decisions. Feature breadth is not the goal.

## 2. Users and System Boundary

| Actor | Description |
| --- | --- |
| Guest | Unauthenticated visitor. Browses, filters, and views listings, and may use AI search (subject to rate limits). |
| Tenant | Registered user looking for a room. Has everything a Guest has, plus favorites (FR-06). |
| Landlord | Registered user who creates and manages their own listings. |
| LLM provider | External system that converts search text into a JSON filter object. |

**Inside the system:** web client, REST API, database, LLM integration adapter.
**Outside the system:** LLM provider, external image hosts (listings link to images; D-017), hosting platform.

### Exclusions (not in MVP)

In-app chat, map view, roommate matching, AI-generated listing text from photos, image file upload (planned later as T-404), vector or semantic search, price-fairness estimates, payments, admin moderation tools, email verification, password reset. These may become backlog items later through change control.

## 3. Functional Requirements

Priority uses MoSCoW: **Must**, **Should**, **Could**. All statuses are **Proposed**.

### FR-01 — Account registration and login (Must)

A visitor can register as a Tenant or Landlord and log in.

Acceptance criteria:
1. Registration requires email, password (at least 8 characters), display name, and role (`TENANT` or `LANDLORD`). Landlords may add a contact phone number.
2. Registering with an email that already exists returns HTTP 409 and creates no account.
3. Passwords are stored only as a BCrypt hash.
4. A valid login returns an access token. Invalid credentials return HTTP 401 with a generic message that does not reveal whether the email exists.
5. Protected endpoints return 401 without a valid token and 403 when the role or ownership is wrong.

### FR-02 — Listing management (Must)

A Landlord can create, edit, hide, and unhide their own listings.

Acceptance criteria:
1. A listing has: title (5–100 chars), description (up to 2,000 chars), monthly price (positive integer), area in square feet (positive integer), city, neighborhood, street address, amenities (zero or more from the fixed set in §6), and 0–5 image links.
2. Each image link must be an absolute `https://` URL of at most 2,048 characters; anything else is rejected with HTTP 400. The server stores the link only and does not download the image (D-017).
3. A new listing has status `ACTIVE`. The owner can switch it between `ACTIVE` and `HIDDEN`.
4. Only the owning Landlord can edit, hide, or unhide a listing. Anyone else receives 403.
5. All validation is enforced on the server. Client-side validation is only a convenience.
6. A Landlord can see a list of all their own listings, including hidden ones.
7. A listing with no images, or an image that fails to load, is shown with a placeholder frame in the list and detail views. Clicking a loaded image opens it at full size.

### FR-03 — Browse and filter listings (Must)

Anyone can browse active listings with filters.

Acceptance criteria:
1. Only `ACTIVE` listings appear.
2. Supported filters: min price, max price, neighborhood, minimum area, amenities (a listing must have **all** selected amenities). Filters can be combined.
3. Sort options: newest first (default), price ascending, price descending.
4. Results are paginated. Default page size is 20 and the maximum is 50. The response includes the total count.
5. Invalid filter values (for example min price greater than max price, or an unknown amenity) return HTTP 400 with a field-level message.

### FR-04 — Listing detail (Must)

Anyone can open a listing to see its full information.

Acceptance criteria:
1. The detail view shows all FR-02 fields, the images, the landlord's display name, and the contact phone number if the landlord provided one.
2. A `HIDDEN` listing returns 404 to everyone except its owner.
3. A non-existent listing ID returns 404.

### FR-05 — AI natural-language search (Must)

A user types a sentence. The system converts it into FR-03 filters and shows the results.

Acceptance criteria:
1. Input is 1–300 characters. Longer input is rejected with HTTP 400.
2. The backend sends only the search text and the list of allowed filter fields and values to the LLM. No user account data is sent.
3. The LLM response is parsed as JSON and validated against the FR-03 filter rules. Unknown fields or values are dropped. If nothing valid remains, the system returns a clear "could not understand" result rather than an error.
4. The response contains the interpreted filters **and** the first page of results. The UI shows the filters as editable chips, so the user can correct what the AI understood.
5. If the LLM call fails, exceeds the timeout (5 s, configurable), or returns invalid JSON, the API responds with a defined "AI unavailable" result (not HTTP 500). The UI keeps the user's text and offers manual filters.
6. Requests are rate-limited per client (default 10 per minute, configurable) to protect the free LLM quota. Exceeding the limit returns HTTP 429, and the UI suggests manual filters.

### FR-06 — Favorites (Could)

A logged-in Tenant can save listings and see a list of saved listings.

Acceptance criteria:
1. Saving the same listing twice has no further effect (idempotent).
2. A favorited listing that later becomes `HIDDEN` does not appear in the favorites list.
3. Only the owning Tenant can see their favorites.

## 4. Nonfunctional Requirements

| ID | Category | Requirement | Target |
| --- | --- | --- | --- |
| NFR-01 | Security | Passwords hashed with BCrypt. Secrets come only from environment variables; none are committed. Authorization is enforced on the server for every protected operation. | Pass/fail checklist in TESTING |
| NFR-02 | Performance | FR-03 browse/filter response time | p95 < 500 ms with 10,000 seeded listings in the local Docker setup (**proposed target**) |
| NFR-03 | Performance | FR-05 AI search end-to-end | ≤ 6 s including the 5 s LLM timeout |
| NFR-04 | Reliability | An AI failure never prevents manual search (FR-05 AC5). | Covered by automated failure-path tests |
| NFR-05 | Cost | Running cost is $0 per month. Only free tiers are used; any paid service needs prior PO approval (D-007). | $0 |
| NFR-06 | Privacy | Demo data is synthetic. Only search text is sent to the LLM. The UI tells users not to type personal information into AI search. | Pass/fail review |
| NFR-07 | Usability | Layout works from 360 px (mobile) to desktop widths. | Manual check per release |
| NFR-08 | Maintainability | CI runs build, formatting/lint, and tests on every pull request. | All required checks green before merge |
| NFR-09 | Localization | UI and listing content in English; prices in USD; market is Seattle, WA (OQ-01, D-015) | Pass/fail review |

## 5. External Interfaces

- **REST API:** JSON over HTTPS, versioned under `/api/v1`. Endpoint list in [ARCHITECTURE.md](ARCHITECTURE.md#5-api-overview).
- **LLM provider:** HTTPS API. Provider is proposed in D-008 and accessed only through the `QueryParser` adapter.
- **Images:** links to externally hosted images (D-017). File upload to a free storage service is a later backlog item (T-404).

## 6. Data

Main entities: `User`, `Listing`, `ListingImage`, `ListingAmenity`, `Favorite`. See the ER diagram in [ARCHITECTURE.md](ARCHITECTURE.md#4-data-model).

Fixed amenity set (MVP): `AIR_CONDITIONING`, `PRIVATE_BATHROOM`, `WASHING_MACHINE`, `KITCHEN`, `PARKING`, `WIFI`, `FURNISHED`, `PETS_ALLOWED`.

Price is a monthly rent in USD, stored as an integer number of cents. Neighborhood comes from a fixed list of Seattle neighborhoods (for example Capitol Hill, University District, Ballard, Fremont, Queen Anne), defined in seed data.

## 7. Constraints, Assumptions, Dependencies

- **Constraints:** Java 21 + Spring Boot 3 backend (D-002). React + Vite + TypeScript frontend (D-003). Free tiers only (D-007).
- **Assumptions:** The market is Seattle, WA only (D-015). Expected demo traffic is low (tens of users).
- **Dependencies:** an LLM free-tier API key created by the PO; a GitHub repository (OQ-04).

## 8. Open Questions

| ID | Question | Blocks |
| --- | --- | --- |
| OQ-01 | ~~Target market~~ **Resolved:** US, Seattle WA, USD, English UI (D-015) | — |
| OQ-02 | ~~Image storage~~ **Resolved:** image links + placeholder for the MVP; upload later (D-017) | — |
| OQ-03 | Final product name | README and branding only |
| OQ-04 | ~~Repository~~ **Resolved:** `lamkhai0604/finding-house` | — |
| OQ-05 | Hosting platform for the demo (free tier) | Sprint 4 |

## 9. Traceability

| Requirement | Tasks | Design view | Verification |
| --- | --- | --- | --- |
| FR-01 | T-101, T-102 | ER | Integration tests (auth) |
| FR-02 | T-103, T-104, T-106 | ER, Use case | Integration tests (ownership, validation) |
| FR-03 | T-201, T-202, T-204 | ER | Integration tests + NFR-02 measurement |
| FR-04 | T-105 | Use case | Integration tests |
| FR-05 | T-301–T-304 | Sequence (AI search) | Unit tests with fake parser + failure-path tests |
| FR-06 | T-403 | ER | Integration tests |

Task details live in [BACKLOG.md](BACKLOG.md).
