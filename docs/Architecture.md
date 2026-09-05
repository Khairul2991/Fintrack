# Architecture

## Overview

FinTrack follows a clean three-tier architecture with Supabase Auth on top:

```text
React Frontend (Vite, port 5173)
        │  /api/*  (proxied by Vite dev server)  +  supabase-js for Auth
        ▼
Supabase Auth (email/password)
        │  session / access token
        ▼
Express REST API (port 3000) — Authorization: Bearer <Supabase access token>
        │  Prisma ORM
        ▼
Supabase PostgreSQL (production)
```

### Authentication boundary

```text
Browser ── supabase-js ──▶ Supabase Auth (email/password sign up / sign in / sign out)
        ◀── Supabase session (access token) ──
Browser ── Authorization: Bearer <access token> ──▶ Express /api/*
        ──▶ supabase.auth.getUser(token)  (server-side verification)
        ──▶ Supabase Auth UUID ──▶ local User.authUserId
        ──▶ all financial queries scoped to req.user.id
```

- **Implemented:** Supabase Auth email/password sign-up, sign-in, session restore, and sign-out.
- **Configured:** Supabase project URL/key pairs on both ends (anon publishable key in the frontend; secret/service-role key in `Backend/.env` only).
- **Planned (NOT implemented):** Google OAuth. Documentation does not claim it is supported.

The frontend never talks to financial application tables directly — all financial data access is `React → Express → Prisma → PostgreSQL`.

- The frontend never talks to the database directly; it calls the REST API.
- In development, Vite proxies `/api` requests to `http://localhost:3000` (configured in `Frontend/vite.config.js`), so the browser only ever talks to `localhost:5173` and no CORS configuration is needed.
- The backend exposes a JSON REST API at `/api` (see [API Reference](API.md)).

## Frontend (`Frontend/`)

ESM JavaScript (JSX), Vite 8, React 19, React Router 7, Tailwind CSS 4, DaisyUI 5, Recharts 3.

```text
src/
├── components/    # Reusable UI components (common/, dashboard/, transactions/, categories/, budgets/, reports/)
├── pages/         # One folder/component per route (Dashboard, Transactions, Categories, Reports, Budgets, Settings, NotFound)
├── layouts/       # AppLayout, Sidebar, MobileNavigation
├── hooks/         # useTheme, etc.
├── services/      # Centralized API layer (api.js + per-resource modules)
├── utils/         # format.js (currency & date formatting)
├── constants/     # navigation, etc.
├── context/       # ToastContext (global toast notifications)
├── App.jsx        # Route definitions
└── main.jsx       # Entry point (theme init before render)
```

### Key principles

- **Centralized API layer**: components never use raw `fetch()`. All HTTP is isolated in `src/services/api.js`, with per-resource modules (`transactionApi.js`, `categoryApi.js`, `budgetApi.js`, `dashboardApi.js`, `reportsApi.js`). Non-2xx responses are mapped to `ApiError` (message + status); network failures map to `ApiError` with status `0`.
- **Single-responsibility components**: pages compose small components (forms, tables, cards, charts, dialogs). No monolithic components.
- **Loading / empty / error states**: every data-loading page shows a skeleton while loading, an empty state when there is no data, and an error state with a retry button.
- **Business logic stays on the backend**: React UI components render data and dispatch actions; all validation and financial calculation lives in the backend services.

## Backend (`Backend/`)

CommonJS, Express 5, Prisma 7, Supabase PostgreSQL.

```text
src/
├── app.js           # Express app assembly (middleware + routes + error handler)
├── server.js        # Process entry point (listen)
├── routes/          # Endpoint definitions per resource (+ health, auth)
├── controllers/     # HTTP request/response handling
├── services/        # Business logic and data access through Prisma
├── middleware/      # notFound, errorHandler, requireAuth, requireSupabaseUser
├── lib/             # prisma.js (Prisma client), supabase.js (Auth verification)
└── utils/           # validation, date helpers, apiResponse, AppError
```

### Layering

- **routes** declare endpoints and delegate to controllers.
- **controllers** parse request input and produce responses (`success`, `successList`, `error`).
- **services** contain the business rules (validation, pagination meta, filters, budget progress/status, dashboard and report aggregation). `server.js` contains no business logic.
- **middleware/errorHandler.js** maps `AppError`, malformed JSON, and Prisma errors (`P2002`, `P2003`, `P2025`) to consistent JSON responses.

Server files on port `3000` by default (override with `PORT`).

## Key technical decisions

- **Express 5**: async errors are forwarded to the error middleware automatically.
- **Prisma 7** (pinned `7.10.0`): uses the `prisma-client` generator producing ESM output (`src/generated/prisma`, `*.mts`). Because the backend is CommonJS, the generated client is loaded via dynamic `import()` (see `src/lib/prisma.js`). The runtime driver adapter is `@prisma/adapter-pg`; when `DATABASE_URL` carries a `?schema=` query param (isolated test schemas) the client targets that schema, otherwise it uses `public`. Datasource URL and migration/seed configuration live in `prisma.config.ts`; `.env` is not auto-loaded at runtime — scripts use `--env-file=.env` and `src/lib/prisma.js` calls `dotenv.config()`.
- **Authentication is delegated to Supabase Auth** (email/password). The backend never signs JWTs and stores no passwords or refresh tokens; it verifies the `Authorization: Bearer` access token with `supabase.auth.getUser()` (`src/lib/supabase.js`) and maps the Supabase Auth UUID to the local `User.authUserId`.
- **Authorization stays in Express**: `requireAuth` resolves the authenticated identity to a local `User`, and every controller/scoped query derives ownership from `req.user.id`. Client-supplied `userId` is always ignored.
- **Monetary amounts are `Decimal`** (PostgreSQL `DECIMAL`), serialized in JSON as strings (e.g. `"25000"`).
- **SQLite** (`Backend/database/dev.db`) is retained only as the legacy migration/dev source and is never opened at runtime. No financial data is stored in `localStorage` — the browser only persists UI preferences and the Supabase session itself.
- **Dates**: all date math uses UTC (`src/utils/date.js`); the UI formats dates consistently via `src/utils/format.js`.

### Data flow example

```text
TransactionsPage ──▶ transactionApi.createTransaction(payload)
                    ──▶ services/api.js  POST /api/transactions
                    ──▶ routes/transactions.js
                    ──▶ controllers/transactionController.js
                    ──▶ services/transactionService.js (validate → prisma.transaction.create)
                    ──▶ middleware/errorHandler.js (on error)
                    ──▶ JSON response { success, data } ──▶ page toast + list refresh
```