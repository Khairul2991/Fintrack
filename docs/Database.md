# Database Schema

Production database is **Supabase PostgreSQL** via Prisma 7. Schema definition: `Backend/prisma/schema.prisma`.

SQLite (`Backend/database/dev.db`) is retained **only as the legacy migration/dev source** — it is never opened at runtime, and its historical migrations are preserved under `Backend/prisma/migrations_sqlite_backup/`.

## Environments

| Environment | Target | Purpose |
| --- | --- | --- |
| Production | Supabase PostgreSQL, schema `public` | Application data (9 tables, 23 rows for the adopted legacy account) |
| Backend tests | `fintrack_test` schema (same Supabase DB) | Reset + recreated on demand via `prisma migrate deploy` with `DATABASE_URL` + `?schema=fintrack_test` |
| Frontend tests | `fintrack_test_fe` schema (same Supabase DB) | Reset + recreated on demand via `prisma migrate deploy` with `DATABASE_URL` + `?schema=fintrack_test_fe` |
| Legacy dev | `Backend/database/dev.db` (SQLite, gitignored) | Migration source / historical reference only; not read at runtime |

## Models

Nine application models/tables:

| Model | Notes |
| --- | --- |
| `User` | `id Int` (autoincrement PK), `authUserId String @unique` (Supabase Auth UUID), `email String @unique`, `name String?` |
| `Category` | `@@unique([userId, name])`; every category belongs to a `User` |
| `Transaction` | Owned via `userId`; links to `Category` and optionally an `Account` |
| `Budget` | `@@unique([userId, categoryId, month, year])`; per-user per-category monthly limit |
| `Account` | `@@unique([userId, name])`; wallet/bank/e-wallet with `initialBalance` |
| `RecurringTransaction` | Owned via `userId`; optionally linked to an `Account` |
| `RecurringBudget` | Owned via `userId`; rolls into a concrete monthly `Budget` |
| `Goal` | Owned via `userId`; optionally linked to an `Account` and `Category` |
| `Notification` | Owned via `userId` |

### Ownership

- Every financial row carries a `userId` FK → `User.id`.
- The client never supplies `userId` with authority: ownership is always derived server-side from the authenticated identity (see [Architecture](Architecture.md)).
- `User.authUserId` uniquely maps the local user to a **Supabase Auth UUID**; `User.email` is unique.

## Enums

Six enums are created in PostgreSQL:

```text
AccountType      = CASH, BANK, SAVINGS, EWALLET, OTHER
BudgetFrequency  = MONTHLY, YEARLY
Frequency        = DAILY, WEEKLY, MONTHLY, YEARLY
GoalStatus       = IN_PROGRESS, COMPLETED
NotificationType = RECURRING_DUE, BUDGET_LIMIT, GOAL_DEADLINE
TransactionType  = INCOME, EXPENSE
```

## Schema shape

- **9 application tables** (`User, Category, Transaction, Budget, Account, RecurringTransaction, RecurringBudget, Goal, Notification`) + Prisma's `_prisma_migrations`.
- **6 enums** and **16 foreign keys** (every `userId`/`categoryId`/`accountId` reference is enforced).

## Migrations

- Baseline migration: `20260905073013_init_postgres` — applied to production `public` (and, via `prisma migrate deploy`, to the isolated test schemas).
- SQLite migration history is preserved under `Backend/prisma/migrations_sqlite_backup/` for audit/history only.

## Legacy account adoption

The legacy User #1 was safely adopted to a real Supabase Auth identity by updating **only** `User #1.authUserId` to the verified Auth UUID (keeping `id = 1`, `email`, and `name` unchanged). No primary keys, ownership, or financial record values were changed. Total application rows: **23** (User 1, Category 10, Transaction 4, Budget 1, Account 5, Goal 2, Recurring* 0, Notification 0).

## Config notes

- The schema datasource block has **no `url` field**; the URL comes from `DATABASE_URL` (see `prisma.config.ts`).
- `prisma.config.ts` holds the datasource url, migration path, and seed command.
- Runtime driver adapter is `@prisma/adapter-pg`. `src/lib/prisma.js` instantiates `new PrismaPg(DATABASE_URL, { schema })` when the URL has a `?schema=` param (test schemas), otherwise without it (production `public`).
- `.env` is not auto-loaded: dev scripts use `--env-file=.env`, and `src/lib/prisma.js` calls `dotenv.config()`.
- Seeding is explicit only (`npx prisma db seed`, idempotent): it reports the legacy-user status; new users receive the default categories automatically on provisioning.