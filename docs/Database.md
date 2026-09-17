# Database Schema

Production database is **Supabase PostgreSQL** via Prisma 7. Schema definition: `Backend/prisma/schema.prisma`.

SQLite (`Backend/database/dev.db`) is retained **only as the legacy migration/dev source** — it is never opened at runtime, and its historical migrations are preserved under `Backend/prisma/migrations_sqlite_backup/`.

## Environments

| Environment | Target | Purpose |
| --- | --- | --- |
| Production | Supabase PostgreSQL, schema `public` | Application data |
| Backend tests | `fintrack_test` schema (same Supabase DB) | Reset + recreated on demand via `prisma migrate deploy` with `DATABASE_URL` + `?schema=fintrack_test` |
| Frontend tests | `fintrack_test_fe` schema (same Supabase DB) | Reset + recreated on demand via `prisma migrate deploy` with `DATABASE_URL` + `?schema=fintrack_test_fe` |
| Legacy dev | `Backend/database/dev.db` (SQLite, gitignored) | Migration source / historical reference only; not read at runtime |

## Models

Ten application models/tables:

| Model | Notes |
| --- | --- |
| `User` | `id Int` (autoincrement PK), `authUserId String @unique` (Supabase Auth UUID), `email String @unique`, `name String?` |
| `Category` | `userId Int?` (nullable), `type TransactionType`, `isSystem Boolean @default(false)`. Default/system categories are global `isSystem` rows shared by every user; user categories set `userId`. Uniqueness is enforced in the service layer (no DB unique on name). Indexed on `userId` and `type` |
| `Transaction` | Owned via `userId`; links to `Category`, optionally an `Account`, a `transferAccount` (TRANSFER destination), a `Goal`/`sourceGoal`, and the generating `RecurringTransaction` |
| `Budget` | `@@unique([userId, categoryId, month, year])`; per-user, per-category monthly limit; optionally rolled from a `RecurringBudget` |
| `Account` | Wallet/bank/e-wallet with `type AccountType`, `initialBalance`, `isDefault`, and `deletedAt` (soft delete when referenced) |
| `RecurringTransaction` | Owned via `userId`; schedule with `frequency`, `startDate`/`endDate`, `active`, `lastRunAt`, `nextOccurrence`; optionally linked to an `Account` |
| `RecurringBudget` | Owned via `userId`; `frequency BudgetFrequency` with `startMonth`/`startYear` and rolling `nextMonth`/`nextYear`; rolls into concrete monthly `Budget` rows |
| `Goal` | Owned via `userId`; `targetAmount`/`currentAmount`, optional `targetDate`, `categoryId`, `accountId`, and `status GoalStatus` |
| `GoalActivity` | Contribution/withdrawal history for a `Goal` (`type GoalActivityType`), optionally linked to an `Account` and the `Transaction` that produced it |
| `Notification` | Owned via `userId`; `type NotificationType`, `title`, `message`, `read` |

### Ownership

- Every financial row carries a `userId` FK → `User.id`.
- The client never supplies `userId` with authority: ownership is always derived server-side from the authenticated identity (see [Architecture](Architecture.md)).
- `User.authUserId` uniquely maps the local user to a **Supabase Auth UUID**; `User.email` is unique.

## Enums

Seven enums are created in PostgreSQL:

```text
TransactionType     = INCOME, EXPENSE, TRANSFER
AccountType         = CASH, BANK, SAVINGS, EWALLET, OTHER
Frequency           = DAILY, WEEKLY, MONTHLY, YEARLY
BudgetFrequency     = MONTHLY, YEARLY
GoalStatus          = IN_PROGRESS, COMPLETED
GoalActivityType    = CONTRIBUTION, WITHDRAWAL
NotificationType    = RECURRING_DUE, BUDGET_LIMIT, GOAL_DEADLINE
```

## Schema shape

- **10 application tables** (`User, Category, Transaction, Budget, Account, RecurringTransaction, RecurringBudget, Goal, GoalActivity, Notification`) + Prisma's `_prisma_migrations`.
- **7 enums** and **24 foreign keys** (every `userId`/`categoryId`/`accountId`/`goalId`/`transactionId`/`recurringTransactionId`/`recurringBudgetId` reference is enforced).
- Monetary columns are `Decimal(18, 4)` and serialize as strings in JSON.
- `Account` uses soft delete (`deletedAt`) when it is still referenced; unreferenced accounts are hard-deleted.
- `GoalActivity` rows cascade-delete with their `Goal`.

## Migrations

Baseline and follow-up migrations under `Backend/prisma/migrations/`:

```text
20260905073013_init_postgres
20260907110000_add_account_is_default
20260907130000_category_global_system
20260908120000_add_recurring_links_and_decimal_scale
20260908140000_add_goal_activity
20260908150000_add_transaction_goal_link
20260909031533_add_transfer
20260911120000_add_transfer_source_goal
20260912000000_add_account_deleted_at
20260913000000_account_name_unique_active_only
```

The baseline `20260905073013_init_postgres` is applied to production `public` (and, via `prisma migrate deploy`, to the isolated test schemas). SQLite migration history is preserved under `Backend/prisma/migrations_sqlite_backup/` for audit/history only.

## Legacy account adoption

The legacy User #1 was safely adopted to a real Supabase Auth identity by updating **only** `User #1.authUserId` to the verified Auth UUID (keeping `id = 1`, `email`, and `name` unchanged). No primary keys, ownership, or financial record values were changed.

## Config notes

- The schema datasource block has **no `url` field**; the URL comes from `DATABASE_URL` (see `prisma.config.ts`).
- `prisma.config.ts` holds the datasource url, migration path, and seed command.
- Runtime driver adapter is `@prisma/adapter-pg`. `src/lib/prisma.js` instantiates `new PrismaPg(DATABASE_URL, { schema })` when the URL has a `?schema=` param (test schemas), otherwise without it (production `public`).
- `.env` is not auto-loaded: dev scripts use `--env-file=.env`, and `src/lib/prisma.js` calls `dotenv.config()`.
- Seeding is explicit only (`npx prisma db seed`, idempotent): it reports the legacy-user status. Default categories are global `isSystem` rows available to every user; provisioning a new user creates the default Cash account only.
