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
- [Schema Validation with Zod](#schema-validation-with-zod)
- [Continuous Integration (CI)](#continuous-integration-ci)
- [Conventions](#conventions)
- [Important Notes & Gotchas](#important-notes--gotchas)

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
│   └── userJourney.test.js # Chained scenario: login → view cart → update → checkout
├── .github/
│   └── workflows/
│       ├── ci.yml               # Runs the full suite on every push/PR to main
│       └── daily-jest-tests.yml # Runs the suite daily on a schedule, posts results to Discord
├── helpers/
│   ├── apiClient.js       # Shared axios instance (base URL + status handling)
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
├── jest.setup.js          # Registers the custom `toMatchSchema` matcher
├── jest.config.js         # Points Jest at jest.setup.js via setupFilesAfterEnv
├── package.json
├── CLAUDE.md              # Project spec / working notes for AI-assisted development
└── README.md              # You are here
```

## Getting Started

```bash
npm install
```

No environment variables or API keys are needed — the suite talks directly to `https://dummyjson.com`.

## Running Tests

```bash
# Run the entire suite
npm test

# Run a single file
npx jest tests/products.test.js

# Watch mode (re-runs on file changes)
npx jest --watch
```

Expected result: **12 suites / 117 tests, all passing**, run live against the real API (no internet access = failures, since there's nothing to mock).

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

Tests never call `axios`/`apiClient` directly — they call a **service object** method instead (see below). Underneath that, every service object is built on the shared `apiClient` in `helpers/apiClient.js`, which:
- Fixes the base URL to `https://dummyjson.com` so calls only reference paths (`/products/1`, not the full URL).
- Sets `validateStatus: () => true`, so 4xx/5xx responses resolve normally instead of throwing — this lets negative-case tests assert on `res.status` and `res.data.message` directly instead of wrapping calls in `try/catch`.

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
