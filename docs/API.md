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
- If it does not yet map, **provisions** a new local user (with a default Cash account) and returns it.
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

List all categories, **sorted by type ascending, then name ascending**.

**Example response**

```json
{
  "success": true,
  "data": [
    { "id": 1, "userId": null, "type": "EXPENSE", "name": "Bills", "icon": "\ud83d\udcc4", "color": "#EF4444", "isSystem": true, "createdAt": "..." }
  ]
}
```

### `POST /api/categories`

Create a category.

**Body**

```json
{ "name": "Travel", "type": "EXPENSE", "icon": "\u2708\ufe0f", "color": "#0ea5e9" }
```

| Field | Required | Rules |
| --- | --- | --- |
| `name` | Yes | Non-empty, at most 50 characters, **unique** |
| `type` | Yes | `INCOME` or `EXPENSE` |
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
| `type` | `INCOME` / `EXPENSE` / `TRANSFER` | Filter by transaction type |
| `categoryId` | integer | Filter by category |
| `accountId` | integer | Filter by the transaction's account |
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
| `type` | Yes | `INCOME`, `EXPENSE`, or `TRANSFER`; anything else → 400 `"Type must be INCOME, EXPENSE, or TRANSFER."` |
| `categoryId` | Yes* | Existing category; non-integer → 400 `"categoryId must be an integer."`; unknown → 400 `"Category not found."`. Required for `INCOME`/`EXPENSE`; **forbidden for `TRANSFER`** (400 `"Transfer cannot have a category."`) |
| `accountId` | No | Existing account (balance is updated). Optional |
| `transferAccountId` | No | TRANSFER destination account. Required for `TRANSFER` (400 `"Transfer destination account is required."`); must differ from `accountId` (400 `"Transfer source and destination must be different."`); only allowed for `TRANSFER` |
| `goalId` | No | Existing goal to credit (goal progress + a `GoalActivity` are created) |
| `sourceGoalId` | No | Source goal to debit (goal progress — a `GoalActivity`); only allowed for `TRANSFER` |
| `date` | Yes | Real calendar date in `YYYY-MM-DD`; invalid → 400 `"Invalid date. Use YYYY-MM-DD."` |
| `note` | No | At most 500 characters (trimmed; blank → `null`) |

**Status**: `201` with the created record. INCOME/EXPENSE transactions update the linked `Account` balance; TRANSFER moves funds between `accountId` and `transferAccountId` (net zero on balance).

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
    "accounts": [ { "id": 1, "name": "Cash", "type": "CASH", "isDefault": true, "initialBalance": "0", "balance": "500000", "income": "800000", "expense": "300000" } ],
    "recentTransactions": [ { "id": 2, "description": "Groceries", "amount": "500000", "type": "EXPENSE", "category": { "id": 1, "name": "Food", "icon": "...", "color": "#F97316" }, ... } ],
    "monthlySeries": [ { "month": "2026-03", "income": "0", "expense": "200000" }, ... ],
    "expenseByCategory": [ { "categoryId": 1, "name": "Food", "icon": "...", "color": "#F97316", "total": "500000" }, ... ],
    "insights": [ "Your expenses increased compared to last month.", "Food is your highest spending category this month.", "You have exceeded your Food budget." ]
  }
}
```

| Field | Description |
| --- | --- |
| `summary` | `balance` (sum of enriched account balances), `income`, `expense` totals across all time |
| `accounts` | Active accounts with enriched `income`, `expense`, `balance` |
| `recentTransactions` | 5 most recent transactions (newest first, includes `category`) |
| `monthlySeries` | Last 6 months of `income`/`expense`, oldest → newest |
| `expenseByCategory` | Expense totals grouped by category, sorted descending |
| `insights` | Rule-based strings: month-over-month expense change, highest-spending category this month, and any exceeded budgets |

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
    "categories": [ { "categoryId": 1, "name": "Food", "total": "530000", "icon": "...", "color": "#F97316" }, ... ],
    "highest": { "categoryId": 1, "name": "Food", "total": "530000", "icon": "...", "color": "#F97316" }
  }
}
```

---

## Reports overview

### `GET /api/reports/overview`

Everything the Reports page needs in one response: the 12-month monthly report, the all-time category report, and the user's categories.

```json
{
  "success": true,
  "data": {
    "monthly": { "months": [ { "month": "2025-10", "income": "0", "expense": "150000", "incomeDelta": null, "expenseDelta": null } ] },
    "categoryReport": {
      "categories": [ { "categoryId": 1, "name": "Food", "icon": "...", "color": "#F97316", "total": "500000" } ],
      "highest": { "categoryId": 1, "name": "Food", "icon": "...", "color": "#F97316", "total": "500000" }
    },
    "categories": [ { "id": 1, "userId": null, "type": "EXPENSE", "name": "Food", "icon": "...", "color": "#F97316", "isSystem": true } ]
  }
}
```

### `GET /api/reports/pdf?lang=en|id`

Server-generated **PDF** (A4) covering the last 12 months. Built with `pdfkit` from the same aggregations as the web Reports page:

- Sections: header, summary (`Total income` / `Total expense` / `Balance`), Top Expense Categories (top 5 with share bars), Monthly Summary table (income/expense/net per month), Transaction Summary, footer.
- `lang` (`en` default / `id`) switches headings, category names (`localizeCategoryName`), and month names; amounts always format as `Rp…` via `Intl.NumberFormat('id-ID')`.
- Responds with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="FinTrack-FinancialReport-YYYY-MM-DD.pdf"`.
- Uses the authenticated user's data only.

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

## Accounts

Base `/api/accounts`. Accounts are the wallets/banks/e-wallets money moves through. Each account payload is enriched with `income`, `expense`, and `balance` (initial balance + income − expense + transfers in − transfers out). The list endpoint additionally reports `inUse` per account (whether any transaction, transfer, recurring schedule, goal, or goal activity references it).

### `GET /api/accounts`

List active (non-deleted) accounts, sorted by name.

### `GET /api/accounts/:id`

Single account with enrichment. **404** `"Account not found."`

### `POST /api/accounts`

Create an account.

**Body**

```json
{ "name": "Travel Card", "type": "BANK", "initialBalance": "100000" }
```

| Field | Required | Rules |
| --- | --- | --- |
| `name` | Yes | Non-empty, at most 50 characters |
| `type` | Yes | `CASH`, `BANK`, `SAVINGS`, `EWALLET`, or `OTHER`; anything else → 400 `"Type must be CASH, BANK, SAVINGS, EWALLET, or OTHER."` |
| `initialBalance` | No | Non-negative number (default `"0"`) |

**Status**: `201` with the enriched record. Duplicate name among active accounts → **409** `"An account with this name already exists."`

### `PUT /api/accounts/:id`

Update `name`/`type`/`initialBalance` (same validation). The default Cash account cannot be changed to another type → **409** `"The default cash account cannot be changed to another type."` A soft-deleted account → 400 `"This account has been deleted."`

### `DELETE /api/accounts/:id`

- Default Cash account → **409** `"The default cash account cannot be deleted."`
- Account still referenced (transactions, transfers, recurring schedules, goals, activities) → **soft delete**: sets `deletedAt`, deactivates its active recurring schedules, returns `{ id, archived: true }`.
- Unreferenced account → hard-deleted, returns `{ id, archived: false }`.

> Transfers between accounts are modeled as `TRANSFER` transactions (see `POST /api/transactions`), not as a separate accounts endpoint.

---

## Goals

Base `/api/goals`. Every goal embeds its `category`, `account`, and sorted `activities` list (each activity embeds the `transaction` that produced it and its `account`). Goals are serialized with derived `currentAmount` (sum of `CONTRIBUTION` − `WITHDRAWAL` activities, floored at 0), `progress`, `remaining`, and `status` (`IN_PROGRESS` / `COMPLETED`).

### `GET /api/goals/overview`

Everything the Goals page needs in one call: `{ goals: [...], categories: [...], accounts: [...] }`.

### `GET /api/goals`

All goals, `IN_PROGRESS` first, newest created first.

### `GET /api/goals/:id`

Single goal including activities. **404** `"Goal not found."`

### `POST /api/goals`

Create a goal.

| Field | Required | Rules |
| --- | --- | --- |
| `name` | Yes | Non-empty, at most 100 characters |
| `targetAmount` | Yes | Positive number |
| `accountId` | Yes | Active account; missing → 400 `"Account is required."`, unknown/deleted → 400 |
| `categoryId` | No | Existing category (400 if unknown) |
| `targetDate` | No | `YYYY-MM-DD`; invalid → 400 `"Invalid target date. Use YYYY-MM-DD."` |
| `description` | No | At most 500 characters (blank → `null`) |

**Status**: `201`.

### `PUT /api/goals/:id`

Full update with the same validation (a previously archived account is cleaned up when it becomes orphaned). **404** if not found.

### `DELETE /api/goals/:id`

Deletes the goal and its activities (cascade). Returns `{ id }`. **404** if not found.

> Goal progress is driven by transactions: an `INCOME`/`EXPENSE` transaction carrying `goalId` credits the goal and records a `CONTRIBUTION` activity; a `TRANSFER` with `sourceGoalId` debits it via a `WITHDRAWAL` activity.

---

## Analytics

### `GET /api/analytics/summary`

Rolled-up statistics over the last 12 months (`TRANSFER` rows excluded):

```json
{
  "success": true,
  "data": {
    "period": { "start": "2025-10", "end": "2026-09", "months": 12 },
    "totalIncome": "8000000",
    "totalExpense": "700000",
    "netCashFlow": "7300000",
    "avgMonthlyExpense": "58333",
    "avgTransactionAmount": "108333",
    "averageTransactionsPerMonth": 0.66,
    "transactionCount": 8,
    "expenseTransactionCount": 6,
    "highestSpendingCategory": { "categoryId": 1, "name": "Food", "icon": "...", "color": "#F97316", "total": "500000" },
    "spendingConcentration": 71.4,
    "monthOverMonthChange": null,
    "savingsRate": null,
    "largestTransaction": { "id": 2, "description": "Groceries", "amount": "300000", "type": "EXPENSE", "date": "2026-09-01", "category": { ... } },
    "monthlyTrend": [ { "month": "2025-10", "income": "0", "expense": "150000", "net": "-150000" } ],
    "budgetUtilizationTrend": { "count": 1, "averageUtilization": 0.95, "budgets": [ { "categoryId": 1, "amount": "1000000", "spent": "950000", "utilization": 0.95 } ] }
  }
}
```

Percentages (`spendingConcentration`, `monthOverMonthChange`, `savingsRate`) are `null` when the denominator is absent.

---

## Recurring transactions

Base `/api/recurring-transactions`. Each item embeds its `category` and `account` and carries scheduling fields: `frequency`, `startDate`, `endDate`, `active`, `lastRunAt`, `nextOccurrence`.

### `GET /api/recurring-transactions`

First runs **catch-up** (generates any due transactions), then lists items ordered by `nextOccurrence`:

```json
{ "success": true, "data": { "items": [ ... ], "catchUp": { "generated": 2, "processed": 4 } } }
```

### `GET /api/recurring-transactions/:id`

Single record. **404** `"Recurring transaction not found."`

### `POST /api/recurring-transactions`

| Field | Required | Rules |
| --- | --- | --- |
| `description` | Yes | Non-empty, at most 200 characters |
| `amount` | Yes | Positive number |
| `type` | Yes | `INCOME` or `EXPENSE`; anything else → 400 `"Type must be INCOME or EXPENSE."` |
| `categoryId` | Yes | Existing category (400 if unknown) |
| `accountId` | No | Active account; defaults to the user's default Cash account |
| `frequency` | Yes | `DAILY`, `WEEKLY`, `MONTHLY`, or `YEARLY`; anything else → 400 `"Frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY."` |
| `startDate` | Yes | `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`; invalid → 400 `"Invalid start date. Use YYYY-MM-DD or YYYY-MM-DDTHH:mm."` |
| `endDate` | No | `YYYY-MM-DD`; must be on/after start → 400 `"End date must be on or after the start date."` |
| `note` | No | At most 500 characters (blank → `null`) |

**Status**: `201`.

### `PUT /api/recurring-transactions/:id`

Full update, same validation (also 400 `"Start date must be before the end date."`). **404** if not found.

### `PATCH /api/recurring-transactions/:id/active`

Toggle auto-generation. Body: `{ "active": false }`. Returns the updated record. **404** if not found.

### `DELETE /api/recurring-transactions/:id`

Removes the schedule (already-generated transactions stay). Returns `{ id }`. **404** if not found.

---

## Recurring budgets

Base `/api/recurring-budgets`. Recurring budgets roll forward into concrete monthly `Budget` rows.

### `GET /api/recurring-budgets`

First runs **rollover** (creates any missing concrete budgets for elapsed periods), then returns the list of recurring budgets ordered by next period. Each item embeds its `category` and a `next` field (`"YYYY-MM"`):

```json
{ "success": true, "data": [ { "id": 1, "categoryId": 2, "amount": "1000000", "frequency": "MONTHLY", "startMonth": 8, "startYear": 2026, "nextMonth": 10, "nextYear": 2026, "active": true, "createdAt": "...", "category": { "id": 2, "name": "Food", "icon": "...", "color": "#F97316" }, "next": "2026-10" } ] }
```

### `GET /api/recurring-budgets/:id`

Single record. **404** `"Recurring budget not found."`

### `POST /api/recurring-budgets`

| Field | Required | Rules |
| --- | --- | --- |
| `categoryId` | Yes | Existing category (400 if unknown) |
| `amount` | Yes | Positive number |
| `frequency` | Yes | `MONTHLY` or `YEARLY`; anything else → 400 `"Frequency must be MONTHLY or YEARLY."` |
| `startMonth` | Yes | 1–12 |
| `startYear` | Yes | 2000–2100 |

**Status**: `201`.

### `PUT /api/recurring-budgets/:id`

Update, same validation. **404** if not found.

### `PATCH /api/recurring-budgets/:id/active`

Toggle rollover. Body: `{ "active": true }`. Returns the updated record. **404** if not found.

### `DELETE /api/recurring-budgets/:id`

Returns `{ id }`. **404** if not found.

---

## Notifications

Base `/api/notifications`.

### `GET /api/notifications`

Most recent 100 notifications plus the unread count:

```json
{ "success": true, "data": { "items": [ ... ], "unread": 3 } }
```

### `POST /api/notifications/generate`

Runs recurring catch-up + budget rollover, then creates notifications for:
- **`RECURRING_DUE`** — an active recurring transaction's `nextOccurrence` has arrived.
- **`BUDGET_LIMIT`** — a budget is exceeded, or ≥ 80% used ("wording": "Budget exceeded" / "Approaching budget limit").
- **`GOAL_DEADLINE`** — an `IN_PROGRESS` goal with a `targetDate` ≤ 30 days away.

Identical unread messages are deduplicated. Returns `{ created, unread, catchUp, rollover }`.

### `PATCH /api/notifications/:id/read`

Mark one notification read. Returns `{ id }`. **404** `"Notification not found."`

### `POST /api/notifications/read-all`

Mark all notifications read. Returns `{ marked: true }`.

---

## Export

### `GET /api/export/transactions`

Exports **every** matching transaction (internally paging through the full list) as a JSON array row-per-transaction. Accepts the same query params as `GET /api/transactions` except `page`/`limit`.

```json
{ "success": true, "data": [ { "id": 1, "date": "2026-09-01", "type": "EXPENSE", "category": "Food", "account": "Cash", "amount": "25000", "note": "", "description": "Groceries" } ] }
```

Transfer rows combine source → destination in `account` (e.g. `"Cash → Bank"`). The frontend builds the final `.xlsx` workbook client-side with `exceljs` (`Frontend/src/utils/exportUtils.js`).

---

## Users

### `DELETE /api/users/me/data`

Permanently deletes **all** of the authenticated user's data in one transaction — transactions, recurring transactions, budgets, recurring budgets, goals (+ activities), accounts, user-created categories, and notifications — then recreates the default Cash account. Global system categories are kept. Returns `{ success: true, data: { reset: true } }`.

---

## Error handling notes

- **Malformed JSON body** → `400` (handled by the error middleware).
- **Unknown records**: Prisma `P2025` ("record not found") is mapped to `404`.
- **Duplicate records**: Prisma `P2002` violations (category name, budget `(categoryId, month, year)` uniqueness, and P2003 FK failures) are currently surfaced as the generic `400`/`409` `"This record already exists."` after the service-level prechecks. Known limitation: the more specific per-resource duplicate messages are not reachable through the standard database paths (see Phase 11 testing notes in `AGENTS.md`/report); the frontend only depends on the status code and message containing `already exists`.
- **Unknown resources inside payloads** are rejected with `400` `"Category not found."` by the services, not with `404`, because the reference is a validation problem.
- Unexpected internal errors return `500` with a generic message.