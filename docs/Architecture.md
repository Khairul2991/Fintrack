# Architecture

## Overview

FinTrack follows a clean three-tier architecture with Supabase Auth on top:

```text
React Frontend (Vite, port 5173)
        │  /api/*  (proxied by Vite dev server)  +  supabase-js for Auth
        ▼
Supabase Auth (email/password + Google OAuth)
        │  session / access token
        ▼
Express REST API (port 3000) — Authorization: Bearer <Supabase access token>
        │  Prisma ORM
        ▼
Supabase PostgreSQL (production)
```

### Authentication boundary

```text
Browser ── supabase-js ──▶ Supabase Auth (email/password + Google OAuth sign up / sign in / sign out)
        ◀── Supabase session (access token) ──
Browser ── Authorization: Bearer <access token> ──▶ Express /api/*
        ──▶ supabase.auth.getUser(token)  (server-side verification)
        ──▶ Supabase Auth UUID ──▶ local User.authUserId
        ──▶ all financial queries scoped to req.user.id
```

- **Implemented:** Supabase Auth email/password sign-up, sign-in, session restore, and sign-out.
- **Implemented:** Google OAuth sign-in (`supabase.auth.signInWithOAuth`), plus an OAuth popup re-authentication flow guard for destructive actions (`Frontend/src/utils/googleReauth.js`).
- **Configured:** Supabase project URL/key pairs on both ends (anon publishable key in the frontend; secret/service-role key in `Backend/.env` only). Google OAuth requires the provider to be enabled in the Supabase Dashboard.

The frontend never talks to financial application tables directly — all financial data access is `React → Express → Prisma → PostgreSQL`.

- The frontend never talks to the database directly; it calls the REST API.
- In development, Vite proxies `/api` requests to `http://localhost:3000` (configured in `Frontend/vite.config.js`), so the browser only ever talks to `localhost:5173` and no CORS configuration is needed.
- The backend exposes a JSON REST API at `/api` (see [API Reference](API.md)).

## Frontend (`Frontend/`)

ESM JavaScript (JSX), Vite 8, React 19, React Router 7, Tailwind CSS 4, DaisyUI 5, Recharts 3.

```text
src/
├── components/    # landing/, common/, dashboard/, transactions/, categories/,
│                  # budgets/, reports/, accounts/, calendar/, goals/, recurring/,
│                  # analytics/, layout/
├── pages/         # One component per route (LandingPage, DashboardPage, ...)
├── layouts/       # AppLayout, Sidebar, MobileNavigation
├── hooks/         # useTheme, useLanguage
├── services/      # Centralized API layer (api.js + per-resource modules)
├── utils/         # format, export, date/calendar, googleReauth helpers
├── constants/     # navigation
├── context/       # AuthContext, LanguageContext, ToastContext
├── l10n/          # EN/ID message catalog + category/insight localization
├── App.jsx        # Route definitions
└── main.jsx       # Entry point (theme + language init before render)
```

### Landing page (`/`)

The public marketing page (`src/pages/LandingPage.jsx`) is built from `src/components/landing/` and uses a deliberate CSS layering system rather than a flat stack:

- **Single global orb layer** — `FloatingOrbs.jsx` renders one `aria-hidden`, `pointer-events-none` decorative layer (`z-20`) for the whole page (`LANDING_ORBS`, ~17 animated CSS orbs). There is no per-section or navbar orb instance.
- **Content plane** — `<main>` + footer live inside `.content-plane` (`z-30`, a stacking context). A scroll-driven CSS animation (`animation-timeline: scroll(root)`, `landing-band-exclusion`) clips the plane so its pixels never enter the fixed 64px navbar band, keeping section content out of the navbar without JS scroll listeners.
- **Surface plane** — `SectionSurfaces.jsx` measures the opaque-white sections (`#features`, `#budgets-goals`, `#contact`, `footer`) and renders matching `bg-base-100` strips on `.surface-plane` (`z-5`, `pointer-events-none`), below the orbs (`.content-plane` carries the same exclusion animation). The resulting order inside a white section is **content > orb > opaque surface > page background**, so orbs stay visible over opaque white surfaces while cards/text stay above the orbs. The fixed navbar band uses its own `bg-base-200` surface at `z-10`.
- **Reveal / motion** — `Reveal.jsx` adds scroll-triggered reveal classes via `IntersectionObserver`; all landing animations are disabled under `prefers-reduced-motion`.
- The navbar (`LandingNavbar.jsx`) provides in-page anchors, theme and language toggles, and auth-aware CTAs (`/dashboard` when signed in, `/login` + `/register` otherwise).

Changing this stacking requires re-verifying the composited pixels (the layering is intentional and easy to break).

### Key principles

- **Centralized API layer**: components never use raw `fetch()`. All JSON HTTP is isolated in `src/services/api.js`, with per-resource modules (`transactionApi.js`, `categoryApi.js`, `budgetApi.js`, `dashboardApi.js`, `reportsApi.js`, `accountApi.js`, `goalApi.js`, `recurringTransactionApi.js`, `recurringBudgetApi.js`, `notificationApi.js`, `analyticsApi.js`, `exportApi.js`, `aiInsightsApi.js`, `userApi.js`). Non-2xx responses are mapped to `ApiError` (message + status); network failures map to `ApiError` with status `0`. The one deliberate exception is the binary PDF download (`exportApi.js` fetches `/api/reports/pdf` directly).
- **Single-responsibility components**: pages compose small components (forms, tables, cards, charts, dialogs). No monolithic components.
- **Loading / empty / error states**: every data-loading page shows a skeleton while loading, an empty state when there is no data, and an error state with a retry button.
- **Business logic stays on the backend**: React UI components render data and dispatch actions; all validation and financial calculation lives in the backend services.

## Backend (`Backend/`)

CommonJS, Express 5, Prisma 7, Supabase PostgreSQL.

```text
server.js              # Process entry point (Backend/server.js, outside src/) — loads app and listens
src/
├── app.js             # Express app assembly (middleware + route mounts + error handler)
├── routes/            # Endpoint definitions per resource (+ health, auth)
├── controllers/       # HTTP request/response handling
├── services/          # Business logic and data access through Prisma
├── middleware/        # requireAuth / requireSupabaseUser, cors, notFound, errorHandler
├── lib/               # prisma.js (Prisma client), supabase.js (Auth verification)
└── utils/             # validation, date helpers, apiResponse, AppError, default categories, AI config
```

### Layering

- **routes** declare endpoints and delegate to controllers.
- **controllers** parse request input and produce responses (`success`, `successList`, `error`).
- **services** contain the business rules (validation, pagination meta, filters, budget progress/status, dashboard/report/analytics aggregation, recurring catch-up, transfers, goal activities, AI insights). `server.js` contains no business logic.
- **middleware/errorHandler.js** maps `AppError`, malformed JSON, and Prisma errors (`P2002`, `P2003`, `P2025`) to consistent JSON responses.

Server files on port `3000` by default (override with `PORT`).

## Key technical decisions

- **Express 5**: async errors are forwarded to the error middleware automatically.
- **Prisma 7** (pinned `7.10.0`): uses the `prisma-client` generator producing ESM output (`src/generated/prisma`, `*.mts`). Because the backend is CommonJS, the generated client is loaded via dynamic `import()` (see `src/lib/prisma.js`). The runtime driver adapter is `@prisma/adapter-pg`; when `DATABASE_URL` carries a `?schema=` query param (isolated test schemas) the client targets that schema, otherwise it uses `public`. Datasource URL and migration/seed configuration live in `prisma.config.ts`; `.env` is not auto-loaded at runtime — scripts use `--env-file=.env` and `src/lib/prisma.js` calls `dotenv.config()`.
- **Authentication is delegated to Supabase Auth** (email/password + Google OAuth). The backend never signs JWTs and stores no passwords or refresh tokens; it verifies the `Authorization: Bearer` access token with `supabase.auth.getUser()` (`src/lib/supabase.js`) and maps the Supabase Auth UUID to the local `User.authUserId`.
- **Authorization stays in Express**: `requireAuth` resolves the authenticated identity to a local `User`, and every controller/scoped query derives ownership from `req.user.id`. Client-supplied `userId` is always ignored.
- **Monetary amounts are `Decimal`** (PostgreSQL `DECIMAL`), serialized in JSON as strings (e.g. `"25000"`).
- **Global system categories** are single `isSystem` rows (`userId` null) shared by every user rather than copied per user; user-created categories belong to a `userId`. Category list queries return `OR: [isSystem, userId]`.
- **Account soft delete**: `DELETE /api/accounts/:id` archives (`deletedAt`) an account that is still referenced and hard-deletes an unreferenced one; archived accounts are excluded from lists and blocked from edits.
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