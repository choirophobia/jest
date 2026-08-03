# DummyJSON API Testing — Jest E2E Suite

## Project Context
- Goal: build a complete end-to-end API test suite against DummyJSON (https://dummyjson.com) using Jest.
- Purpose: QA practice/portfolio piece demonstrating CRUD testing, auth flow testing, and negative/error-case testing.
- Target API: external, already-running (DummyJSON) — no Supertest needed. Use `axios` for HTTP calls.
- No API key required. CORS enabled. Writes are simulated (not persisted) — assertions should check response shape/status/echoed values, not actual state persistence.

## Tech Stack
- Test runner: Jest
- HTTP client: axios
- Language: JavaScript (Node.js)

## Project Structure
```
dummyjson-api-tests/
├── tests/
│   ├── products.test.js
│   ├── users.test.js
│   ├── auth.test.js
│   ├── carts.test.js
│   └── posts.test.js
├── helpers/
│   ├── apiClient.js       # shared axios instance / base URL config
│   ├── productsApi.js     # service object wrapping /products endpoints
│   ├── usersApi.js        # service object wrapping /users endpoints
│   ├── authApi.js         # service object wrapping /auth endpoints
│   ├── cartsApi.js        # service object wrapping /carts endpoints
│   └── postsApi.js        # service object wrapping /posts endpoints
├── package.json
├── README.md
└── CLAUDE.md
```

Tests call resource-specific service objects (e.g. `productsApi.getById(1)`), never `apiClient` directly — the Service Object Model, API testing's equivalent of the Page Object Model. See README.md for the full rationale.

## Commands
- Install: `npm install`
- Run all tests: `npm test`
- Run one file: `npx jest tests/products.test.js`
- Watch mode: `npx jest --watch`

## Conventions
- One test file per resource (products, users, carts, posts, comments, todos, quotes, recipes).
- Group tests with `describe()` per CRUD operation (Create / Read / Update / Delete) plus a `describe('negative cases')` block per resource.
- Use `beforeAll`/`beforeEach` only for shared setup (e.g. auth token), not for resetting state — DummyJSON doesn't persist writes.
- Assertion style: check `res.status`, key fields in `res.data`, and — for writes — that the echoed response reflects the payload sent.
- Always include at least one negative test per resource: invalid ID (e.g. out-of-range like 999 or 200), missing required field, invalid auth.

## Resource Endpoint Reference

### Products
- CREATE: `POST /products/add`
- READ: `GET /products`, `GET /products/{id}`, `GET /products/search?q=`, `GET /products/category/{category}`, `GET /products/categories`
- UPDATE: `PUT /products/{id}`, `PATCH /products/{id}`
- DELETE: `DELETE /products/{id}`

### Users
- CREATE: `POST /users/add`
- READ: `GET /users`, `GET /users/{id}`, `GET /users/search?q=`, `GET /users/filter`
- UPDATE: `PUT /users/{id}`, `PATCH /users/{id}`
- DELETE: `DELETE /users/{id}`

### Auth
- `POST /auth/login` — returns access/refresh tokens
- `GET /auth/me` — requires Bearer token
- `POST /auth/refresh` — refresh access token

### Carts
- CREATE: `POST /carts/add`
- READ: `GET /carts`, `GET /carts/{id}`, `GET /carts/user/{userId}`
- UPDATE: `PUT /carts/{id}`, `PATCH /carts/{id}`
- DELETE: `DELETE /carts/{id}`

### Posts / Comments / Todos / Quotes / Recipes
- Follow the same CRUD pattern as products/users (list, single, search where available, add, update, delete). Confirm exact query params in https://dummyjson.com/docs before writing tests.

## Testing Priorities (build in this order)
1. Products — full CRUD + search/filter + negative cases (most documented, good starting point)
2. Users — full CRUD + search/filter
3. Auth — login, protected route with/without token, token refresh
4. Carts — CRUD tied to a user ID
5. Remaining resources (posts, comments, todos, quotes, recipes) — lighter coverage, reuse patterns from above

## Notes
- No Supertest — this is an external, already-deployed API, not a self-hosted Express app.
- Rate limits: none documented for DummyJSON (unlike NASA's DEMO_KEY), but avoid hammering it in loops.
- This project is for practice/portfolio use — treat DummyJSON as a dev/testing aid, not production infrastructure.
