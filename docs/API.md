# API Reference

Base URL: `http://localhost:3000/api`

All requests and responses are JSON. All endpoints are prefixed with `/api` (e.g. `POST /api/transactions`).

## Response conventions

### Success

```json
{ "success": true, "data": { ... } }
```

List endpoints add a `meta` object for pagination:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "total": 5, "page": 1, "totalPages": 3, "limit": 2 }
}
```

### Error

```json
{ "success": false, "message": "Human readable description." }
```

### Status codes

| Code | Meaning |
| --- | --- |
| 200 | OK (read, update, delete) |
| 201 | Created (POST) |
| 400 | Validation or malformed JSON body |
| 401 | Authentication required, or invalid/expired session token |
| 403 | Authenticated, but no local user is linked to this session |
| 404 | Resource not found (or referenced category not found) |
| 409 | Conflict: duplicate record or category still in use |
| 500 | Unexpected server error |

### Authentication

All endpoints except `GET /api/health`, `POST /api/auth/provision`, and `GET /api/auth/me` require authentication.

- Clients send the Supabase session access token as:

  ```
  Authorization: Bearer <Supabase access token>
  ```

- The backend verifies the token with `supabase.auth.getUser()` (server-side, against Supabase Auth) and maps the Supabase Auth UUID to the local `User.authUserId`.
- **Ownership is always derived from the authenticated identity** (`req.user.id`). Any `userId` supplied in the request body or query is ignored — a client cannot act on another user's data.
- Missing/invalid token → **401**; valid token with no linked local user → **403**.

### Amounts and dates

- `amount` is a `Decimal` serialized as a **string**, e.g. `"25000"`.
- `date` is sent and returned as an ISO date; requests accept `YYYY-MM-DD`.
- All monetary arithmetic happens on the backend.

---

## Health

### `GET /api/health`

Liveness check.

**Example response**

```json
{ "success": true, "data": { "status": "ok" } }
```

---

## Authentication

### `GET /api/auth/me`

Resolve the current authenticated identity to a local FinTrack user.

- Requires `Authorization: Bearer <Supabase access token>`.
- If the Auth UUID already maps to a local `User`, returns it unchanged.
- If it does not yet map, **provisions** a new local user (with default categories) and returns it.
- **403** if the token is valid but the caller is using a test identity that cannot provision through this route.

**Example response**

```json
{ "success": true, "data": { "id": 1, "authUserId": "00000000-0000-0000-0000-000000000000", "email": "user@example.com", "name": "Alex" } }
```

(Above is illustrative — real responses contain the actual Supabase Auth UUID.)

### `POST /api/auth/provision`

Same identity-resolution/provisioning behavior as `/api/auth/me`, returning `201` when a new local user is created. Idempotent for an already-linked Auth UUID.

---

## Categories

### `GET /api/categories`

List all categories, **sorted by name ascending**.

**Example response**

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Bills", "icon": "\ud83d\udcc4", "color": "#EF4444", "createdAt": "..." }
  ]
}
```

### `POST /api/categories`

Create a category.

**Body**

```json
{ "name": "Travel", "icon": "\u2708\ufe0f", "color": "#0ea5e9" }
```

| Field | Required | Rules |
| --- | --- | --- |
| `name` | Yes | Non-empty, at most 50 characters, **unique** |
| `icon` | No | Emoji shown in the UI |
| `color` | No | Hex value like `#f59e0b` |

**Status**: `201` on success with the created record. Duplicate name → `409` `"This record already exists."`

### `GET /api/categories/:id`

Get a single category. **404** `"Category not found."` if it does not exist.

### `PUT /api/categories/:id`

Update `name`, `icon`, `color` (same validation as create). Returns the updated record. **404** if not found.

### `DELETE /api/categories/:id`

Delete a category. Returns `{ success: true, data: { id } }`.

- **409** `"This category cannot be deleted because it is currently in use."` when the category is referenced by any transaction or budget. Only unused categories can be deleted.

---

## Transactions

### `GET /api/transactions`

List transactions with filtering, sorting, and pagination.

**Query parameters** (all optional)

| Param | Values | Notes |
| --- | --- | --- |
| `search` | string | Case-insensitive match on `description` |
| `type` | `INCOME` / `EXPENSE` | Filter by transaction type |
| `categoryId` | integer | Filter by category |
| `startDate` | `YYYY-MM-DD` | Inclusive lower bound on `date` |
| `endDate` | `YYYY-MM-DD` | Inclusive upper bound on `date` |
| `sortBy` | `date` (default) / `amount` | Invalid value → 400 `"sortBy must be date or amount."` |
| `sortOrder` | `desc` (default) / `asc` | Invalid value → 400 `"sortOrder must be asc or desc."` |
| `page` | integer ≥ 1 | Default 1; `0` → 400 `"page must be at least 1."` |
| `limit` | integer 1–100 | Default 20; `101` → 400 `"limit must be at most 100."` |

Each item includes the embedded `category`.

**Example response**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "description": "Groceries",
      "amount": "25000",
      "type": "EXPENSE",
      "categoryId": 1,
      "date": "...",
      "note": null,
      "createdAt": "...",
      "category": { "id": 1, "name": "Food", "icon": "\ud83c\udf54", "color": "#F97316" }
    }
  ],
  "meta": { "total": 1, "page": 1, "totalPages": 1, "limit": 20 }
}
```

### `POST /api/transactions`

Create a transaction.

**Body**

```json
{
  "description": "Groceries",
  "amount": "25000",
  "type": "EXPENSE",
  "categoryId": 1,
  "date": "2026-08-10",
  "note": "weekly shop"
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `description` | Yes | Non-empty |
| `amount` | Yes | Positive number; `0` → 400 `"Amount must be greater than 0."`; negative/non-numeric → 400 `"Amount must be a positive number."` |
| `type` | Yes | `INCOME` or `EXPENSE`; anything else → 400 `"Type must be INCOME or EXPENSE."` |
| `categoryId` | Yes | Existing category; non-integer → 400 `"categoryId must be an integer."`; unknown → 400 `"Category not found."` |
| `date` | Yes | Real calendar date in `YYYY-MM-DD`; invalid → 400 `"Invalid date. Use YYYY-MM-DD."` |
| `note` | No | At most 500 characters (trimmed; blank → `null`) |

**Status**: `201` with the created record.

### `GET /api/transactions/:id`

Get a single transaction. **404** `"Transaction not found."` if missing.

### `PUT /api/transactions/:id`

Update all fields (same rules as create). Returns the updated record. **404** if the transaction does not exist.

### `DELETE /api/transactions/:id`

Delete a transaction. Returns `{ success: true, data: { id } }`. **404** if not found.

---

## Budgets

Budgets are per-category monthly limits. The API enriches every budget with live spending data:

| Enriched field | Description |
| --- | --- |
| `spent` | Total `EXPENSE` transactions for that category in the budget month |
| `remaining` | `amount - spent` (can be negative) |
| `progress` | `Math.round(spent / amount * 100)` |
| `status` | `"On Track"` (progress < 80), `"Near Limit"` (80–99), `"Over Budget"` (≥ 100) |

Each budget also embeds its `category`.

### `GET /api/budgets`

List budgets. Optionally filter by `month` and `year` (e.g. `?month=3&year=2025`).

### `GET /api/budgets/:id`

Get one budget with enrichment. **404** `"Budget not found."` if missing.

### `POST /api/budgets`

Create a budget.

**Body**

```json
{ "categoryId": 1, "month": 8, "year": 2026, "amount": "100000" }
```

| Field | Required | Rules |
| --- | --- | --- |
| `categoryId` | Yes | Existing category; unknown → 400 `"Category not found."` |
| `month` | Yes | 1–12 (`"month must be at least 1."` / `"month must be at most 12."`) |
| `year` | Yes | 2000–2100 (`"year must be at least 2000."` / `"year must be at most 2100."`) |
| `amount` | Yes | Positive number |

**Status**: `201`. More than one budget for the same `(categoryId, month, year)` → **409** `"This record already exists."`

### `PUT /api/budgets/:id`

Update the budget (same validation; `categoryId`/`month`/`year` may be changed). Returns the enriched record. **404** if not found.

### `DELETE /api/budgets/:id`

Delete a budget. Returns `{ success: true, data: { id } }`. **404** if not found.

---

## Dashboard

### `GET /api/dashboard/summary`

Everything the dashboard page needs in one response.

**Example response shape**

```json
{
  "success": true,
  "data": {
    "summary": { "balance": "7300000", "income": "8000000", "expense": "700000" },
    "recentTransactions": [ { "id": 2, "description": "Groceries", "amount": "500000", "type": "EXPENSE", "category": { "id": 1, "name": "Food", "icon": "...", "color": "#F97316" }, ... } ],
    "monthlySeries": [ { "month": "2026-03", "income": "0", "expense": "200000" }, ... ],
    "expenseByCategory": [ { "name": "Food", "icon": "...", "color": "#F97316", "total": "500000" }, ... ],
    "insights": [ "In August 2026 you spent 100% of your income (700,000 / 700,000).", "Food is your highest spending category. Consider a budget." ]
  }
}
```

| Field | Description |
| --- | --- |
| `summary` | `balance` (income − expense), `income`, `expense` totals across all time |
| `recentTransactions` | Most recent transactions (newest first, includes `category`) |
| `monthlySeries` | Last 6 months of `income`/`expense`, oldest → newest |
| `expenseByCategory` | Expense totals grouped by category, sorted descending |
| `insights` | Fixed set of rule-based insight strings |

---

## Reports

### `GET /api/reports/monthly`

Twelve months (last 12, oldest → newest) of `income`/`expense` with month-over-month deltas.

```json
{
  "success": true,
  "data": {
    "months": [
      { "month": "2025-09", "income": "0", "expense": "0", "incomeDelta": null, "expenseDelta": null },
      { "month": "2025-10", "income": "0", "expense": "150000", "incomeDelta": 0, "expenseDelta": 150000 }
    ]
  }
}
```

The first month always has `null` deltas (no previous period for comparison).

### `GET /api/reports/categories`

Expense totals per category (all time), sorted descending, plus the highest-spending category.

```json
{
  "success": true,
  "data": {
    "categories": [ { "name": "Food", "total": "530000", "icon": "...", "color": "#F97316" }, ... ],
    "highest": { "name": "Food", "total": "530000", "icon": "...", "color": "#F97316" }
  }
}
```

---

## AI Insights

### `GET /api/ai-insights?month=&year=&lang=`

Per-month AI-assisted financial insights. Metrics are always computed deterministically on-device; an optional AI provider may summarize and prioritize them. When no provider is configured, the provider call fails, or the response is invalid, the endpoint returns deterministic rule-based insights (`source: "rule"`).

Query params:

| Param | Required | Description |
| --- | --- | --- |
| `month` | yes | 1–12 |
| `year` | yes | 2000–2100 |
| `lang` | no | `en` (default) or `id`. Drives provider instruction + fallback language. |

Returns (abridged):

```json
{
  "success": true,
  "data": {
    "period": "2026-09",
    "month": 9,
    "year": 2026,
    "source": "rule" | "ai",
    "aiConfigured": false,
    "summary": "You had a healthy savings rate this month.",
    "metrics": {
      "income": 5000000,
      "expense": 2000000,
      "net": 3000000,
      "savingsRate": 60,
      "transactionCount": 4,
      "prevMonthExpense": 1000000,
      "expenseChangePercent": 100,
      "topCategories": [ { "name": "Food", "total": 1000000, "share": 50 } ],
      "budgetStatus": [ { "category": "Food", "amount": 1000000, "spent": 950000, "utilization": 95, "status": "Near Limit" } ],
      "goals": [ { "name": "Vacation", "progress": 50, "status": "IN_PROGRESS" } ],
      "largestTransactions": [ { "description": "gaji", "amount": 5000000, "type": "INCOME", "category": "Salary" } ]
    },
    "insights": [
      {
        "type": "cashflow",
        "severity": "positive",
        "title": "Good savings rate",
        "explanation": "A healthy share of your income is being kept as savings.",
        "recommendation": "Keep it up and reinforce this habit next month.",
        "metrics": { "current": 60, "previous": null, "changePercent": null },
        "source": "rule"
      }
    ]
  }
}
```

When `source` is `"ai"`, the `title`/`explanation`/`recommendation` (and optionally `metrics` on each insight) come from the provider; the top-level `data.metrics` are always deterministic and are never overridden by the AI. All text is returned in the requested `lang`.

**AI provider configuration** (optional, server-side only in `Backend/.env`):

- `AI_PROVIDER` — any OpenAI-compatible `.../chat/completions` base URL.
- `AI_API_KEY` — bearer token.
- `AI_MODEL` — model name.

If `AI_PROVIDER` is unset, the fallback runs automatically. Standard status codes: `400` for missing/out-of-range `month`/`year`.

---

## Error handling notes

- **Malformed JSON body** → `400` (handled by the error middleware).
- **Duplicate records**: Prisma `P2002` violations (category name, budget `(categoryId, month, year)` uniqueness, and P2003 FK failures) are currently surfaced as the generic `400`/`409` `"This record already exists."` after the service-level prechecks. Known limitation: the more specific per-resource duplicate messages are not reachable through the standard database paths (see Phase 11 testing notes in `AGENTS.md`/report); the frontend only depends on the status code and message containing `already exists`.
- **Unknown resources inside payloads** are rejected with `400` `"Category not found."` by the services, not with `404`, because the reference is a validation problem.
- Unexpected internal errors return `500` with a generic message.