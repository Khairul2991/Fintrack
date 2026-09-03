# Database Schema

SQLite database via Prisma 7. Schema definition: `Backend/prisma/schema.prisma`.

## ER diagram

```text
┌────────────┐        ┌─────────────────┐        ┌───────────┐
│  Category  │ 1 ──── n │  Transaction     │ n ──── 1 │  Budget   │
│            │        │                  │        └───────────┘
└────────────┘        └─────────────────┘
```

- A `Category` has many `Transaction`s and many `Budget`s.
- Every `Transaction` and `Budget` belongs to exactly one `Category`.
- `Budget` is unique per `(categoryId, month, year)`.

## Models

### Category

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK, autoincrement |
| `name` | String | **Unique** |
| `icon` | String | Emoji rendered by the UI |
| `color` | String | Hex color for charts |
| `createdAt` | DateTime | Defaults to `now()` |

### Transaction

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK, autoincrement |
| `description` | String | Required, user-facing label |
| `amount` | Decimal | Always positive; direction determined by `type` |
| `type` | Enum `TransactionType` | `INCOME` or `EXPENSE` |
| `categoryId` | Integer | FK → `Category.id` (required) |
| `date` | DateTime | Transaction date |
| `note` | String? | Optional free-text note |
| `createdAt` | DateTime | Defaults to `now()` |

Indexes: `categoryId`, `date`, `type`.

### Budget

| Field | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK, autoincrement |
| `categoryId` | Integer | FK → `Category.id` |
| `month` | Integer | 1–12 |
| `year` | Integer | e.g. 2026 |
| `amount` | Decimal | Monthly budget limit |
| `createdAt` | DateTime | Defaults to `now()` |

Uniqueness constraint: `@@unique([categoryId, month, year])` — at most one budget per category per month. Index on `categoryId`.

## Enums

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}
```

## Seed data

The seed (`Backend/prisma/seed.js`) is **explicit and idempotent** (upsert by category name). It inserts the default categories:

| Name | Icon | Color |
| --- | --- | --- |
| Food | 🍔 | #F97316 |
| Transport | 🚗 | #3B82F6 |
| Shopping | 🛍️ | #EC4899 |
| Entertainment | 🎮 | #8B5CF6 |
| Bills | 📄 | #EF4444 |
| Health | 💊 | #10B981 |
| Education | 📚 | #06B6D4 |
| Salary | 💵 | #22C55E |
| Freelance | 💼 | #F59E0B |
| Other | 📦 | #6B7280 |

Run it explicitly when needed:

```sh
cd Backend
npm run prisma:seed
```

## Migrations

- `prisma/migrations/20260901084639_init`: initial schema (all tables above), applied to both the development database and the isolated test databases.

## Databases used in this repo

| Database | Path | Purpose |
| --- | --- | --- |
| Development | `Backend/database/dev.db` | Local dev; baseline is **0 transactions / 0 budgets / 10 categories** after seed |
| Backend tests | `Backend/database/test.db` | Created on demand via `prisma migrate deploy` with `DATABASE_URL="file:./database/test.db"` |
| Frontend tests | `Backend/database/test-fe.db` | Created on demand via `prisma migrate deploy` with `DATABASE_URL="file:./database/test-fe.db"` |

Databases live under `Backend/database/` (gitignored). The `DATABASE_URL` used by the app is `file:./database/dev.db`, resolved relative to the `Backend/` folder.

## Config notes

- The schema datasource block has **no `url` field**; the URL comes from `DATABASE_URL` in the environment and is wired through `prisma.config.ts`.
- `prisma.config.ts` holds the datasource url, migration path, and seed command.
- SQLite requires the better-sqlite3 driver adapter; the Prisma client is constructed with `new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })` in `src/lib/prisma.js`.
- `.env` is not auto-loaded: dev scripts use `--env-file=.env`, and `src/lib/prisma.js` calls `dotenv.config()`.