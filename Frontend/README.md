# FinTrack Frontend

React 19 + Vite 8 single-page app for FinTrack. See the [root README](../README.md) for the full project overview, and [docs/Architecture.md](../docs/Architecture.md) for how the frontend fits into the system.

## Stack

- React 19 (JavaScript/JSX), Vite 8
- React Router 7
- Tailwind CSS 4 + DaisyUI 5
- Recharts 3 (charts)
- `@supabase/supabase-js` (Supabase Auth session only)
- `exceljs` (client-side Excel export)
- oxlint for linting

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server (http://localhost:5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run oxlint (config in `.oxlintrc.json`) |
| `npm test` | Run the UI-layer/service test suite (Node built-in runner) |

## Environment

Create `Frontend/.env` (see `Frontend/.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL used by `supabase-js` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (public; browser client) |
| `VITE_API_URL` | Backend API base URL. Unset → `/api` (Vite dev proxy or same-origin) |

Only public values belong in `VITE_*` variables. Never put backend secrets here.

## Structure

```text
src/
├── components/   # landing/, common/, dashboard/, transactions/, categories/,
│                 # budgets/, reports/, accounts/, calendar/, goals/, recurring/,
│                 # analytics/, layout/
├── pages/        # One component per route (LandingPage, DashboardPage, ...)
├── layouts/      # AppLayout, Sidebar, MobileNavigation
├── hooks/        # useTheme, useLanguage
├── services/     # Centralized API layer (api.js + per-resource modules)
├── context/      # AuthContext, LanguageContext, ToastContext
├── l10n/         # EN/ID message catalog, category/insight localization
├── utils/        # format, export, date/calendar helpers
├── constants/    # navigation
├── App.jsx       # Route definitions
└── main.jsx      # Entry point (theme + language init before render)
```

## Conventions

- Components never call `fetch()` directly — all HTTP goes through `src/services/api.js` and per-resource modules. Non-2xx responses map to `ApiError`. The Supabase access token is attached via `setTokenProvider` (wired in `App.jsx`).
- Business logic and financial calculations live in the backend; the UI renders data and dispatches actions.
- Every data-loading page provides loading, empty, and error states.
- EN/ID localization is centralized in `src/l10n/messages.js`; keep both languages in sync.
- The marketing landing page (`/`) uses a layered CSS system (global `FloatingOrbs` + `.content-plane` / `.surface-plane`); see `docs/Architecture.md` before changing its stacking.

## Testing

`npm test` runs the service/UI-layer suite with the Node.js built-in test runner against an isolated `fintrack_test_fe` PostgreSQL schema (spawns the backend on port 3101). No test dependencies are required. `Backend/.env` must point `DATABASE_URL` at the shared PostgreSQL instance.
