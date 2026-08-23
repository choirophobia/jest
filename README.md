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
│   └── quotes.test.js     # Read-only + random quote (no write endpoints)
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
│   └── quotesApi.js       # Service object — wraps every /quotes endpoint
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

Expected result: **9 suites / 89 tests, all passing**, run live against the real API (no internet access = failures, since there's nothing to mock).

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

**In SOM**, the same idea applies to endpoints instead of pages. Each resource gets a small module — `helpers/productsApi.js`, `helpers/usersApi.js`, `helpers/authApi.js`, `helpers/cartsApi.js`, `helpers/postsApi.js`, `helpers/commentsApi.js`, `helpers/recipesApi.js`, `helpers/todosApi.js`, `helpers/quotesApi.js` — that wraps its raw HTTP calls behind readable methods:

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
- **Read:** `GET /products` (default pagination shape + item field types), `/products/{id}` (price/category/rating range/tags/reviews shape), `/products/search?q=` (results actually contain the query), `/products/category/{category}` (non-empty + every result matches), `/products/categories` (each entry's `slug`/`name`/`url` shape)
- **Update:** `PUT /products/{id}` (full), `PATCH /products/{id}` (partial) — also asserts unmodified fields still reflect the original seed product, confirming the API merges the payload onto the existing record rather than just echoing it back
- **Delete:** `DELETE /products/{id}` — checks `isDeleted`, `deletedOn` type, original fields preserved
- **Negative:** out-of-range ID → 404 (or 429 if rate-limited) with a `message` body, update/delete non-existent ID → 404 (or 429) with a `message` body, unknown category → empty list (200)

### Users (`tests/users.test.js`)
- **Create:** `POST /users/add` — echoes firstName/lastName/age, checks `id` type
- **Read:** `GET /users` (default pagination shape + item field types), `/users/{id}` (email format, address/company/username presence), `/users/search?q=` (results actually contain the query), `/users/filter?key=&value=` (non-empty + every result matches)
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
- **Read:** `GET /carts` (default pagination shape + item field types), `/carts/{id}` (per-product id/title/price/quantity/total shape, `totalProducts` consistency), `/carts/user/{userId}` (non-empty + every result matches, `totalProducts` consistency)
- **Update:** `PUT /carts/{id}` (`merge: false` — asserts the product list is *replaced*, not appended), `PATCH /carts/{id}` (`merge: true` — asserts the product list is *appended to* the original seed cart, not replaced)
- **Delete:** `DELETE /carts/{id}` — checks `isDeleted`, `deletedOn` type, original `userId` preserved
- **Negative:** out-of-range cart ID → 404 (or 429 if rate-limited) with a `message` body, update/delete non-existent cart → 404 (or 429) with a `message` body, user with no carts → 404 (or 429) (confirmed against the live API — DummyJSON does **not** return an empty array here)

### Posts (`tests/posts.test.js`)
- **Create:** `POST /posts/add` — echoes title/body/userId, checks `id` type
- **Read:** `GET /posts` (default pagination shape + item field types), `/posts/{id}` (body/tags/userId/views/reactions shape), `/posts/search?q=` (results actually contain the query, matched across title *and* body)
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

## Conventions

- **One file per resource**, grouped into `Create` / `Read` / `Update` / `Delete` / `negative cases` describe blocks — except read-only resources (`quotes`), which only have `Read` / `negative cases`.
- **Tests call service objects, never `apiClient` directly.** Adding a new endpoint call means adding a method to the resource's service object in `helpers/`, not inlining a new `apiClient.get/post/...` call inside a test.
- **No state reset between tests.** `beforeAll`/`beforeEach` are only used for shared setup (e.g. obtaining an auth token in `auth.test.js`), never to "reset" server state — DummyJSON doesn't persist writes, so there's nothing to reset.
- **Assertions focus on:**
  - `res.status` matching the expected HTTP status
  - Key fields present/correct in `res.data`
  - For writes, that the echoed response reflects the payload sent (not that it was actually saved)
- **Every resource has at least one negative test:** invalid/out-of-range ID, missing required field, or invalid auth.

## Important Notes & Gotchas

- **Writes don't persist.** Creating, updating, or deleting a resource returns a realistic response but has no lasting effect — running the suite repeatedly is safe and idempotent.
- **No rate limits are documented** for DummyJSON, but avoid hammering it in tight loops out of courtesy — it's a shared public sandbox, not your own infrastructure. In practice, occasional `429` responses have been observed on the "not found" negative cases for products/users/carts, so those assertions accept `[404, 429]` rather than asserting `404` strictly.
- **Create status codes aren't consistent across resources.** Most `POST .../add` endpoints return `201`, but `POST /recipes/add` returns `200` — verified directly against the live API before writing the assertion. Don't assume `201` when adding a new resource; check the real response first.
- **This is a practice/portfolio project.** Treat DummyJSON as a dev/testing aid, not production infrastructure — don't build real features on top of assumptions validated only here.
- **Auth credentials are DummyJSON's published test user** (`emilys` / `emilyspass`), documented at [dummyjson.com/docs/auth](https://dummyjson.com/docs/auth). If DummyJSON ever rotates its seed data, update `VALID_CREDENTIALS` in `tests/auth.test.js`.
