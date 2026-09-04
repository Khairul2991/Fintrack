# FinTrack

FinTrack is a responsive personal finance management web application built with React, Node.js, Express, Prisma, and SQLite. It enables users to manage income and expenses, organize transactions by category, create monthly budgets, visualize financial data, and analyze spending patterns through an interactive dashboard and reports.

## Features

- **Dashboard** — total balance, income, expense, recent transactions, income-vs-expense chart, expense-by-category chart, and simple rule-based spending insights.
- **Transactions** — CRUD with search, type/category/date filters, sorting by date or amount, and pagination.
- **Categories** — CRUD with pre-seeded defaults and protection against deleting categories still in use.
- **Budgets** — monthly per-category budgets with live spent/remaining/progress and On Track / Near Limit / Over Budget status.
- **Reports** — 12-month income & expense comparison, expense-by-category ranking, and highest spending category.
- **Accounts / Wallets** — multiple accounts (Cash, Bank, Savings, E-Wallet, Other) with initial balance and live enriched balance from transactions.
- **Recurring Transactions** — schedule daily/weekly/monthly/yearly recurring transactions with catch-up generation of due occurrences, pause/resume, and an end date.
- **Recurring Budgets** — a recurring budget that rolls into a concrete monthly budget each period without duplicating existing budgets.
- **Financial Goals** — savings goals with target amount/date, progress tracking, manual progress updates, and automatic COMPLETED status on reaching the target.
- **Advanced Analytics** — cash flow, savings rate, monthly income/expense trend, budget utilization, highest spending category, spending concentration, and largest transaction.
- **AI Financial Insights** — per-month AI-assisted analysis (summary, priorities, and recommendations) built from deterministic on-device metrics, with an automatic rule-based fallback when no AI provider is configured or the request fails. Fully EN/ID localized; sees only compact sanitized metrics, never raw transactions.
- **Export** — download transactions as CSV or Excel (client-side) and a PDF financial report (server-side), localized per language.
- **Notifications** — in-app notification center (recurring due, budget limit, goal deadline) with optional browser/desktop notifications after a user click.
- **Settings** — theme switcher (System / Light / Dark) and currency info (amounts are stored in IDR).
- **English / Indonesian localization** — full EN/ID UI via a centralized message catalog; numbers formatted as `1.000` in the UI while the API always uses raw numeric values (e.g. `1000`).
- **Polish** — dark mode, toast notifications, loading skeletons, empty states, error states with retry, responsive layout, and accessibility labels.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, JavaScript (JSX), Vite 8, React Router 7, Tailwind CSS 4, DaisyUI 5, Recharts 3 |
| Backend | Node.js, Express 5, Prisma ORM 7, SQLite |
| Testing | Node.js built-in test runner (`node --test`) |

## Repository Structure

This repository contains **two independent Node projects** — it is **not** an npm workspace or monorepo. Each folder has its own `package.json` and dependency tree. Run all npm commands inside the specific folder.

```text
Fintrack/
├── Backend/
│   ├── src/            # Express app: routes, controllers, services, middleware, utils
│   ├── prisma/         # schema.prisma, migrations, seed
│   ├── tests/          # API + business logic test suites (node:test)
│   ├── database/       # SQLite databases (gitignored)
│   ├── .env.example    # environment template
│   └── package.json
├── Frontend/
│   ├── src/            # React app: components, pages, layouts, hooks, services, utils
│   ├── tests/          # UI-layer (service integration) test suite
│   └── package.json
├── docs/               # Architecture, database schema, and API documentation
├── AGENTS.md           # agent/developer conventions for this repo
├── PRD.md              # product requirements (source of truth for scope)
└── README.md
```

## Prerequisites

- **Node.js >= 18.11** (required for `--env-file`, dynamic `import()`, and `node --test`). Developed and verified on Node 24.
- **npm** (bundled with Node).

## Getting Started

### 1. Backend

```sh
cd Backend
npm install

# create the environment file
cp .env.example .env

# create the SQLite database and apply migrations
npm run prisma:migrate

# seed the default categories (idempotent)
npm run prisma:seed

# start the API server on http://localhost:3000
npm run dev
```

The backend runs on **http://localhost:3000**. In dev mode it uses `node --watch` for auto-restart.

### 2. Frontend

```sh
cd Frontend
npm install

# start the Vite dev server on http://localhost:5173
npm run dev
```

The frontend serves on **http://localhost:5173**. Vite proxies all `/api` requests to `http://localhost:3000` (see `vite.config.js`), so no CORS configuration is needed. Open **http://localhost:5173** in your browser.

> The frontend proxies `/api` to the backend at `localhost:3000`. Both servers must be running to use the application.

### 3. AI Financial Insights (optional)

The AI Insights page works **out of the box** with an automatic rule-based fallback — no configuration is required. To enable AI-assisted summaries, add these variables to `Backend/.env`:

```sh
# Any OpenAI-compatible chat completions endpoint.
# e.g. "https://api.openai.com/v1" or "https://your-proxy/v1"
AI_PROVIDER=https://api.openai.com/v1
AI_API_KEY=your-key-here
AI_MODEL=gpt-4o-mini
```

Behavior and privacy:

- **Deterministic metrics first** — income, expense, net cash flow, savings rate, category breakdown, budgets, goals, and transaction counts are always computed on-device from the local database. The AI may only *summarize, explain, prioritize, or recommend*; it can never alter those displayed numbers.
- **Sanitized context only** — a compact digest (aggregate amounts, category/budget/goal names, percentages) is sent to the provider. Raw transactions are never sent and nothing is logged or stored permanently.
- **Safe fallback** — when `AI_PROVIDER` is unset, the request fails, or the provider returns invalid JSON, the endpoint falls back to deterministic rule-based insights with a `source` of `"rule"`.
- The requested UI language is passed along (`lang=id` → Indonesian) for provider responses and fallback text.

No keys are committed; keep `AI_API_KEY` in local `.env` only.

## Project Scripts

| Command | Folder | Description |
| --- | --- | --- |
| `npm run dev` | Frontend | Start Vite dev server (port 5173) |
| `npm run dev` | Backend | Start Express API with `--watch` (port 3000) |
| `npm start` | Backend | Start Express API without watch |
| `npm run lint` | Frontend | Run oxlint |
| `npm run build` | Frontend | Production build of the React app |
| `npm test` | Backend | Run the 92 backend API + business logic tests |
| `npm test` | Frontend | Run the 54 frontend UI-layer tests |
| `npm run prisma:generate` | Backend | Generate the Prisma client |
| `npm run prisma:migrate` | Backend | Apply schema migrations |
| `npm run prisma:seed` | Backend | Seed idempotent default categories |

## Testing

Both test suites use the Node.js built-in test runner — **no test dependencies are required**.

- **Backend** (`Backend/tests/`): runs the real Express app in-process against an isolated SQLite database (`Backend/database/test.db`) to avoid touching development data.
- **Frontend** (`Frontend/tests/`): imports the real service modules and talks to a spawned backend instance (port 3101, isolated `test-fe.db` database).

```sh
cd Backend && npm test   # 92 tests
cd Frontend && npm test  # 54 tests
```

Before running the frontend suite, create its test database schema:

```sh
cd Backend
$env:DATABASE_URL="file:./database/test-fe.db"; npx prisma migrate deploy; $env:DATABASE_URL="file:./database/test.db"; npx prisma migrate deploy
```

## Documentation

- [Architecture](docs/Architecture.md)
- [Database Schema](docs/Database.md)
- [API Reference](docs/API.md)

## Screenshots

> Screenshots to be added. Start the application (`npm run dev` in both folders), open http://localhost:5173, and capture the dashboard, transactions, categories, budgets, reports, and settings pages.

## Implemented: Post-MVP features

The earlier future-improvements roadmap is now largely implemented:

1. ✅ Recurring transactions
2. ✅ Multiple accounts/wallets
3. ✅ CSV/Excel export and PDF financial reports
4. ✅ Advanced analytics
5. ✅ Financial goals
6. ✅ Recurring budgets
7. ✅ Notifications (in-app + optional browser)
8. ✅ EN/ID localization and UI/UX polish
9. ✅ AI financial insights (deterministic metrics + optional AI interpretation with rule-based fallback)

These remain **out of scope** in this build (deferred — see `PRD.md` §47):

1. Authentication & multi-user
2. PostgreSQL and cloud deployment
3. Bank integration / automatic transaction import
4. PWA / offline support

All data stays in a local SQLite database (Prisma + SQLite are retained; no destructive migration), and the full suite remains green: backend **92/92**, frontend **54/54**, lint + build clean.

## Portfolio

Built to demonstrate full-stack development: React component architecture, modern JavaScript, React Router, Express REST API, Prisma ORM, SQLite relational database, CRUD operations, data aggregation, form validation, error handling, search/filter/sort/pagination, data visualization, and responsive UI.