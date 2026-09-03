# DummyJSON API Testing — Jest E2E Suite

An end-to-end API test suite built with **Jest** and **axios** against the public [DummyJSON](https://dummyjson.com) API. It's demonstrating CRUD testing, auth flow testing, and negative/error-case testing against a real, already-deployed REST API.

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [How the Suite Is Organized](#how-the-suite-is-organized)
- [Service Object Model (SOM)](#service-object-model-som)
- [Coverage by Resource](#coverage-by-resource)
- [Understanding Mock HTTP](#understanding-mock-http)
- [Understanding the Tools APIs](#understanding-the-tools-apis)
- [Scenario Tests: Beyond Isolated CRUD](#scenario-tests-beyond-isolated-crud)
- [Understanding Response-Time Assertions](#understanding-response-time-assertions)
- [Understanding Pagination Boundary Testing](#understanding-pagination-boundary-testing)
- [Understanding Idempotency & Concurrency Testing](#understanding-idempotency--concurrency-testing)
- [Understanding Smoke Test Tagging](#understanding-smoke-test-tagging)
- [Understanding Response Header Assertions](#understanding-response-header-assertions)
- [Understanding Contract Drift Detection](#understanding-contract-drift-detection)
- [Understanding sortBy/order and select Query Params](#understanding-sortbyorder-and-select-query-params)
- [Understanding Cross-Resource Referential Integrity](#understanding-cross-resource-referential-integrity)
- [Understanding Auth Token Edge Cases](#understanding-auth-token-edge-cases)
- [Schema Validation with Zod](#schema-validation-with-zod)
- [Continuous Integration (CI)](#continuous-integration-ci)
- [Conventions](#conventions)
- [Important Notes & Gotchas](#important-notes--gotchas)
- [API Testing Interview Questions & Answers](#api-testing-interview-questions--answers)

## Overview

- **Target API:** DummyJSON (`https://dummyjson.com`) — external, no API key required, CORS enabled.
- **Writes are simulated.** `POST`/`PUT`/`PATCH`/`DELETE` calls return realistic responses (echoed payload, generated IDs, `isDeleted` flags) but **nothing is actually persisted server-side**. Tests assert on response shape/status/echoed values, never on data surviving between requests.
- **No mocking, no Supertest.** Since the API is already live and external, every test in this suite makes a real HTTP call with `axios`.

## Tech Stack

| Tool | Purpose |
|---|---|
| [Jest](https://jestjs.io/) | Test runner & assertion library |
| [axios](https://axios-http.com/) | HTTP client for calling the DummyJSON API |
| [zod](https://zod.dev/) | Schema/contract validation for response shapes (see below) |
| [jest-html-reporters](https://github.com/Hazyzh/jest-html-reporters) | Generates the HTML test report published to GitHub Pages |
| [Docker](https://www.docker.com/) | Runs the suite in a container, no local Node setup needed |
| Node.js | Runtime |

## Project Structure

```
.
├── tests/
│   ├── products.test.js   # Full CRUD + search/filter + negative cases
│   ├── users.test.js      # Full CRUD + search/filter + negative cases
│   ├── auth.test.js       # Login, protected route, token refresh
│   ├── carts.test.js      # CRUD tied to a user ID
│   ├── posts.test.js      # Lighter CRUD coverage
│   ├── comments.test.js   # CRUD + lookup by post ID
│   ├── recipes.test.js    # CRUD + search/tags/meal-type filters
│   ├── todos.test.js      # CRUD + random todo
│   ├── quotes.test.js     # Read-only + random quote (no write endpoints)
│   ├── mockHttp.test.js   # Simulated status codes via /http/{code} (utility, not CRUD)
│   ├── tools.test.js      # 2FA TOTP, Custom Response, Webhook (three utility APIs)
│   ├── userJourney.test.js # Chained scenario: login → view cart → update → checkout
│   ├── performance.test.js # Response-time assertions across key endpoints
│   ├── pagination.test.js # limit/skip boundary and negative-value tests across list endpoints
│   ├── idempotency.test.js # Repeated-call and parallel-request behavior (DELETE, PUT, concurrent PATCH/POST)
│   ├── responseHeaders.test.js # Content-Type, CORS, rate-limit, and baseline security headers
│   ├── contractDrift.test.js # Strict-schema checks that catch unexpected/added fields
│   ├── queryParams.test.js # sortBy/order and select query params across list endpoints
│   ├── referentialIntegrity.test.js # Cross-resource foreign-key-style checks (category, userId, postId, productId)
│   └── authTokenEdgeCases.test.js # Tampered JWTs, malformed refresh tokens, expiresInMins behavior
├── .github/
│   ├── dependabot.yml      # Weekly automated PRs for outdated/vulnerable dependencies
│   └── workflows/
│       ├── ci.yml               # Runs the full suite on every push/PR to main, publishes the report to GitHub Pages
│       └── daily-jest-tests.yml # Runs the suite daily on a schedule, posts results to Discord
├── helpers/
│   ├── apiClient.js       # Shared axios instance (base URL + status handling + response timing)
│   ├── productsApi.js     # Service object — wraps every /products endpoint
│   ├── usersApi.js        # Service object — wraps every /users endpoint
│   ├── authApi.js         # Service object — wraps every /auth endpoint
│   ├── cartsApi.js        # Service object — wraps every /carts endpoint
│   ├── postsApi.js        # Service object — wraps every /posts endpoint
│   ├── commentsApi.js     # Service object — wraps every /comments endpoint
│   ├── recipesApi.js      # Service object — wraps every /recipes endpoint
│   ├── todosApi.js        # Service object — wraps every /todos endpoint
│   ├── quotesApi.js       # Service object — wraps every /quotes endpoint
│   ├── mockHttpApi.js     # Service object — wraps every /http/{code} verb
│   ├── totpApi.js         # Service object — wraps /2fa (GET + POST)
│   ├── customResponseApi.js # Service object — wraps /c/generate + calling the generated URL
│   └── webhookApi.js      # Service object — wraps every /webhook/* endpoint
├── schemas/
│   ├── productSchema.js   # Zod contract for a product item
│   ├── userSchema.js      # Zod contract for a user item
│   ├── cartSchema.js      # Zod contract for a cart item
│   └── postSchema.js      # Zod contract for a post item
├── jest.setup.js          # Registers the custom `toMatchSchema` / `toRespondWithin` matchers
├── jest.config.js         # Points Jest at jest.setup.js + configures the HTML report
├── report/                # Generated HTML test report (gitignored, not committed)
├── Dockerfile              # Container image that runs the suite via `npm test`
├── .dockerignore
├── package.json
├── CLAUDE.md              # Project spec / working notes for AI-assisted development
└── README.md              # You are here
```

## Getting Started

```bash
npm install
```

No environment variables or API keys are needed — the suite talks directly to `https://dummyjson.com`.

**Or run it with Docker, no Node install needed:**

```bash
docker build -t dummyjson-api-tests .
docker run --rm dummyjson-api-tests
```

## Running Tests

```bash
# Run the entire suite
npm test

# Run just the smoke subset — a fast, broad health check (see below)
npm run test:smoke

# Run a single file
npx jest tests/products.test.js

# Watch mode (re-runs on file changes)
npx jest --watch
```

Expected result: **20 suites / 175 tests, all passing**, run live against the real API (no internet access = failures, since there's nothing to mock). `npm run test:smoke` runs a 9-test subset in a couple of seconds — see [Understanding Smoke Test Tagging](#understanding-smoke-test-tagging).

## How the Suite Is Organized

Each resource gets its own test file under `tests/`, structured the same way:

```js
describe('<Resource> API', () => {
  describe('Create', () => { ... });
  describe('Read', () => { ... });
  describe('Update', () => { ... });
  describe('Delete', () => { ... });
  describe('negative cases', () => { ... });
});
```

One test per resource additionally carries an ` @smoke` suffix on its title, marking it as part of the fast subset run by `npm run test:smoke` — see [Understanding Smoke Test Tagging](#understanding-smoke-test-tagging).

Tests never call `axios`/`apiClient` directly — they call a **service object** method instead (see below). Underneath that, every service object is built on the shared `apiClient` in `helpers/apiClient.js`, which:
- Fixes the base URL to `https://dummyjson.com` so calls only reference paths (`/products/1`, not the full URL).
- Sets `validateStatus: () => true`, so 4xx/5xx responses resolve normally instead of throwing — this lets negative-case tests assert on `res.status` and `res.data.message` directly instead of wrapping calls in `try/catch`.
- Stamps every response with `response.duration` (ms), via a request/response interceptor pair, so any test can assert on latency without tracking timing itself. See [Understanding Response-Time Assertions](#understanding-response-time-assertions).

## Service Object Model (SOM)

This suite uses the **Service Object Model** — the API-testing equivalent of the **Page Object Model (POM)** used in UI test automation.

**In POM**, you don't put CSS selectors and clicks directly in your test files — you wrap them in a `LoginPage` class with methods like `login(username, password)`. The test reads like a scenario; the page's mechanics live in one place.

**In SOM**, the same idea applies to endpoints instead of pages. Each resource gets a small module — `helpers/productsApi.js`, `helpers/usersApi.js`, `helpers/authApi.js`, `helpers/cartsApi.js`, `helpers/postsApi.js`, `helpers/commentsApi.js`, `helpers/recipesApi.js`, `helpers/todosApi.js`, `helpers/quotesApi.js`, `helpers/mockHttpApi.js`, `helpers/totpApi.js`, `helpers/customResponseApi.js`, `helpers/webhookApi.js` — that wraps its raw HTTP calls behind readable methods:

```js
// helpers/productsApi.js
const { apiClient } = require('./apiClient');

const productsApi = {
  list:       (params) => apiClient.get('/products', { params }),
  getById:    (id) => apiClient.get(`/products/${id}`),
  search:     (q) => apiClient.get('/products/search', { params: { q } }),
  byCategory: (category) => apiClient.get(`/products/category/${category}`),
  create:     (payload) => apiClient.post('/products/add', payload),
  update:     (id, payload) => apiClient.put(`/products/${id}`, payload),
  patch:      (id, payload) => apiClient.patch(`/products/${id}`, payload),
  remove:     (id) => apiClient.delete(`/products/${id}`),
};

module.exports = { productsApi };
```

Test files then call the service object instead of building requests inline:

```js
// Before (raw apiClient)
const res = await apiClient.get(`/products/${id}`);

// After (service object)
const res = await productsApi.getById(id);
```

**Why this matters:**
- **Single source of truth per endpoint.** If DummyJSON ever changes a path or a query param name, there's exactly one line to update — not one per test that happened to call it.
- **Readable tests.** `productsApi.byCategory('smartphones')` reads like a sentence; `apiClient.get('/products/category/smartphones')` reads like a URL.
- **Reusable across files.** `authApi.login(...)` is called both in `auth.test.js`'s own tests and in its `beforeAll` — and could be reused by any future test file that needs a token first (e.g. an authenticated cart flow).
- **A seam for future growth.** If the suite later needs retries, request logging, or default headers for one resource only, that goes in its service object without touching a single test.

**Trade-off:** for a suite this size, it's one extra file to open per resource. It pays for itself as soon as more than one test file needs to call the same endpoint, or an endpoint's shape changes.

## Coverage by Resource

### Products (`tests/products.test.js`)
- **Create:** `POST /products/add` — echoes title/price/category, checks `id` type
- **Read:** `GET /products` (default pagination shape, every item validated against `schemas/productSchema.js`), `/products/{id}` (schema-validated), `/products/search?q=` (schema-validated + results actually contain the query), `/products/category/{category}` (schema-validated + non-empty + every result matches), `/products/categories` (each entry's `slug`/`name`/`url` shape). See [Schema Validation with Zod](#schema-validation-with-zod)
- **Update:** `PUT /products/{id}` (full), `PATCH /products/{id}` (partial) — also asserts unmodified fields still reflect the original seed product, confirming the API merges the payload onto the existing record rather than just echoing it back
- **Delete:** `DELETE /products/{id}` — checks `isDeleted`, `deletedOn` type, original fields preserved
- **Negative:** out-of-range ID → 404 (or 429 if rate-limited) with a `message` body, update/delete non-existent ID → 404 (or 429) with a `message` body, unknown category → empty list (200)

### Users (`tests/users.test.js`)
- **Create:** `POST /users/add` — echoes firstName/lastName/age, checks `id` type
- **Read:** `GET /users` (default pagination shape, every item validated against `schemas/userSchema.js`), `/users/{id}` (schema-validated), `/users/search?q=` (schema-validated + results actually contain the query), `/users/filter?key=&value=` (schema-validated + non-empty + every result matches)
- **Update:** `PUT /users/{id}`, `PATCH /users/{id}` — also asserts unmodified fields still reflect the original seed user, confirming the API merges the payload onto the existing record rather than just echoing it back
- **Delete:** `DELETE /users/{id}` — checks `isDeleted`, `deletedOn` type, original fields preserved
- **Negative:** out-of-range ID → 404 (or 429 if rate-limited) with a `message` body, update/delete non-existent ID → 404 (or 429) with a `message` body, filter with no matches → empty list

### Auth (`tests/auth.test.js`)
- **Login:** `POST /auth/login` with known-valid test credentials (`emilys` / `emilyspass`) — returns access + refresh tokens matching JWT shape (`header.payload.signature`), echoed `id`/`email`/`firstName`/`lastName`, and confirms `password` is never present in the response
- **Protected route:** `GET /auth/me` with a valid Bearer token (200, checks `id`/`email`/`address`/`company`/`role` shape), no token (401), invalid token (401) — both rejections check the `message` body is a string
- **Refresh:** `POST /auth/refresh` with a valid refresh token (200, new tokens match JWT shape), missing token (401 with a `message` body)
- **Negative:** wrong password (400), missing required field (400), unknown username (400) — all three check a `message` body is present and that no `accessToken` leaks into an error response

### Auth Token Edge Cases (`tests/authTokenEdgeCases.test.js`)
- **Not a resource — deeper coverage of `auth`'s own edge cases.** See [Understanding Auth Token Edge Cases](#understanding-auth-token-edge-cases) below for why these are distinct from `auth.test.js`'s existing negative cases.
- **Tampered JWT:** a syntactically valid three-segment token with a garbage signature returns `500` with an `"invalid signature"` message — not `401` like every other invalid-token case, a real inconsistency found by testing it directly
- **Missing `Bearer` scheme:** an `Authorization` header with a raw value and no `Bearer ` prefix → `401`
- **Invalid (not just missing) refresh token:** a garbage, non-JWT refresh token value → `403`, distinct from `auth.test.js`'s *missing* refresh token case, which is `401`
- **`expiresInMins`:** a custom lifetime (`1`) produces a token whose `exp - iat` is exactly that many minutes; omitting the field entirely defaults to 1 hour; **explicitly passing `expiresInMins: 0`** is treated as falsy and produces a 30-day token instead of an immediate expiry — the intuitive "0 means now" reading is wrong, the same shape of surprise as `limit=0` meaning "no limit" in [Understanding Pagination Boundary Testing](#understanding-pagination-boundary-testing)

### Carts (`tests/carts.test.js`)
- **Create:** `POST /carts/add` — tied to a `userId`, echoes `products[]` (id/quantity per line item), checks `totalProducts`/`totalQuantity` match the payload
- **Read:** `GET /carts` (default pagination shape, every item validated against `schemas/cartSchema.js`), `/carts/{id}` (schema-validated + `totalProducts` consistency), `/carts/user/{userId}` (schema-validated + non-empty + every result matches, `totalProducts` consistency)
- **Update:** `PUT /carts/{id}` (`merge: false` — asserts the product list is *replaced*, not appended), `PATCH /carts/{id}` (`merge: true` — asserts the product list is *appended to* the original seed cart, not replaced)
- **Delete:** `DELETE /carts/{id}` — checks `isDeleted`, `deletedOn` type, original `userId` preserved
- **Negative:** out-of-range cart ID → 404 (or 429 if rate-limited) with a `message` body, update/delete non-existent cart → 404 (or 429) with a `message` body, user with no carts → 404 (or 429) (confirmed against the live API — DummyJSON does **not** return an empty array here)

### Posts (`tests/posts.test.js`)
- **Create:** `POST /posts/add` — echoes title/body/userId, checks `id` type
- **Read:** `GET /posts` (default pagination shape, every item validated against `schemas/postSchema.js`), `/posts/{id}` (schema-validated), `/posts/search?q=` (schema-validated + results actually contain the query, matched across title *and* body)
- **Update:** `PUT /posts/{id}` — also asserts unmodified fields (`userId`, `tags`) still reflect the original seed post, confirming the API merges the payload onto the existing record rather than just echoing it back
- **Delete:** `DELETE /posts/{id}` — checks `isDeleted`, `deletedOn` type, original title preserved
- **Negative:** out-of-range ID → 404 (or 429 if rate-limited) with a `message` body, update/delete non-existent ID → 404 (or 429) with a `message` body

### Comments (`tests/comments.test.js`)
- **Create:** `POST /comments/add` — echoes body/postId, checks nested `user.id` matches the payload's `userId`, checks `id` type
- **Read:** `GET /comments` (default pagination shape + item field types, including nested `user`), `/comments/{id}` (body/postId/likes/`user.username` shape), `/comments/post/{postId}` (non-empty + every result's `postId` matches)
- **Update:** `PUT /comments/{id}` — also asserts unmodified fields (`postId`, `user`) still reflect the original seed comment, confirming the API merges the payload onto the existing record rather than just echoing it back
- **Delete:** `DELETE /comments/{id}` — checks `isDeleted`, `deletedOn` type, original body preserved
- **Negative:** out-of-range ID → 404 (or 429 if rate-limited) with a `message` body, update/delete non-existent ID → 404 (or 429) with a `message` body

### Recipes (`tests/recipes.test.js`)
- **Create:** `POST /recipes/add` — echoes name/ingredients/difficulty/userId, checks `id` type. **Note:** unlike most other resources, this endpoint returns `200` on success, not `201` (confirmed against the live API)
- **Read:** `GET /recipes` (default pagination shape + item field types), `/recipes/{id}` (prep/cook time, servings, rating range, tags/mealType shape), `/recipes/search?q=` (results actually contain the query), `/recipes/tags` (non-empty flat list), `/recipes/tag/{tag}` (non-empty + every result's `tags` includes it), `/recipes/meal-type/{type}` (non-empty + every result's `mealType` includes it)
- **Update:** `PUT /recipes/{id}` — also asserts unmodified fields (`cuisine`, `ingredients`) still reflect the original seed recipe, confirming the API merges the payload onto the existing record rather than just echoing it back
- **Delete:** `DELETE /recipes/{id}` — checks `isDeleted`, `deletedOn` type, original name preserved
- **Negative:** out-of-range ID → 404 (or 429 if rate-limited) with a `message` body, update/delete non-existent ID → 404 (or 429) with a `message` body, unknown tag → empty list (200)

### Todos (`tests/todos.test.js`)
- **Create:** `POST /todos/add` — echoes todo/completed/userId, checks `id` type
- **Read:** `GET /todos` (default pagination shape + item field types), `/todos/{id}` (todo/completed/userId shape), `/todos/random` (same shape, no id assumed)
- **Update:** `PUT /todos/{id}` — also asserts unmodified fields (`todo`, `userId`) still reflect the original seed todo, confirming the API merges the payload onto the existing record rather than just echoing it back
- **Delete:** `DELETE /todos/{id}` — checks `isDeleted`, `deletedOn` type, original `todo` text preserved
- **Negative:** out-of-range ID → 404 (or 429 if rate-limited) with a `message` body, update/delete non-existent ID → 404 (or 429) with a `message` body

### Quotes (`tests/quotes.test.js`)
- **Read-only resource** — DummyJSON's docs list no add/update/delete endpoint for `/quotes`, so this file has no Create/Update/Delete blocks (like `auth.test.js`, it departs from the standard CRUD shape by design, not by omission)
- **Read:** `GET /quotes` (default pagination shape + item field types), `/quotes/{id}` (quote/author shape), `/quotes/random` (same shape, no id assumed)
- **Negative:** out-of-range ID → 404 (or 429 if rate-limited) with a `message` body

### Mock HTTP (`tests/mockHttp.test.js`)
- **Utility resource, not a data resource** — see [Understanding Mock HTTP](#understanding-mock-http) below for what this endpoint is and why it's tested at all
- **Success codes:** `GET /http/200` → `{ status: 200, message: "OK" }`; `GET /http/201` → `"Created"`; `GET /http/204` → empty body
- **Redirect / error codes:** `GET /http/301`, `/http/404`, `/http/429`, `/http/500` — each returns its standard reason phrase as the `message`
- **Custom messages:** `GET /http/200/All_good` and `GET /http/400/Missing_field_email` — confirms the path segment after the code overrides the default message
- **Method-agnostic:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE` all honor the same mocked code — confirmed by firing all five verbs at `/http/200` in parallel
- **Negative:** `GET /http/999` (an unsupported/invalid status code) → the *mock endpoint itself* returns `500` with a `message` explaining the code isn't supported — a good reminder that even a "give me any status you want" endpoint has its own failure mode

### Tools (`tests/tools.test.js`)
Three unrelated utility APIs, grouped in one file since none of them model a CRUD entity. See [Understanding the Tools APIs](#understanding-the-tools-apis) below for what each one is for and when you'd reach for it.
- **2FA TOTP:** `GET /2fa?key=` and `POST /2fa` (body `{ key }`) — both return a live 6-digit code (`totp` matches `/^\d{6}$/`), `period: 30`, `expiresIn` in `[0, 30]`. Negative: missing key → 400, malformed key → 400 (both via `POST`, since `GET /2fa` with no `key` serves the tool's HTML landing page instead of JSON — see gotchas)
- **Custom Response:** `POST /c/generate` (body `{ json, method }`) creates a URL; calling it with the configured method echoes `json` back exactly. Calling it with the *wrong* method → 404. Omitting `method` from the create payload → 500 with a validation `message`
- **Webhook:** `POST /webhook/create` → `{ identifier, url, expiresAt }`; sending any request to `/webhook/{identifier}` captures it (`{ received: true, requestId }`); `GET /webhook/{identifier}/requests` lists captures with full method/headers/body; `DELETE /webhook/{identifier}/requests/{requestId}` removes one. Negative: listing requests for an unknown identifier → 404

### User Journey (`tests/userJourney.test.js`)
- **Not a resource — a scenario.** A single ordered chain across Auth, Users, and Carts, reusing only existing service objects (no new `helpers/` file). See [Scenario Tests: Beyond Isolated CRUD](#scenario-tests-beyond-isolated-crud) below for why this file exists and how it differs from every other file in the suite.
- **Step 1:** `POST /auth/login` — captures `accessToken` and the logged-in `userId`/`email`
- **Step 2:** `GET /auth/me` with that token — confirms it authenticates as the same `userId`/`email` from step 1
- **Step 3:** `GET /users/{id}` with that `userId` — cross-checks `email` matches across two different resources (`/auth` vs `/users`)
- **Step 4:** `GET /carts/user/{userId}` — reads the user's real seed cart, capturing its `id` and current product list
- **Step 5:** `PATCH /carts/{id}` (`merge: true`) — adds one new product, asserts the product count grew by exactly one relative to step 4's real data
- **Step 6:** `DELETE /carts/{id}` — "checks out," asserting the deleted cart's `userId` still matches the `userId` from step 1

### Performance (`tests/performance.test.js`)
- **Not a resource — a non-functional check.** See [Understanding Response-Time Assertions](#understanding-response-time-assertions) below for why response time is tested at all, and how it differs from every functional test in this suite.
- **Response time:** a representative read/write across four resources — `GET /products`, `GET /products/{id}`, `GET /products/search`, `GET /users`, `GET /users/{id}`, `POST /auth/login`, `GET /posts` — each asserted to resolve within a generous 3000ms budget via the custom `toRespondWithin` matcher, using the `duration` every response is stamped with by `helpers/apiClient.js`
- **No dedicated negative block** — there's no "invalid" way to time a request; a timeout or a blown budget *is* the failure this file exists to catch

### Pagination (`tests/pagination.test.js`)
- **Not a resource — a cross-cutting contract check.** See [Understanding Pagination Boundary Testing](#understanding-pagination-boundary-testing) below for what this file catches that the per-resource Read blocks don't.
- **`limit=0` means "no limit":** `GET /products`, `/users`, `/posts` with `limit=0` each return *every* item, not zero — and the echoed `limit` field equals `total`, not `0`
- **The echoed `limit` reflects the actual page size, not the requested one:** a full page echoes the requested limit; a partial last page (requesting more than remains) echoes the smaller actual count; `skip` past the end of the collection echoes `0` — all asserted against `products` specifically, with `total` confirmed to still reflect the real collection size even when the current page is empty
- **Negative/non-numeric `skip`/`limit` are rejected, not clamped:** `skip=-1`, `limit=-1` → `400` with a `message` mentioning the offending field, checked across `/products`, `/users`, `/posts`; `limit=abc` / `skip=abc` → `400`, checked on `/products`

### Idempotency & Concurrency (`tests/idempotency.test.js`)
- **Not a resource — repeated- and parallel-call behavior.** See [Understanding Idempotency & Concurrency Testing](#understanding-idempotency--concurrency-testing) below for what this file can and can't prove against a stateless mock, and why that distinction matters.
- **Repeated DELETE:** calling `DELETE /products/{id}` (and separately `/users/{id}`) twice in a row returns `200` + `isDeleted: true` **both** times, rather than `404` on the second call — documenting how DummyJSON's simulated deletes differ from a real backend's
- **Idempotent PUT:** the same `PUT /products/{id}` payload sent twice produces an identical response body both times
- **Concurrent PATCH:** 5 parallel `PATCH /products/1` calls, each with a different payload (fired via `Promise.all`), each resolve with **their own** echoed value — no cross-contamination between simultaneous requests
- **Concurrent POST:** 3 parallel `POST /products/add` calls all succeed and each echoes its own payload correctly, but all three are handed the **same** simulated `id` — documenting that this mock computes "next id" statelessly per-request rather than persisting a real counter, unlike a production backend under concurrent writes

### Response Headers (`tests/responseHeaders.test.js`)
- **Not a resource — the full HTTP contract, not just the body.** See [Understanding Response Header Assertions](#understanding-response-header-assertions) below for why this is a separate concern from the body-shape checks the rest of the suite already does.
- **Content-Type:** a successful read, a `404`, and a successful create all respond `application/json` — confirmed across both success and error paths, not just the happy path
- **CORS:** sending an explicit `Origin` header gets it echoed back verbatim in `Access-Control-Allow-Origin` (plus `Access-Control-Allow-Credentials: true`); omitting `Origin` (axios in Node never adds one automatically) means `Access-Control-Allow-Origin` is absent entirely — DummyJSON reflects the caller's origin rather than allowing `*`
- **Rate-limit visibility:** every response carries `X-RateLimit-Limit`/`X-RateLimit-Remaining` — the documented explanation for why this project's negative-case assertions already accept `429` alongside `404`/`400` (see [Important Notes & Gotchas](#important-notes--gotchas))
- **Baseline security header:** `X-Content-Type-Options: nosniff` is present on every response

### Contract Drift Detection (`tests/contractDrift.test.js`)
- **Not a resource — a stricter re-check of contracts the other tests already trust.** See [Understanding Contract Drift Detection](#understanding-contract-drift-detection) below for what this catches that the schema-validated Read tests don't.
- **Products, users, carts, posts:** `GET /{resource}/{id}` for each is checked against its existing schema (`schemas/productSchema.js`, `userSchema.js`, `cartSchema.js`, `postSchema.js`) called in `.strict()` mode, which fails on any field the schema doesn't declare — not just a field that's missing or the wrong type
- **A real gap this immediately found:** writing this test's `userSchema.strict()` check against the live `/users/{id}` response failed on first run — `password`, `ip`, `macAddress`, `ein`, `ssn`, `userAgent`, and `crypto` are all real fields DummyJSON returns that `schemas/userSchema.js` didn't declare. The schema was updated to include them (verified present across all 208 seed users first) rather than loosening the test — see [Understanding Contract Drift Detection](#understanding-contract-drift-detection) for the full story

### List Query Parameters (`tests/queryParams.test.js`)
- **Not a resource — two more query params `pagination.test.js` doesn't cover.** See [Understanding sortBy/order and select Query Params](#understanding-sortbyorder-and-select-query-params) below for what curling these up found.
- **`sortBy`/`order`:** `sortBy=price` alone sorts ascending by default; `order=desc` reverses it; the same params sort a *different* resource (`users` by `age`) correctly too, confirming shared platform behavior — but an unrecognized `sortBy` field is silently ignored (`200`, unsorted) rather than erroring, and an invalid `order` value only triggers a `400` when `sortBy` is also present — `order` alone is a no-op
- **`select`:** trims the response to just the requested fields, plus `id` (always included, even if not requested); an unrecognized field name is silently ignored, same as `sortBy`; composes correctly with `sortBy`/`order` at the same time — the trimmed shape is still sorted right

### Referential Integrity (`tests/referentialIntegrity.test.js`)
- **Not a resource — a check on the seed dataset itself, not on any one endpoint.** See [Understanding Cross-Resource Referential Integrity](#understanding-cross-resource-referential-integrity) below for why this is a different failure class than every other file in this suite catches.
- **Products → categories:** every `product.category` returned by `GET /products?limit=0` actually exists in `GET /products/categories`
- **Posts → users:** every `post.userId` resolves to a real user id from `GET /users?limit=0`
- **Comments → posts, comments → users:** every `comment.postId` resolves to a real post; every `comment.user.id` resolves to a real user
- **Carts → users, carts → products:** every `cart.userId` resolves to a real user; every product `id` referenced inside a cart's `products[]` resolves to a real product
- **All six checks run off exactly 6 HTTP calls total** — every list is fetched once with `limit=0` in a `beforeAll`, and every check afterward is an in-memory `Set` lookup, not a network call

## Understanding Mock HTTP

If this is your first time seeing the term, here's the mental model.

**What "mocking" means, generally.** A mock is a fake stand-in for something real — used so you can control its behavior precisely, instead of depending on the real thing actually doing that. In testing, you mock things that are slow, external, non-deterministic, or hard to force into a specific state on demand.

**What DummyJSON's Mock HTTP endpoint specifically does.** `GET /http/{code}` (or `POST`/`PUT`/`PATCH`/`DELETE` — the verb doesn't matter) makes the server *deliberately* respond with whatever HTTP status code you ask for in the URL:

```bash
curl https://dummyjson.com/http/200   # → HTTP 200 {"status":200,"message":"OK"}
curl https://dummyjson.com/http/404   # → HTTP 404 {"status":404,"message":"Not Found",...}
curl https://dummyjson.com/http/500   # → HTTP 500 {"status":500,"message":"Internal Server Error",...}
```

You can even override the message: `GET /http/404/Missing_field_email` returns a 404 whose `message` is `"Missing_field_email"` instead of the default `"Not Found"`.

**Why this is useful — the actual problem it solves.** Every other endpoint in this suite (`/products`, `/carts`, `/comments`, …) only returns the status codes DummyJSON's real logic happens to produce: `200` on a normal read, `404` on a bad ID, and so on. You have **no way to force a `500`, a `429`, or a `503` from those endpoints on demand** — the real backend simply doesn't fail that way when you ask nicely. `/http/{code}` sidesteps that: it's a dedicated endpoint whose entire job is "return exactly the status I asked for," so you can exercise response handling for codes the rest of the API will never naturally produce in a test run.

**When you'd actually reach for something like this (the urgency/importance angle):**
- **Testing error-handling code paths that are otherwise untestable.** If your app has a "show a friendly message on 500" branch, or a "retry on 429/503" policy, or a "redirect on 301" handler — you can't reliably trigger those from a well-behaved API. A mock endpoint lets you prove that code path actually works, not just that it compiles.
- **CI/CD pipelines that need deterministic failures.** A flaky "sometimes the real API 500s" test is worse than no test. Mocking a guaranteed 500 gives you a repeatable, non-flaky assertion.
- **Contract/negative testing without touching real state.** You get to test "what does my client do with a 429" without actually needing to trigger real rate-limiting (which would also throttle every *other* test running against the same API).
- **Frontend/client development before a backend endpoint exists or is reachable.** Point your app at a mock and build the UI for every status code it should eventually handle.

**When you *don't* need it.** If the real endpoint already produces the status you're testing naturally — e.g. `GET /products/999999` really does return `404` — just test that directly, as the rest of this suite does. Reach for `/http/{code}` specifically for codes the real API can't be coaxed into returning on demand (`500`, `503`, `429`, arbitrary `3xx`, etc.), or when you want a guaranteed, flake-free status for a CI assertion.

**A naming collision worth flagging.** This README's [Overview](#overview) says the suite does "no mocking" — that refers to **not mocking axios/the network layer** (every test still makes a real HTTP call; nothing is faked at the JavaScript level). DummyJSON's Mock HTTP feature is a completely different thing: **the *server itself*, as a real feature, agrees to fake its own response code for you.** The request is 100% real; only the status code is synthetic. Both statements are true at once — worth keeping straight since "mock" gets used both ways in this project.

## Understanding the Tools APIs

Mock HTTP fakes one thing: a status code. The three Tools APIs go a step further — each one gives you something *generated on demand* that you couldn't get any other way in this test suite. Here's what each is, why it exists, and when you'd actually reach for it.

### 2FA TOTP (`/2fa`, alias `/totp`)

**What it is.** TOTP (Time-based One-Time Password) is the 6-digit code your phone's authenticator app (Google Authenticator, Authy, etc.) shows you during 2-factor login — a code derived from a shared secret plus the current time, that changes every 30 seconds. `GET /2fa?key={secret}` or `POST /2fa` with `{ "key": "..." }` computes a **real** TOTP code from whatever secret you pass in — it's not a fake/random number, it's the actual algorithm (RFC 6238) real authenticator apps use.

**Why this matters / when you'd need it.** If you're testing a login flow that requires a 2FA code as a second step, you normally can't automate past it — the code is generated on a device (or app) you don't control from a test script, and it expires in 30 seconds. This endpoint solves that: give it the *same secret* your test account was enrolled with, and it hands back the current valid code your automated test can submit — no human, no phone, no waiting. This is the difference between "our E2E suite can only test up to the 2FA screen" and "our E2E suite can log all the way in."

**Condition for using it:** you need a *real, currently-valid* time-based code to submit to something that verifies it — almost always a login/step-up-auth flow in an E2E test. Prefer `POST` over `GET` for this in real usage, since a `GET` query param can end up in browser history or server access logs — a `key` is a secret, and it shouldn't be sitting in plaintext in a log file. This test suite uses `dummyjson.com` as an already-public sandbox, so it's low-stakes here — but the habit is worth keeping for real secrets.

### Custom Response (`/c/generate` + the URL it returns)

**What it is.** You `POST` a JSON payload and an HTTP method to `/c/generate`; DummyJSON hands back a brand-new, unique URL. Calling *that* URL with the method you specified returns your JSON back, verbatim, as if it were a real API you'd built. It's a tiny hosted stub server, generated on the fly, that persists for 90 days.

**Why this matters / when you'd need it.** Say your frontend needs to call `GET /api/inventory/status` and you want to build/demo the UI *before* that backend endpoint exists, or the person who owns it hasn't shipped it yet. You can't point axios at a URL that returns 404 — there's nothing there. `/c/generate` gives you a real, callable URL you can hand to your frontend right now, that returns exactly the shape you'll eventually get from the real thing. It's also useful for testing "does my client correctly call this exact endpoint with this exact method," since the mocked endpoint enforces the method you configured (call it the wrong way and it 404s).

**Condition for using it:** you need a **stable, shareable URL** that returns a fixed, pre-defined response — not just a status code (that's Mock HTTP's job), but real structured data. Reach for this over Mock HTTP whenever the response *body* is the thing under test, not just the status.

### Webhook (`/webhook/create` + `/webhook/{identifier}`)

**What it is.** `POST /webhook/create` mints a unique inbox URL. Anything sent to that URL — any method, any body, any headers — gets captured and stored (up to 100 requests, expiring after 1 day). `GET /webhook/{identifier}/requests` lets you look at everything that arrived, with full method/headers/body/timestamp per request.

**Why this matters / when you'd need it.** Some things you build don't return a response to the caller at all — they *call out* to someone else. A "when an order ships, notify this webhook URL" feature, a Slack/Discord integration, a payment provider's "here's what happened" callback. You can't assert on those with a normal HTTP response check, because from the code under test's point of view, there's nothing to assert on — it just fired a request and moved on. A webhook capture URL solves this: point the outbound call at it, then afterward ask "what actually arrived?" and assert on *that*.

**Condition for using it:** you're testing code that **sends** an HTTP request as a side effect (a notification, a callback, an event) rather than code that **receives** one. If you're testing the caller (does our system attempt the callback with the right payload), this is what you want; if you're testing the receiver (does our webhook handler correctly parse an incoming payload), you'd usually send *to* your own endpoint instead.

### The common thread

All three Tools APIs share a shape Mock HTTP doesn't: **they hand you back something freshly generated** — a code, a URL, an inbox — that only exists because you asked for it, and that you then use in a second step. That's the tell for "I need one of the Tools APIs" instead of a fixed-response mock: you don't just need a canned reply, you need something dynamic that didn't exist a moment ago and that only your test run owns.

## Scenario Tests: Beyond Isolated CRUD

Every other file in this suite tests one resource's endpoints independently — each `it` block sets up its own state, makes one call, and asserts on it, with no dependency on any other test. That's the right default: independent tests are easy to run in isolation, easy to debug (a failure means exactly one thing broke), and safe to run in any order.

`tests/userJourney.test.js` is different on purpose. It's a **chained scenario** — a sequence of steps modeling one realistic user session (log in → confirm identity → view your cart → add an item → check out), where each step's assertions use data produced by the step *before* it (the `userId` from login is the one checked against `/users/{id}`; the real cart `id` found in step 4 is the one patched in step 5 and deleted in step 6).

**Why this is worth having, beyond per-resource CRUD tests.** Isolated CRUD tests answer "does this one endpoint work correctly given a well-formed request?" They don't answer "does data actually flow correctly *between* endpoints the way a real user's session would?" Those are different failure modes. An API can pass every isolated CRUD test and still be broken end-to-end — e.g. if the `id` returned by login didn't actually match the `id` used elsewhere, every individual endpoint test would still pass (each one uses its own hardcoded id), and only a chained test would catch the mismatch. That's the gap this file targets.

**The trade-off, stated plainly.** This file breaks the "tests are independent" rule the rest of the suite follows: its six `it` blocks share mutable state via a `session` object and must run in the order they're written. That's a real cost — you can't `jest -t "step 5"` in isolation and expect it to pass, and a failure in step 2 will cascade into failures in steps 3–6 even though nothing is actually wrong with them. It's an intentional, contained exception (one file, clearly commented), not the suite's normal pattern — the other 11 files stay independent.

**When to reach for this pattern vs. per-resource tests:**
- **Per-resource CRUD tests** (the other 11 files) — for verifying each endpoint's contract in isolation: status codes, response shape, negative cases. This is most of what a suite needs, and it's what makes failures easy to localize.
- **A scenario/chained test** (this file) — for the handful of workflows that actually matter end-to-end in your product (login → checkout being the canonical example for anything with auth + a cart). You don't want dozens of these — they're slower to write, harder to debug, and redundant with the CRUD tests for anything they don't specifically chain. A small number of high-value journeys, on top of solid per-resource coverage, is the combination that actually catches integration bugs without turning the whole suite into a fragile, order-dependent mess.

## Understanding Response-Time Assertions

Every other test in this suite is a **functional** check: given this request, is the status code and response body correct? `tests/performance.test.js` asks a different question: given a *correct* response, did it arrive **fast enough to be usable**? A slow 200 and a broken 500 fail a real user in different ways, and only one of those is caught by the rest of this suite.

**How it's wired up.** Rather than each test manually timing a call with `Date.now()` before and after, `helpers/apiClient.js` does it once, globally, via an axios interceptor pair:

```js
apiClient.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

apiClient.interceptors.response.use((response) => {
  response.duration = Date.now() - response.config.metadata.startTime;
  return response;
});
```

Every response from every service object now carries a `.duration` in milliseconds, for free — no service object or test had to change. A small custom matcher (`jest.setup.js`, alongside `toMatchSchema`) turns that into a readable assertion:

```js
expect(res).toRespondWithin(3000); // fails with "expected response to respond within 3000ms, but took 4021ms"
```

**Why the threshold is 3000ms, not something tighter.** DummyJSON is a free, shared, public demo API with no published SLA and no dedicated infrastructure for this project — its baseline latency varies with unrelated traffic and isn't something this suite controls. A tight threshold (e.g. 300ms) would fail on ordinary network jitter and train everyone to ignore red performance tests, which is worse than not having them. The 3000ms budget is deliberately generous: it exists to catch a real regression or outage (an endpoint hanging, a dependency timing out) — not to enforce production-grade latency against a best-effort service. Against a first-party API with an actual SLA, this threshold should come down considerably.

**When to reach for this vs. dedicated load-testing tools.** This is a *smoke-level* latency check — one request per endpoint, run alongside the rest of the suite, asking "is this endpoint still roughly as fast as it should be?" It is deliberately not a substitute for real performance/load testing (tools like k6 or Artillery, which simulate concurrent users and measure throughput/percentiles under sustained load). Reach for this pattern to catch obvious regressions in CI on every push; reach for a load-testing tool when the question changes from "did this get slow?" to "how many concurrent users can this handle before it degrades?"

## Understanding Pagination Boundary Testing

Every resource's Read block already asserts the *happy-path* pagination shape — `GET /products` with no params returns 30 items, `total`/`limit`/`skip` are present, and so on. `tests/pagination.test.js` exists because the happy path doesn't tell you what happens at the **edges** of that contract, and those edges turned out to hide real, non-obvious behavior.

**What curling the real API first turned up.** Before writing a single assertion, the actual responses were checked by hand (per this project's usual workflow — verify against the live API, don't assume). Three things were surprising enough to be worth locking in as tests:

1. **`limit=0` doesn't mean "give me nothing."** It means "give me everything." `GET /products?limit=0` returns all 194 products, not an empty array — the intuitive reading of `limit=0` (as a boundary/off value) is exactly backwards here.
2. **The `limit` field in the response is not an echo of what you asked for — it's the actual page size returned.** Request `limit=10` with only 3 items left after `skip`, and the response comes back with `"limit": 3`, not `10`. Nothing in the per-resource CRUD tests would catch this, because they only ever request page sizes the collection can fully satisfy.
3. **Negative and non-numeric `limit`/`skip` are rejected outright (`400`), not clamped to `0` or silently ignored.** That's a real design choice worth pinning down — a naive client-side pager that lets a user scroll `skip` negative would get a clear error instead of quietly wrapping around or hanging.

**Why this matters beyond DummyJSON specifically.** Off-by-one and boundary errors in pagination are one of the most common real-world API bug classes — the kind that only shows up on the *last* page, or when a filter legitimately returns zero results, or when a client passes a stale/malformed cursor. A test suite that only ever requests "page 1, default size" from a dataset that always has plenty of data will never exercise any of that. Testing `limit=0`, an overrun `skip`, and rejected negative values is cheap and catches a whole class of bugs that happy-path CRUD tests structurally cannot.

**Why this is a dedicated file instead of living inside each resource's Read block.** The pagination contract (`limit`/`skip`/`total` semantics) is shared platform behavior across every list endpoint, not something specific to products or users — testing it once, parameterized across a representative few resources (`products`, `users`, `posts`), proves it's a platform-level contract without duplicating the same five edge cases into every resource file.

## Understanding Idempotency & Concurrency Testing

**What idempotency means.** Per the HTTP spec, calling the same request N times should leave the system in the same state as calling it once — `GET`, `PUT`, and `DELETE` are supposed to be idempotent; `POST`/`PATCH` generally aren't. Testing it means deliberately repeating a request and asserting the *repeat* behaves the way the spec (and the API's own contract) says it should — not just that a single call works.

**What concurrency means, separately.** Firing multiple requests *at the same time* (via `Promise.all`, not sequential `await`s) and asserting the system handles them consistently — no dropped request, no response leaking another request's payload, no corrupted shared state.

**The wrinkle that makes this file different from a real-world idempotency test.** This project's [Overview](#overview) already establishes that DummyJSON's writes are simulated and nothing persists server-side. That constraint changes what these tests can actually prove:

- **Repeated DELETE, real-world expectation:** against a real backend, deleting an already-deleted resource typically 404s the second time. Against DummyJSON, it doesn't — `DELETE /products/1` called twice returns `200` + `isDeleted: true` **both** times, because there's no persisted "already deleted" state for the second call to check against; each call re-simulates the delete from the same seed data. The test asserts this explicitly, framed as documenting the difference, not as "proving" real idempotency.
- **Concurrent POST, real-world expectation:** a real backend hands out a unique id to each of several simultaneous creates. DummyJSON hands all of them the **same** id (`current total + 1`), computed statelessly per-request rather than from a persisted counter. The test asserts this too — it's a genuine, useful thing to know about this mock's limits before relying on it for anything id-sensitive.
- **PUT and concurrent PATCH are the two cases that hold up cleanly** even against a stateless mock, since neither depends on the server remembering anything between calls: the same `PUT` payload sent twice returns byte-identical responses, and simultaneous `PATCH` calls with different payloads each get back exactly their own echoed value, with no cross-talk between them.

**Why this is worth having despite the caveat.** Idempotency and race-condition bugs are a classic "this only shows up in production under real load" failure class — a retried request after a network blip that double-charges a customer, a resubmitted form that creates a duplicate order, a race between two concurrent updates that silently drops one of them. Most portfolio test suites never touch this, because it requires understanding *why* HTTP methods carry idempotency guarantees in the first place, not just what status code a single call returns. Being explicit about what a stateless mock *can't* prove here (real persistence-backed idempotency) is itself part of demonstrating that understanding — a test suite that quietly assumed DummyJSON's DELETE was idempotent, without checking, would be testing the wrong thing.

## Understanding Smoke Test Tagging

**The problem this solves.** The full suite takes roughly a minute against the live API. That's fine for a scheduled nightly run or a pre-merge check, but it's the wrong tool for "did I just break something obvious?" — the question you want answered in seconds, not a minute, especially while iterating locally or in a tight CI feedback loop.

**How it's tagged.** Rather than a separate config file or Jest "projects" split, tagging here is a plain naming convention: one existing test per resource — the one that best represents "is this endpoint alive and returning the right shape" — has ` @smoke` appended to its title, in-place, in the same file it already lived in:

```js
// tests/products.test.js
it('gets a single product by id @smoke', async () => { ... });
```

Nine tests carry the tag: a `GET .../{id}` read for products, users, carts, posts, comments, recipes, todos, and quotes, plus auth's login test (the one path where "is the API up" and "is auth working" are the same question). `npm run test:smoke` runs `jest -t "@smoke"`, Jest's built-in test-name filter, which skips every non-matching test without needing a separate file, config, or test runner:

```json
"test:smoke": "jest -t \"@smoke\""
```

**Why tag existing tests instead of writing new ones.** A separate `tests/smoke.test.js` duplicating "get product 1, get user 1, …" would mean firing the same live HTTP calls twice — once for the smoke file, once for the real coverage in `products.test.js` — against a shared external API this project has already observed real `429`s from (see [Important Notes & Gotchas](#important-notes--gotchas)). Tagging reuses the exact same request instead of duplicating it — one source of truth per assertion, the same principle the [Service Object Model](#service-object-model-som) is built on.

**The trade-off.** `jest -t` filters individual tests, not whole files or their setup — every test *file* containing a tagged test still loads and its `beforeAll`/`beforeEach` hooks still run (e.g. `auth.test.js`'s own top-level login), even though only one `it` inside it executes. That's a minor, fixed amount of extra setup, not a scaling problem — nine files' worth of hooks, not a fraction of the full 143-test suite's HTTP calls.

**When to reach for `test:smoke` vs. the full suite.** Smoke: a quick "is the live API and our core service objects still working" sanity check — while iterating locally, or as a fast pre-push gate. Full suite: anything that actually needs to verify correctness — CRUD behavior, negative cases, pagination edges, idempotency — which is everything CI and the nightly scheduled run already do, unchanged by this addition.

## Understanding Response Header Assertions

**The gap this closes.** Every other test in this suite checks the two things people usually mean by "does the API work": the status code, and the JSON body. Headers are the third piece of an HTTP response, and they carry contract-level information the body never does — what format the body actually is, who's allowed to call this from a browser, and how close the caller is to getting throttled. A suite that never reads `res.headers` is silently trusting all of that, not verifying it.

**What curling the real API with `-D -` (dump headers) turned up:**

1. **`Content-Type: application/json; charset=utf-8` is consistent across both success and error paths** — a `200`, a `404`, and a `201` all carry it. Worth confirming explicitly: a body-only test would still pass if an error response came back as `text/html` instead, since `res.data` would just fail to parse as expected JSON in a way that's easy to misdiagnose as "the body is wrong" rather than "the content type is wrong."
2. **CORS is dynamic, not a blanket `*`.** DummyJSON reflects whatever `Origin` header the caller sent, verbatim, back in `Access-Control-Allow-Origin` — and omits that header entirely when no `Origin` was sent. This matters because axios running in Node (as every test in this suite does) never adds an `Origin` header on its own the way a browser would; testing CORS here means deliberately setting one, which is why `productsApi.getById` gained an optional second `config` argument (`productsApi.getById(1, { headers: { Origin } })`) rather than the test reaching for `apiClient` directly and breaking the [Service Object Model](#service-object-model-som).
3. **The rate limit this project has been hitting all along is real and self-documenting.** `x-ratelimit-limit`, `x-ratelimit-remaining`, and `x-ratelimit-reset` are present on every single response. This project's CLAUDE.md notes "no rate limits documented" for DummyJSON — true of the written docs, but the response headers say otherwise, and this project's own negative-case tests already accept `429` alongside `404` as a result (see [Important Notes & Gotchas](#important-notes--gotchas)). Asserting these headers exist turns "we occasionally see 429s and shrug" into "the API tells you exactly how close you are, and we check that it does."

**Why this is worth having beyond DummyJSON specifically.** Header bugs are the kind that don't show up in a body-only test suite at all: a misconfigured CORS policy that silently blocks a legitimate frontend origin, a missing `Content-Type` that makes a strict client refuse to parse a perfectly valid JSON body, a security header (`X-Content-Type-Options: nosniff`) that quietly stops being sent after an infrastructure change. None of those change the status code or the JSON body — they only show up if something is actually reading the headers.

## Understanding Contract Drift Detection

**What the existing schema checks actually catch — and what they don't.** Every schema in `schemas/` is used with Zod's default object behavior, which is "strip mode": if a response has a field the schema didn't declare, Zod silently ignores it — the check still passes. That means the existing `toMatchSchema(productSchema)` assertions catch a field going **missing** or changing **type**, but they cannot catch a field being **added**. A schema can be quietly out of date with the real API for months without a single test going red.

**The fix: the same schema, called differently, not a second schema.** Zod objects have a `.strict()` method that returns a variant of the same schema where any undeclared key fails validation instead of being ignored:

```js
expect(res.data).toMatchSchema(productSchema.strict());
```

This is the entire mechanism — no new library, no snapshot files to review and commit, and critically, no second, parallel definition of "what a product looks like" to keep in sync with the original. `productSchema` (used for type-correctness in `products.test.js`) and `productSchema.strict()` (used for drift detection here) are the exact same source of truth, just invoked in two different modes.

**This immediately found a real bug, not a hypothetical one.** Before writing this test, `GET /users/1` was curled and diffed against `schemas/userSchema.js` by hand (per this project's usual workflow — verify against the live API, don't assume). The live response had 7 fields the schema never declared: `password`, `ip`, `macAddress`, `ein`, `ssn`, `userAgent`, and `crypto` (a wallet/coin/network object). None of those were caught by the existing lenient schema checks, because strip-mode Zod doesn't look for extra fields — this project's user contract had been silently incomplete since `userSchema.js` was first written. The fix was to bring the schema in line with reality (confirming first, via `GET /users?limit=0`, that all 208 seed users consistently have these fields) rather than to loosen the new test — the point of this feature is catching exactly this kind of gap, not working around it.

**Why this is worth having beyond DummyJSON specifically.** A backend silently adding a field is usually harmless — until it isn't: a field that turns out to contain PII nobody flagged for a compliance review, a field a frontend starts depending on informally before it's a documented part of the contract, or simply a schema that's drifted so far from reality that nobody trusts it enough to enforce it strictly anymore. Consumer-driven contract testing (the discipline this technique borrows from — see tools like Pact) exists because "the response still parses" and "the response is what we agreed it would be" are different guarantees, and only the second one prevents silent drift.

**The honest caveat.** DummyJSON is a public API this project doesn't own — there's no one to open an issue with if it adds a field next month, and this test would then need updating rather than the API. The value here isn't that DummyJSON specifically owes this project schema stability; it's demonstrating the technique against a real, live, occasionally-changing API instead of a hypothetical one. Against a first-party API a team actually owns, the same pattern turns into a real safeguard: CI fails the moment a backend change silently breaks the documented contract, instead of a frontend finding out weeks later.

## Understanding sortBy/order and select Query Params

**Why these needed their own file instead of living in `pagination.test.js`.** `limit`/`skip` control *how much* of a list comes back and from *where*; `sortBy`/`order` and `select` control the list's *content* — what order it's in, and which fields survive per item. Related query-string mechanism, different concern. Keeping them in a separate file mirrors why `performance.test.js` and `pagination.test.js` are already split apart: each file answers one specific question about the list endpoints, not "everything about `GET /products`."

**Neither param is in this project's own endpoint reference.** `CLAUDE.md`'s Resource Endpoint Reference lists `GET /products`, `/products/{id}`, `/products/search?q=`, `/products/category/{category}`, `/products/categories` — no mention of `sortBy`, `order`, or `select`. They were found the same way everything else non-obvious in this suite was found: reading [DummyJSON's docs](https://dummyjson.com/docs) and then curling the live API to see what actually happens at the edges, not just the documented happy path.

**What curling turned up, and why each finding earned its own assertion:**

1. **`sortBy` alone sorts ascending — `order` isn't required to get a sorted result.** `GET /products?sortBy=price` (no `order` at all) comes back in ascending price order, identical to explicitly passing `order=asc`. Easy to assume `sortBy` without `order` is undefined behavior; it isn't.
2. **An unrecognized `sortBy` field doesn't error — it's silently ignored.** `GET /products?sortBy=notARealField` still returns `200` with the default (id) ordering, not a `400`. A test that only checked the happy path would never notice a typo'd field name doesn't do anything.
3. **`order`'s own validation depends on whether `sortBy` is present — a genuinely surprising coupling.** `GET /products?order=sideways` alone is a `200` no-op (there's nothing to apply an invalid order *to*, so the API doesn't bother validating it). Add `sortBy=price` to the same invalid `order` value, and it becomes a `400` with `"Invalid 'order' - should be either 'asc' or 'desc'"`. Two nearly-identical requests, two different outcomes, entirely dependent on a *different* parameter's presence — the kind of coupling that's invisible unless you specifically test both combinations.
4. **`select` always keeps `id`, even when it's not in the requested field list.** `GET /products?select=title` still returns `{ id, title }`, not just `{ title }`. A client relying on `select` to control the exact key set would be surprised by an extra key showing up unasked.
5. **An unrecognized `select` field mirrors `sortBy`'s behavior — silently dropped rather than rejected.** `select=notARealField` returns `{ id }` only, not a `400` and not an error field in the body. Consistent with finding #2, which is itself worth knowing: this API's philosophy for unrecognized *field names* (as opposed to unrecognized *parameter values*, like an invalid `order`) is "ignore it," not "reject it."

**Why this matters beyond DummyJSON specifically.** Query-string parameters are exactly the part of an API surface that's easiest to under-test, because the "normal" request (no `sortBy`, no `select`, no `order`) always works — the interesting behavior only shows up in combinations nobody tries by default: a param with no effect until paired with another, a typo that's silently swallowed instead of surfaced, a field that's always present no matter what you ask for. Those are the requests real users' client code eventually sends by accident, and the only way to know how the API handles them is to send them on purpose first.

## Understanding Cross-Resource Referential Integrity

**The failure class every other file in this suite structurally cannot catch.** Every other test file validates one endpoint in isolation: does `GET /posts/{id}` return the right shape, the right status code, the right echoed value on a write? None of that can ever notice if `post.userId` points at a user that doesn't exist — because a single-resource test never looks at any resource *other* than the one it's calling. This is the same gap [Scenario Tests: Beyond Isolated CRUD](#scenario-tests-beyond-isolated-crud) identified for a live *session* (does data flow correctly between endpoints during one user's journey); this file asks the same kind of question about the *static seed dataset* instead: is it internally consistent, foreign-key-style, everywhere at once?

**What "referential integrity" means here, concretely.** In a relational database, a foreign key constraint guarantees `posts.userId` can never contain a value that isn't a real row in `users`. A REST API backed by a real database usually gets that guarantee for free, enforced at the data layer. This suite doesn't have access to DummyJSON's database — so instead of trusting that guarantee exists, it verifies the *observable result* holds: every `post.userId` in the API's responses actually corresponds to a real user the API also returns. Same idea, checked from the outside, six ways: products↔categories, posts↔users, comments↔posts, comments↔users, carts↔users, carts↔products.

**Why this is efficient instead of expensive.** The naive version of this test — for every post, `GET /users/{post.userId}` and check it's `200` — would mean one HTTP call per item: 251 calls just for posts, before touching comments or carts. Against an API this project has already been rate-limited by more than once (see [Important Notes & Gotchas](#important-notes--gotchas)), that's not just slow, it's actively hostile to the thing you're testing against. Instead, this file leans on a fact [Understanding Pagination Boundary Testing](#understanding-pagination-boundary-testing) already established: `limit=0` returns an entire collection in one request. Fetch every list once (6 calls total, run in parallel via `Promise.all` in a single `beforeAll`), build a `Set` of valid ids from each, and every "does this id exist" check afterward is an in-memory lookup — zero additional network calls no matter how large the dataset gets.

**Why this is worth having beyond DummyJSON specifically.** Referential integrity bugs are invisible to per-endpoint testing by construction, and they're exactly the kind of bug that slips through code review too — a migration that soft-deletes users without cleaning up their posts, a data import that assigns an off-by-one user id, a cache that serves a stale post referencing an already-deleted author. None of those break any single endpoint's contract; they only show up when you specifically check that the *edges between* resources still point somewhere real.

## Understanding Auth Token Edge Cases

**Why `auth.test.js`'s existing negative cases weren't enough.** `auth.test.js` already tests "no token" and `"not-a-real-token"` against `/auth/me` (both `401`), plus a missing refresh token against `/auth/refresh` (`401`). Those are the *obvious* invalid-auth cases — the ones any checklist would name. `tests/authTokenEdgeCases.test.js` goes one level deeper, into the cases that only show up once you start asking "invalid *how*, exactly?" instead of just "invalid."

**What curling turned up, and why each one is a distinct case, not a repeat of an existing one:**

1. **A tampered JWT is not the same kind of "invalid" as a garbage string, and DummyJSON treats it differently.** `"not-a-real-token"` isn't shaped like a JWT at all — three dot-separated segments — so it's an easy, cheap rejection. A syntactically valid JWT (real header, real payload, garbage signature) has to actually go through *signature verification* to be rejected, and when it fails there, DummyJSON returns `500` with `"invalid signature"` — not the `401` every other invalid-token case gets. That's a real inconsistency in the API's own error handling, and it's invisible unless you specifically construct a JWT-shaped-but-wrong token rather than just any garbage string.
2. **A missing `Bearer` scheme is a different failure than a missing token entirely.** Testing this required extending `authApi` with `meWithAuthorizationHeader()` — a raw-value variant alongside the existing `me(token)`, which always prepends `Bearer ` itself — because a client that forgets the scheme prefix (a genuinely common integration bug) sends a *present* but malformed header, not an *absent* one.
3. **An invalid refresh token and a missing refresh token are different failures with different status codes.** `auth.test.js` covers "no refresh token provided" (`401`). A refresh token that's present but garbage returns `403` instead — a different branch of the API's own logic, only reachable by sending a token-shaped value that isn't one.
4. **`expiresInMins` has a real, working effect on token lifetime — and a real, surprising edge case.** Decoding the JWT payload (no library needed — just base64url-decoding the middle segment) confirms `exp - iat` tracks the requested value exactly (`expiresInMins: 1` → a 60-second-lived token). Omitting the field defaults to 1 hour. But explicitly passing `expiresInMins: 0` does **not** mean "expires immediately" — `0` is falsy, so the server's `expiresInMins || <default>` logic falls through to a 30-day token instead. The intuitive reading of an explicit `0` is exactly backwards, the same shape of surprise as `limit=0` meaning "no limit, not zero" in [Understanding Pagination Boundary Testing](#understanding-pagination-boundary-testing).

**Why this is worth having beyond DummyJSON specifically.** "Reject bad auth" is the checklist item every test suite has; "reject bad auth *correctly*, with the right status code for the right reason" is the part that actually matters to a real client. A frontend that retries on `401` but not `403` will misbehave against DummyJSON's own refresh-token endpoint, silently, unless someone tested both cases separately. The falsy-zero footgun on `expiresInMins` is a broader lesson too: any API param that's documented as "a number" deserves an explicit test for its falsy value (`0`), not just a normal one — `0`, empty string, and `false` all collapse to "not provided" in a naive `value || default` check, which is an extremely common server-side bug pattern, not a DummyJSON-specific one.

## Schema Validation with Zod

**The problem this solves.** Before this, checking a response's shape looked like this (from the old `products.test.js`):

```js
expect(typeof res.data.price).toBe('number');
expect(res.data.price).toBeGreaterThan(0);
expect(typeof res.data.category).toBe('string');
expect(Array.isArray(res.data.tags)).toBe(true);
expect(Array.isArray(res.data.reviews)).toBe(true);
expect(res.data.rating).toBeGreaterThanOrEqual(0);
expect(res.data.rating).toBeLessThanOrEqual(5);
// ...and this only checked 5 of a product's ~20 fields
```

Every field needs its own line, it's easy to forget one, and even after all those lines, most of the object (`dimensions`, `meta`, `reviews[].reviewerEmail`, …) was never actually checked. This is what **schema validation** (also called **contract testing**) fixes: instead of asserting on fields one at a time, you write down the whole shape once — types, nested objects, array item shapes, which fields are optional — as a single schema, then check the response against it in one line.

**What changed.** `schemas/productSchema.js`, `userSchema.js`, `cartSchema.js`, and `postSchema.js` each define the full expected shape for one item using [zod](https://zod.dev/), e.g.:

```js
// schemas/productSchema.js (abridged)
const productSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number().positive(),
  rating: z.number().min(0).max(5),
  tags: z.array(z.string()),
  brand: z.string().optional(), // some categories don't have one
  dimensions: z.object({ width: z.number(), height: z.number(), depth: z.number() }),
  reviews: z.array(z.object({ rating: z.number(), comment: z.string(), reviewerEmail: z.email() /* ... */ })),
  // ...every other field, once
});
```

A custom Jest matcher in `jest.setup.js` (`toMatchSchema`, wired in via `jest.config.js`) turns that into a one-line assertion anywhere in the suite:

```js
expect(res.data).toMatchSchema(productSchema);
```

If the shape is wrong, the failure message lists every field that didn't match — not just the first one, and not silence for fields nobody thought to check:

```
expected value to match the provided schema, but it didn't:
  - price: Invalid input: expected number, received string
  - reviews.0.reviewerEmail: Invalid email address
```

**Why not just keep writing `typeof` checks?** Two reasons. First, coverage: a schema checks *every* field including nested ones, which is impractical to do by hand for an object with 20+ fields and nested arrays/objects — the old tests didn't even try (`title`, `price`, and `id` were the only three checked in the list test). Second, maintainability: if DummyJSON adds or renames a field, there's one schema file to update, not a scattered set of `expect()` lines across every test that happens to touch that resource.

**The trade-off — this suite deliberately did a partial migration, not a full rewrite.** Only four resources (Products, Users, Carts, Posts) have schemas; the other eight files still use manual per-field assertions. That's not an oversight — it's how this actually gets adopted in a real codebase: you migrate the highest-value, richest-shaped resources first (these four have the deepest nesting) and leave simpler ones (`quotes`, `todos` — 2-4 flat fields each) as they are, since a schema buys much less when there's barely anything to validate. Schema validation also isn't a replacement for *business-logic* assertions — "does the search result actually contain the search term," "is `totalProducts` consistent with the array length," "did PATCH merge instead of replace" are still hand-written `expect()` calls, right alongside the `toMatchSchema()` call. Schemas check *shape*; they don't check *behavior*.

**Why zod over an alternative like `ajv` + JSON Schema.** Both are legitimate choices for contract testing in JS. Zod was picked here because its schema *is* readable JavaScript (`z.object({ price: z.number().positive() })`) rather than a separate JSON Schema document (`{ "type": "object", "properties": { "price": { "type": "number", "exclusiveMinimum": 0 } } }`) — for a project this size, keeping the schema in the same language and file style as the rest of the suite outweighs `ajv`'s raw validation speed advantage, which matters more at production scale than in a test suite making a handful of calls per run.

## Continuous Integration (CI)

**What CI means, in plain terms.** Continuous Integration is just: *every time someone changes the code, a computer automatically runs the tests* — instead of relying on a person to remember to run them locally before pushing. If the tests fail, everyone can see it immediately (on the pull request, or on the commit) instead of finding out later that something broke.

**What's set up here — two separate workflows, two separate jobs:**

- **`.github/workflows/ci.yml`** — runs on every `push` and `pull_request` targeting `main`. This is the "did this change break anything" check: install dependencies (`npm ci`), run `npm test`. If any test fails, the workflow fails, and that shows up as a red ✗ right on the pull request — the same signal you'd see on any real engineering team's PR checks.
- **`.github/workflows/daily-jest-tests.yml`** — runs once a day on a schedule (plus an on-demand "Run workflow" button), independent of any code change. This isn't checking *your* changes — it's checking whether the suite still passes against DummyJSON *right now*, since DummyJSON is a live external API that could change its responses or go down without anyone touching this repo. It posts a pass/fail summary to a Discord webhook, so a break gets noticed without anyone having to go look. This needs a `DISCORD_WEBHOOK_URL` secret configured in the repo settings to actually post; without it, the test run itself still works, only the notification step fails.

**Why two workflows instead of one.** They're answering different questions. "Did my change break the suite?" needs to run fast and block bad merges — that's `push`/`pull_request`. "Is the suite still healthy against a live third-party API I don't control?" needs to run on a timer regardless of whether anyone touched the code — that's `schedule`. Bolting the daily/Discord logic onto the push/PR trigger would mean every PR check also posts a Discord notification, which is noisy and not what either workflow is for.

**Why this matters for a portfolio project specifically.** Tests that only run when a human remembers to run them locally are much weaker than tests that run automatically — CI is what turns "I wrote tests" into "these tests are actually enforced." It's also one of the fastest, lowest-effort things to point to in an interview: a green checkmark on a PR is a concrete, verifiable signal that doesn't require anyone to trust a claim.

### Live test report (GitHub Pages)

Every run of `npm test` also produces a visual HTML report (`report/index.html`) — which tests passed or failed, how long each took, and the full failure message for anything that broke.

`ci.yml` publishes that report to **GitHub Pages** after every push to `main`, so there's a permanent, shareable link with the current state of the suite — no need to check out the repo or run anything locally to see it. It publishes even when tests fail, so the page always reflects reality rather than only ever showing green.

(One-time setup needed: GitHub Pages must be turned on for this repo — Settings → Pages → Source: "GitHub Actions" — before the first publish will work.)

### Docker

The `Dockerfile` packages the suite into a container: `npm ci` at build time, `npm test` as the default command. This means anyone can run the full suite with two commands and no local Node/npm install at all:

```bash
docker build -t dummyjson-api-tests .
docker run --rm dummyjson-api-tests
```

It still makes real network calls out to `https://dummyjson.com` — the container just packages the *runner*, not a fake/offline API.

### Dependabot

`.github/dependabot.yml` checks weekly for outdated or vulnerable dependencies — `npm` packages, the GitHub Actions used in the workflows, and the Docker base image — and opens a pull request automatically for each one it finds. No code to write or maintain; it's a config file that turns on a feature GitHub already provides.

## Conventions

- **One file per resource**, grouped into `Create` / `Read` / `Update` / `Delete` / `negative cases` describe blocks — except read-only resources (`quotes`), which only have `Read` / `negative cases`, and the `mockHttp`/`tools` utility files, which are grouped by scenario/tool instead of CRUD since they don't model a data entity.
- **Tests call service objects, never `apiClient` directly.** Adding a new endpoint call means adding a method to the resource's service object in `helpers/`, not inlining a new `apiClient.get/post/...` call inside a test.
- **No state reset between tests.** `beforeAll`/`beforeEach` are only used for shared setup (e.g. obtaining an auth token in `auth.test.js`), never to "reset" server state — DummyJSON doesn't persist writes, so there's nothing to reset.
- **Assertions focus on:**
  - `res.status` matching the expected HTTP status
  - Key fields present/correct in `res.data` — via a `schemas/*Schema.js` + `toMatchSchema()` for Products/Users/Carts/Posts (see [Schema Validation with Zod](#schema-validation-with-zod)), via manual per-field `expect()` calls for the rest
  - For writes, that the echoed response reflects the payload sent (not that it was actually saved)
- **Every resource has at least one negative test:** invalid/out-of-range ID, missing required field, or invalid auth. For the seven full-CRUD resources, the get/update/delete-non-existent-id trio is written once as a `test.each` table rather than three copy-pasted `it()` blocks — see [Parameterized Tests with test.each](#parameterized-tests-with-testeach).
- **Tests are independent of each other and order-agnostic — except `tests/userJourney.test.js`,** which is a deliberately ordered, stateful scenario chain. See [Scenario Tests: Beyond Isolated CRUD](#scenario-tests-beyond-isolated-crud) for why that one file is the exception.

## Important Notes & Gotchas

- **Writes don't persist.** Creating, updating, or deleting a resource returns a realistic response but has no lasting effect — running the suite repeatedly is safe and idempotent.
- **No rate limits are documented** for DummyJSON, but avoid hammering it in tight loops out of courtesy — it's a shared public sandbox, not your own infrastructure. In practice, occasional `429` responses have been observed on the "not found" negative cases for products/users/carts, so those assertions accept `[404, 429]` rather than asserting `404` strictly.
- **Create status codes aren't consistent across resources.** Most `POST .../add` endpoints return `201`, but `POST /recipes/add` returns `200` — verified directly against the live API before writing the assertion. Don't assume `201` when adding a new resource; check the real response first.
- **`/c/generate` appears to be cached by payload at the CDN edge.** Calling it twice with an identical `{ json, method }` body can return a stale cached response for a request that should otherwise be fresh (observed: a wrong-method call that should 404 instead returned a cached 200). `tests/tools.test.js` works around this by including a random `nonce` field in payloads used for negative-path assertions, so each test run generates a genuinely unique URL. If you add more Custom Response tests, do the same for anything asserting on a *fresh* result.
- **`GET /2fa` with no `key` query param doesn't return JSON.** It serves the tool's HTML landing page (200, `text/html`) instead of an API error, since the same route doubles as a browser-facing page. `tests/tools.test.js` tests the missing/invalid-key negative cases via `POST` instead, which reliably returns JSON.
- **This is a practice/portfolio project.** Treat DummyJSON as a dev/testing aid, not production infrastructure — don't build real features on top of assumptions validated only here.
- **Auth credentials are DummyJSON's published test user** (`emilys` / `emilyspass`), documented at [dummyjson.com/docs/auth](https://dummyjson.com/docs/auth). If DummyJSON ever rotates its seed data, update `VALID_CREDENTIALS` in `tests/auth.test.js`.

## API Testing Interview Questions & Answers

Ten questions an interviewer is likely to ask about API testing specifically — each answered with the general concept first, then how this exact repository demonstrates it, so the answer is backed by real code rather than theory alone.

### 1. What's the difference between API testing and UI (end-to-end) testing?

**Short answer:** API testing calls the service layer directly (HTTP requests in, JSON responses out); UI testing drives the rendered interface (clicks, form fills, visual assertions) that sits on top of that same API.

| | API Testing | UI Testing |
|---|---|---|
| **Speed** | Fast — no browser, no rendering | Slow — full browser lifecycle per test |
| **Flakiness** | Lower — no layout timing, animations, or selectors to break | Higher — brittle selectors, race conditions with rendering |
| **What it catches** | Contract bugs: wrong status code, wrong field, broken auth, bad pagination | Presentation bugs: a button that's unreachable, a modal that doesn't close, broken CSS |
| **Failure localization** | Precise — one endpoint, one assertion | Fuzzy — a UI failure could be the API, the JS, or the DOM |
| **Where it sits in the pyramid** | Middle layer — more coverage per test than UI, more realistic than a unit test | Top layer — fewest tests, highest confidence in the actual user experience |

**Example from this project:** this entire suite is API-only — there's no browser involved anywhere. `tests/products.test.js` asserts directly on `res.status` and `res.data`, not on anything rendered. That's *why* it can run all 175 tests in under a minute against a live external service — a UI suite covering the same ground would take dramatically longer and be far more prone to unrelated failures.

### 2. What's the difference between unit, integration, and end-to-end (E2E) API tests?

**Short answer:** they differ in how much of the real system is actually running underneath the test.

| | Unit | Integration | E2E |
|---|---|---|---|
| **What's real** | Nothing — the function under test, everything else mocked | Some — e.g. a real database, mocked third-party calls | Everything — real backend, real database, real network |
| **Speed** | Milliseconds | Seconds | Seconds to minutes |
| **Confidence** | Low — proves the code does what it says, not that it's wired up correctly | Medium — proves components talk to each other correctly | High — proves the whole system actually works, as deployed |
| **Typical volume** | Thousands | Hundreds | Dozens to low hundreds |

**Example from this project:** every test here is E2E by this definition — `helpers/apiClient.js` makes real HTTP calls to `https://dummyjson.com` with `axios`; nothing is mocked (see [Overview](#overview): "No mocking, no Supertest"). That's a deliberate trade-off documented in this README: higher confidence per test, at the cost of depending on a third party's uptime and rate limits (see [Important Notes & Gotchas](#important-notes--gotchas)).

### 3. How do you decide what counts as a good negative test case?

**Short answer:** a good negative test targets a specific way a client can misuse the API, not just "send garbage and expect a 4xx." The strongest negative tests come from asking: what wrong input is a real client actually likely to send?

**Structure used consistently in this project** (see [Conventions](#conventions)): every resource has, at minimum,
- an **invalid/out-of-range ID** (`GET /products/999999` → `404`)
- a **missing required field** (an invalid `auth/login` payload missing `password` → `400`)
- **invalid auth** (`GET /auth/me` with no token, or a garbage token → `401`)

**Example, and why it's a *good* negative test, not just any negative test:** `tests/pagination.test.js` doesn't just check that `limit=-1` returns an error — it checks *why* it's interesting: `order=sideways` alone is a harmless no-op (`200`), but the exact same invalid value becomes a `400` the moment `sortBy` is also present (see [Understanding sortBy/order and select Query Params](#understanding-sortbyorder-and-select-query-params)). A weak negative test would only try one of those two requests and miss the coupling entirely.

### 4. What is idempotency, and how would you actually test whether an endpoint is idempotent?

**Short answer:** an idempotent operation produces the same *end state* no matter how many times it's repeated. Per the HTTP spec, `GET`, `PUT`, and `DELETE` are supposed to be idempotent; `POST` and `PATCH` generally aren't.

**How to test it, concretely:** call the same request twice (or more) and assert the *repeat* behaves the way the contract says it should — not just that a single call works.

| Method | Real-world idempotent behavior | What to assert on a repeat call |
|---|---|---|
| `PUT` | Same input → same output, every time | Second response is byte-identical to the first |
| `DELETE` | Deleting twice ≠ deleting-then-erroring; typically the 2nd call `404`s | Second call's status/body reflects "already gone" |
| `POST` (create) | Not idempotent by design | Two calls create two distinct resources with different ids |

**Example from this project, including an honest caveat:** `tests/idempotency.test.js` found that DummyJSON's `DELETE` doesn't behave like a real backend's — calling it twice returns `200` **both** times instead of `404`ing on the second call, because writes aren't persisted (see [Understanding Idempotency & Concurrency Testing](#understanding-idempotency--concurrency-testing)). The test asserts this explicitly, framed as *documenting the difference* from real idempotency rather than assuming it holds.

### 5. What's the difference between schema validation and manual field-by-field assertions — and what is "contract drift"?

**Short answer:** manual assertions (`expect(res.data.title).toBe('...')`) check specific values; schema validation checks the *shape* of the whole response — every field's presence and type — in one declarative pass. Contract drift is what schema validation, in its default lenient mode, *still* can't catch: a field silently **added** to a response that the schema never declared, because most schema libraries ignore unknown keys by default rather than rejecting them.

| | Manual assertions | Lenient schema validation | Strict schema validation |
|---|---|---|---|
| Catches wrong value | ✅ | ❌ (unless checked separately) | ❌ (unless checked separately) |
| Catches missing field | ❌ (only if explicitly checked) | ✅ | ✅ |
| Catches wrong type | ❌ (only if explicitly checked) | ✅ | ✅ |
| Catches an unexpected *added* field | ❌ | ❌ | ✅ |
| Effort per resource | High — one line per field | Low — one schema, reused everywhere | Low — same schema, `.strict()` |

**Example from this project:** `schemas/*.js` (Zod) power `toMatchSchema()` across every resource's Read tests (see [Schema Validation with Zod](#schema-validation-with-zod)). `tests/contractDrift.test.js` reuses those *exact same schemas* in `.strict()` mode specifically to catch additions — and it immediately found a real one: `schemas/userSchema.js` was missing 7 fields DummyJSON actually returns (`password`, `ip`, `macAddress`, `ein`, `ssn`, `userAgent`, `crypto`), see [Understanding Contract Drift Detection](#understanding-contract-drift-detection). That's the difference in practice, not just in theory.

### 6. How do you test pagination, and what edge cases matter most?

**Short answer:** the happy path (page 1, default size, plenty of data) is the least interesting part. The bugs live at the edges: the first page, the last (partial) page, an empty result set, and boundary values like `0` or negative numbers.

**Edge cases worth covering, in order of how often real bugs hide there:**
1. A **partial last page** — requesting more items than remain (off-by-one errors love this case)
2. **`limit`/`skip` at their boundary values** — `0`, negative, non-numeric
3. **An empty result set** — does `total` still reflect the real collection size, or does it also go to `0`?
4. Whether the API's **metadata fields** (`limit`, `total`) describe the request or the actual response — these are not always the same thing

**Example from this project:** `tests/pagination.test.js` found that DummyJSON's `limit=0` doesn't mean "zero results" — it means "no limit, return everything." It also found that the response's `limit` field always echoes the *actual* page size returned, not the requested one (a `limit=10` request with only 3 items left comes back reporting `"limit": 3`). See [Understanding Pagination Boundary Testing](#understanding-pagination-boundary-testing) for the full breakdown — neither behavior is guessable from the happy path alone.

### 7. How do you handle authentication and authorization in automated API tests?

**Short answer:** authenticate once per test run (or per file) via a real login call, capture the token, and inject it into subsequent requests — never hardcode a long-lived token in the test code itself.

**The usual shape:**
```js
beforeAll(async () => {
  const res = await authApi.login(VALID_CREDENTIALS);
  accessToken = res.data.accessToken;
});

it('accesses a protected route', async () => {
  const res = await authApi.me(accessToken);
  expect(res.status).toBe(200);
});
```

**What to test beyond "login works":** a protected route with no token (`401`), with a garbage/malformed token (`401`), and — if the API supports it — the token refresh flow itself.

**Example from this project:** `tests/auth.test.js` does exactly this, and `tests/userJourney.test.js` goes a step further by chaining the token through multiple resources in one session (login → `/auth/me` → `/users/{id}` → `/carts/user/{userId}`), which catches a different bug class than isolated auth tests can: whether the `id` returned by login actually matches the `id` used consistently elsewhere. See [Scenario Tests: Beyond Isolated CRUD](#scenario-tests-beyond-isolated-crud).

### 8. What's the difference between a smoke test suite and a full regression suite, and when do you use each?

**Short answer:** a smoke suite answers "is the system obviously broken?" in seconds; a regression suite answers "is the system actually correct?" and takes proportionally longer because it has to.

| | Smoke suite | Full regression suite |
|---|---|---|
| **Question it answers** | Is anything obviously on fire? | Is behavior actually correct, including edge cases? |
| **Size** | A handful of critical-path checks | Every CRUD operation, every negative case, every edge case |
| **Speed** | Seconds | Minutes |
| **When it runs** | On every push, or while iterating locally | Pre-merge, nightly, or on demand |
| **What a failure means** | Stop immediately — something fundamental is broken | Investigate — a specific behavior regressed |

**Example from this project:** `npm run test:smoke` runs 9 tests (one core read per resource, plus login) in about 2 seconds, versus the full suite's ~175 tests in roughly a minute. Critically, the smoke subset **tags existing tests** rather than duplicating them into a separate file — seeing why that distinction matters (and not just "add more tests") is itself a good interview signal; see [Understanding Smoke Test Tagging](#understanding-smoke-test-tagging).

### 9. Why test response headers, not just the status code and body?

**Short answer:** the status code and body are only two-thirds of an HTTP response. Headers carry contract-level information neither of the other two express: what format the body actually is, who's allowed to call this cross-origin, and how close a caller is to being throttled.

**Headers worth asserting on, and why each matters:**
- **`Content-Type`** — a client that strictly parses JSON will fail confusingly if an error response comes back as `text/html` instead; this is easy to misdiagnose as "the body is wrong" when it's actually "the content type is wrong"
- **CORS headers** (`Access-Control-Allow-Origin`, `-Credentials`) — determine whether a legitimate frontend origin can even read the response at all; a misconfiguration here breaks browsers silently
- **Rate-limit headers** (`X-RateLimit-*`) — tell a well-behaved client how close it is to being throttled, before it happens
- **Baseline security headers** (`X-Content-Type-Options: nosniff`, etc.) — regressions here don't change the status code or body at all, so nothing else would catch them

**Example from this project:** `tests/responseHeaders.test.js` found that DummyJSON's rate limit — undocumented in its written docs — is actually self-documented in its own response headers (`x-ratelimit-limit` is present on every single call). That's the real, concrete explanation for why this project's own negative-case tests already tolerate `429` alongside `404` (see [Understanding Response Header Assertions](#understanding-response-header-assertions)) — a fact that was sitting in the headers the whole time, unread until this test went looking.

### 10. How do you deal with a flaky or rate-limited third-party API in CI?

**Short answer:** first, make the flakiness *visible and attributable* (don't let a `429` masquerade as a real assertion failure); second, decide deliberately whether to tolerate it, retry it, or slow down to avoid it — rather than silently ignoring red CI runs.

**Options, roughly in order of effort:**
1. **Tolerate the known status in the assertion itself** — e.g. `expect([404, 429]).toContain(res.status)` — cheapest, but only appropriate when you've confirmed *why* the alternate status happens
2. **Retry with backoff** at the HTTP client level, so a transient `429` doesn't fail the test at all
3. **Serialize requests** (`--runInBand` in Jest) to reduce burst load against a shared rate limit
4. **Re-run the CI job** when a failure is confirmed transient, rather than treating it as a real regression

**Example from this project — a real incident, not a hypothetical:** while building and merging several of the PRs behind this suite, CI genuinely failed on `429`s from DummyJSON's shared rate limiter — confirmed by reading the actual response bodies in the CI logs, not assumed. The fix each time was re-running the job once the burst passed, and `products.test.js`'s negative-case assertions already accept `[404, 429]` for exactly this reason (see [Important Notes & Gotchas](#important-notes--gotchas)). The stronger fix — an actual retry/backoff layer in `helpers/apiClient.js` — is a known, identified gap in this suite, not yet built.
