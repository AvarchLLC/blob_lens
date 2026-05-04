# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo layout

```
blob_lens/
├── apps/
│   ├── api/          Rust indexer + REST API (Axum, SQLx, Alloy) — port 8080
│   └── web/          Next.js 16 dashboard (React 19, Tailwind v4, shadcn/ui, Recharts)
├── docker-compose.yml  starts postgres + api + frontend together
├── vercel.json         Vercel build config for apps/web (DATABASE_URL must be set in Vercel env)
├── package.json        pnpm workspace root
└── pnpm-workspace.yaml
```

## Commands

### Frontend (apps/web)
```bash
cd apps/web
cp .env.local.example .env.local    # set DATABASE_URL

pnpm install                        # install deps
pnpm dev                            # Next.js dev server (http://localhost:3000)
pnpm build                          # production build
pnpm lint
```

Run shadcn CLI to get full component implementations (replaces the stubs in src/components/ui/):
```bash
cd apps/web
npx shadcn@latest add card badge table select tooltip skeleton separator button tabs
```

### Backend (apps/api)
```bash
cd apps/api
cargo build --release
cargo run                  # requires .env at repo root
cargo clippy
```

### Full stack (Docker)
```bash
cp .env.example .env       # add ALCHEMY_KEY
docker-compose up --build  # postgres:5432 + api:8080 + frontend:3000
docker-compose exec postgres psql -U postgres -d blob_lens
```

## Environment variables

Root `.env` (Rust indexer + Docker):
- `ALCHEMY_KEY` — required for the Rust WebSocket listener
- `DATABASE_URL` — `postgresql://postgres:password@localhost:5432/blob_lens` (use `postgres` as host inside Docker)
- `RUST_LOG` — log level (default `info`)

`apps/web/.env.local` (Next.js dev):
- `DATABASE_URL` — same Postgres, `localhost:5432` for local, `postgres:5432` in Docker
- `NEXT_PUBLIC_APP_URL` — public URL for metadata
- `NEXT_PUBLIC_MARKET_REFRESH_MS` — SWR refresh for /market (default `12000`)
- `NEXT_PUBLIC_LEADERBOARD_REFRESH_MS` — SWR refresh for leaderboard (default `30000`)

## Architecture

### apps/api — Rust service

Two concurrent Tokio tasks:
1. **Blob indexer** (`src/services/blob_parser.rs`) — Alchemy WebSocket → new blocks → filter Type 3 txs → resolve rollup → insert Postgres.
2. **HTTP API** (`src/api.rs`) — Axum on `:8080` with 5 REST endpoints. These are **not** used by the Next.js frontend (frontend queries Postgres directly).

Schema created inline in `db::init_pool`. `max_fee_per_blob_gas` is stored as `VARCHAR` — cast with `CAST(... AS BIGINT)` in queries.

Rollup attribution (`src/rollup_registry.rs`) checks `from`/`to` address against ~20 hardcoded sequencer addresses.

### apps/web — Next.js 16

**Data flow:** Postgres ← postgres.js (server) ← Next.js route handlers ← SWR client

- **Direct DB access** via `postgres.js` in server components and route handlers — no Rust API dependency.
- All SQL lives in `src/lib/queries.ts`. `src/lib/db.ts` holds the singleton connection pool.
- **App Router**, Server Components by default, `export const revalidate = N` for ISR.
- `params` and `searchParams` are **Promises** in Next.js 16 — always `await params`.
- Chart components in `src/components/charts/` are `"use client"` (Recharts needs browser).
- `/market` page uses SWR (`MarketLiveWrapper.tsx`) for 12s live refresh.
- `src/components/ui/` contains stub implementations of shadcn components — run `npx shadcn@latest add` to replace with full Radix UI versions.

**Pages:**
| Route | Revalidate | Description |
|---|---|---|
| `/` | 60s | Overview: stats, regime, rollup chart, live blob feed (SWR) |
| `/leaderboard` | 30s | Sortable rollup leaderboard with sparklines + CSV export |
| `/market` | 30s + SWR 12s | Regime badge, fee/block charts, live wrapper |
| `/rollup/[id]` | 30s | Per-rollup: stats, tabbed activity/transactions/fees |

**API routes** (all `force-dynamic`):
- `GET /api/health` — DB liveness
- `GET /api/blobs` — latest 20 transactions
- `GET /api/leaderboard?hours=N` — rollup aggregates
- `GET /api/market?hours=N` — hourly activity
- `GET /api/rollup/[id]` — per-rollup transactions

## Deployment

- **Frontend (Vercel):** Set `DATABASE_URL` as an environment variable in Vercel project settings. `vercel.json` handles the build. The DB must be reachable from Vercel's serverless runtime (use Neon, Supabase, or a VPS with exposed Postgres).
- **Backend + DB:** `docker-compose up --build` from repo root. Exposes `api:8080`, `frontend:3000`, `postgres:5432`.
