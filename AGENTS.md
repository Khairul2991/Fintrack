# AGENTS.md

Two independent Node projects in one repo — **not** a monorepo/workspace. Each has its own `package.json` with separate dependencies. Run all npm commands inside the specific folder.

## Layout
- `Frontend/` — React 19 + Vite 8 (JavaScript/JSX). ESM (`"type": "module"`): use `import`.
- `Backend/` — Express 5 (CommonJS, `"type": "commonjs"`): use `require`/`module.exports`.

## Commands
Frontend (`Frontend/`):
- `npm run dev` — Vite dev server (default http://localhost:5173)
- `npm run lint` — **oxlint**, not ESLint (no `eslint` config; config in `.oxlintrc.json`)
- `npm run build`

Backend (`Backend/`):
- `npm run dev` — `node --env-file=.env --watch server.js` (auto-restart; requires Node 18.11+)
- `npm start` — `node --env-file=.env server.js`
- `npm run prisma:generate` / `prisma:migrate` / `prisma:seed`

Tests are real and use the Node.js built-in runner (no test dependencies):
- Backend `npm test` — 92 tests against the isolated `fintrack_test` schema.
- Frontend `npm test` — 54 tests against the isolated `fintrack_test_fe` schema.

## Development Server and Runtime Verification Rules
- Development servers are long-running processes and MUST NOT be treated as commands that are expected to exit.
- NEVER wait for npm run dev to terminate.
- NEVER wait indefinitely for a development server command to return control.
- After starting a development server, immediately monitor its output or perform an HTTP health check.
- Treat successful server-ready output as successful startup.

# Backend
- For the backend, treat:
  Server running on http://localhost:3000
  as successful startup.
- If node --watch server.js remains running or displays:
  Waiting for file changes before restarting...
  this is NORMAL and MUST NOT be interpreted as a hang.
- Once the backend reports that it is running, immediately continue API verification without waiting for the process to exit.

# Frontend / Vite
- For the frontend, treat Vite output such as:
  Local: http://localhost:5173/
  as successful startup.
- A successful HTTP response from the frontend is also sufficient confirmation that Vite is running.
- For example:
  curl.exe -s -o NUL -w "HTTP: %{http_code}\n" http://localhost:5173/
- If the HTTP response is 200, immediately continue verification.
- NEVER wait for the Vite npm run dev process to exit.
- NEVER start a second Vite instance when port 5173 is already serving the application.

# Windows Runtime Verification
- Use curl.exe for HTTP verification on Windows.
- DO NOT use PowerShell 5.1 Invoke-WebRequest for runtime verification because it may fail in non-interactive execution          environments.
- Prefer HTTP health checks and log inspection over waiting for development-server processes to terminate.


# Verification Workflow

When a development server is required:

1. Start the server.
2. Wait briefly for startup.
3. Check the server output OR perform an HTTP request.
4. Once the server is confirmed running, immediately continue the verification workflow.
5. NEVER wait for the server process to exit.
6. After verification is complete, explicitly terminate the development server.
7. Verify that ports 3000 and 5173 do not have unnecessary Fintrack listeners or processes remaining.

A development server remaining alive is NOT evidence of a hung command.

The agent MUST distinguish between:

- a server that is successfully running and intentionally waiting for requests/file changes, and
- a server that failed to start because of an actual error.

Only the second case requires startup troubleshooting.


## Gotchas
- Vite dev server proxies `/api` to `http://localhost:3000` via `server.proxy` in `vite.config.js`. Frontend on 5173 calls backend on 3000 through the proxy (no CORS needed).
- Backend uses Express **5** (`^5.2.1`) — API differs from v4 (e.g. async error handling, `path-to-regexp` v8 route syntax).
- Backend entrypoint is `server.js` (`"main"`, `start`, and `dev` scripts all point there).
- **Prisma 7** (pinned `7.10.0` for both `prisma` and `@prisma/client`; `latest` for `prisma` is an 8.0 RC — do NOT let them mismatch).
  - Uses `prisma-client` generator (NOT deprecated `prisma-client-js`): `output = "../src/generated/prisma"`, ESM output (`.mts`).
  - Generated client must be consumed from the CommonJS backend via dynamic `import()` (see `src/lib/prisma.js`). Plain `require` fails — the `.cts`/`.js` outputs are not directly require-able under Node's CJS loader.
  - PostgreSQL driver adapter: `@prisma/adapter-pg`. `PrismaClient` is instantiated with `new PrismaPg(process.env.DATABASE_URL, { schema })` when the URL carries a `?schema=` param (test schemas), otherwise without it (production `public`).
  - Config lives in `prisma.config.ts` (datasource url, migration path, seed command) — the schema datasource block has no `url` field.
  - `.env` is NOT auto-loaded at runtime; scripts use `--env-file=.env`, and `src/lib/prisma.js` calls `dotenv.config()`.
  - Seeding is explicit only: `npx prisma db seed`. Seed is idempotent (legacy-user status check; new users get default categories on provisioning).
  - Production `DATABASE_URL` is the Supabase PostgreSQL connection string. Backend tests append `?schema=fintrack_test`; frontend tests append `?schema=fintrack_test_fe`. SQLite (`Backend/database/dev.db`) is retained only as a legacy migration source and is never opened at runtime.
- Auth: Supabase Auth (email/password). Backend verifies `Authorization: Bearer <access token>` via `supabase.auth.getUser()` (`src/lib/supabase.js`) and maps the Auth UUID → local `User.authUserId` (`requireAuth`). Ownership is always derived from `req.user.id`; client-supplied `userId` is ignored.
- This is a git repo (no CI, no root-level npm config).


# FinTrack Agent Instructions

## 1. Project Requirements

The primary product requirements are defined in:

PRD.md

Before implementing any feature, read PRD.md and understand
the relevant requirements.

PRD.md is the source of truth for product requirements.

Do not invent features that are not defined in PRD.md unless
the user explicitly requests them.

## 2. Development Rules

- Use React with JavaScript.
- Use Vite.
- Use Express.js.
- Use Prisma ORM.
- Use Supabase PostgreSQL as the production database (SQLite is retained only as the legacy migration source).
- Use Tailwind CSS.
- Use DaisyUI.
- Use Recharts.
- Keep frontend and backend separated.
- Follow the architecture defined in PRD.md.

## 3. Workflow

Before modifying code:

1. Read AGENTS.md.
2. Read PRD.md.
3. Inspect the existing codebase.
4. Determine the current implementation status.
5. Implement only the requested feature.
6. Run relevant tests or builds.
7. Fix errors.
8. Verify the implementation.
9. Summarize the changes.

## 4. Scope

Do not add:

- Authentication
- OAuth
- JWT
- Bank integration
- Payment gateway
- AI features
- Cryptocurrency
- Investment tracking
- Microservices
- Redis
- WebSockets

unless explicitly requested by the user.

## 5. Quality

- Prefer simple and maintainable code.
- Avoid unnecessary dependencies.
- Avoid overengineering.
- Do not create giant components.
- Keep business logic out of React UI components when appropriate.
- Keep API logic separate from UI.
- Validate data on both frontend and backend.
- Do not leave broken code behind.


## 6. Behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 6.1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 6.2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 6.3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 6.4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
