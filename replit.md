# PayPal Clone

A full-stack PayPal clone web app built as a BTech minor project for educational purposes. Features JWT auth, send/request money flows, transaction history, payment method management, and a dashboard — styled to match PayPal's design language.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/paypal-clone run dev` — run the frontend (port 19111)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Demo Accounts

All demo accounts use password: the bcrypt hash of `password123` (use registration to create real accounts, or seed users via the register page)

- alice@example.com
- bob@example.com
- carol@example.com

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + JWT authentication (jsonwebtoken + bcrypt)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/db/src/schema/` — Drizzle schema files (users, transactions, moneyRequests, paymentMethods)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — JWT auth middleware
- `artifacts/paypal-clone/src/` — React frontend
- `lib/api-client-react/src/generated/` — Generated React Query hooks (don't edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas for server validation (don't edit)

## Architecture decisions

- JWT tokens stored in `localStorage` under key `paypal_token`; the custom fetch in `@workspace/api-client-react` reads it via `setAuthTokenGetter` set on app init
- Bank transfer payments use `pending` status to simulate eCheck clearing; instant transfers complete immediately and update balances
- The `balance` column uses `numeric(12,2)` for exact decimal arithmetic — always parse with `parseFloat()` when returning from DB (Drizzle returns strings for numeric)
- All routes are protected via `requireAuth` middleware that verifies the Bearer token and attaches the user to `req`
- Money requests track who will pay (`fromUserId`) and who receives (`toUserId`); approving creates a real transaction

## Product

- User signup and login with JWT
- Dashboard with balance, recent transactions, quick-action buttons
- Send money to any registered user by email (instant or bank transfer)
- Request money from any registered user
- Approve or decline incoming money requests
- Full transaction history with search and filters (All/Sent/Received/Pending)
- Transaction detail page with "Download Receipt" (browser print)
- Wallet page for managing bank accounts and cards (dummy, no real gateway)
- Mobile-responsive layout matching PayPal's visual design

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, always run codegen before typechecking: `pnpm --filter @workspace/api-spec run codegen`
- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before checking `api-server` (stale lib declarations cause false TS2305 errors)
- `bcrypt` needs native build approval: `pnpm approve-builds` in `artifacts/api-server`
- Drizzle returns `numeric` columns as strings — always `parseFloat()` before sending in API responses

## Legal

Footer on all pages: "This is a demo project for educational purposes only. Not affiliated with or endorsed by PayPal Holdings, Inc."

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
