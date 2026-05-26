# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo layout

```
blob_lens/
├── apps/
│   ├── indexer/      Rust Reth ExEx node — writes blob data to ClickHouse (port 8545/8546/9001)
│   ├── api_v1/       Legacy Alchemy-based Rust indexer (archived — whale/RWA/OFAC services still used)
│   └── web/          Next.js 16 dashboard (React 19, Tailwind v4, shadcn/ui, Recharts + ECharts)
├── docker-compose.yml  legacy: starts postgres + api_v1 + frontend together
├── vercel.json         Vercel build config for apps/web (DATABASE_URL must be set in Vercel env)
├── package.json        pnpm workspace root
└── pnpm-workspace.yaml
```

## Ethereum node (ba-data)

The canonical data source is a self-hosted Reth v2.2.0 + Lighthouse node on `ba-data` (Tailscale, `100.76.225.2`).

- Reth RPC:    `http://ba-data:8545` (HTTP), `ws://ba-data:8546` (WebSocket)
- Beacon API:  `http://ba-data:5052`
- ClickHouse:  `http://ba-data:8123` (HTTP), `ba-data:9000` (native binary protocol)
- Node config: `/ethereum/docker-compose.yml` on ba-data
- SSH:         `badmin@ba-data` — no sudo/docker access; root needed for Docker operations

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

### New indexer (apps/indexer) — Reth ExEx + ClickHouse
```bash
cd apps/indexer
cp .env.example .env        # set CLICKHOUSE_* vars

# Build both binaries (slow first time: Reth has many deps)
cargo build --release --bin blob-indexer --bin backfill
cargo clippy

# Run backfill only (JSON-RPC → ClickHouse, no Reth node needed locally)
RETH_RPC=http://ba-data:8545 cargo run --bin backfill

# Full node binary (replaces vanilla reth on ba-data — see infra/deploy-ba-data.sh)
# cargo run --bin blob-indexer -- node --chain=mainnet --datadir=/data ...
```

### Legacy indexer (apps/api_v1) — archived, Alchemy-based
```bash
cd apps/api_v1
cargo build --release
cargo run                  # requires .env at repo root with ALCHEMY_KEY
cargo clippy
```

### Full stack (Docker — legacy)
```bash
cp .env.example .env       # add ALCHEMY_KEY
docker-compose up --build  # postgres:5432 + api_v1:8080 + frontend:3000
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
- `BEACON_RPC_URL` — optional override for Beacon API (defaults to Alchemy consensus + public fallbacks). Required for `/api/blob-sidecar` to work reliably. Example: `https://ethereum-mainnet-beacon.publicnode.com`
- `ALCHEMY_KEY` — used by `/api/blob-sidecar` to build the Alchemy consensus endpoint (`eth-mainnet-consensus.g.alchemy.com`)

Root `.env` (optional):
- `CLAUDE_API_KEY` — if set, `ai_analyst` service calls the Anthropic API to generate real weekly reports; if unset, seeds mock insights instead

## Architecture

### apps/indexer — Reth ExEx node (new)

Custom Reth v2.2.0 binary with an embedded ExEx. Replaces the standard `reth` Docker container on ba-data. Writes directly to ClickHouse — no Alchemy dependency.

| Binary | Entry | What it does |
|---|---|---|
| `blob-indexer` | `src/main.rs` | Full Reth node + ExEx; receives `ChainCommitted/Reverted/Updated` notifications and writes blob data to ClickHouse in real time |
| `backfill` | `src/bin/backfill.rs` | One-shot historical fill from block 19,426,587 (Dencun) to current head via JSON-RPC; progress tracked in `sync_progress` table; safe to interrupt and resume |

Key files:
- `src/exex.rs` — ExEx core: extracts blob txs + block stats per block, handles re-orgs via `is_canonical` flag + `ReplacingMergeTree(version)` in ClickHouse
- `src/clickhouse_client.rs` — schema init, row types, batch insert helpers
- `src/rollup.rs` — static address → rollup registry (ported from api_v1)
- `infra/clickhouse-compose.yml` — ClickHouse Docker (run as root on ba-data)
- `infra/deploy-ba-data.sh` — full deploy: start ClickHouse → build image → swap reth container

**Re-org handling:** On `ChainReverted`/`ChainUpdated.old`, rows are inserted with `is_canonical=0` and a fresh nanosecond `version`. On commit, `is_canonical=1` with an even newer version. `ReplacingMergeTree` keeps the highest version per `(block_number, tx_hash)`. Query with `FINAL WHERE is_canonical = 1`.

### apps/api_v1 — legacy Rust service (archived)

Multiple concurrent Tokio tasks; Alchemy WebSocket as data source; writes to Postgres. The non-blob services (whale, RWA, OFAC, L1 cost, security metrics, AI analyst) still run from this binary. The blob_parser task is superseded by the ExEx.

Schema created inline in `db::init_pool`. `max_fee_per_blob_gas` is stored as `VARCHAR` — cast with `CAST(... AS BIGINT)` in queries.

Rollup attribution (`src/rollup_registry.rs`) checks `from`/`to` against hardcoded sequencer addresses.

### apps/web — Next.js 16

**Data flow:** Postgres ← postgres.js (server) ← Next.js route handlers ← SWR client

- **Direct DB access** via `postgres.js` in server components and route handlers — no Rust API dependency.
- All SQL lives in `src/lib/queries.ts`. `src/lib/db.ts` holds the singleton connection pool.
- **App Router**, Server Components by default, `export const revalidate = N` for ISR.
- `params` and `searchParams` are **Promises** in Next.js 16 — always `await params`.
- Chart components in `src/components/charts/` are `"use client"` (Recharts/ECharts need browser). Most charts use Recharts; `RollupActivityHeatmap` and a few others use ECharts (`echarts-for-react`).
- `/market` page uses SWR (`MarketLiveWrapper.tsx`) for 12s live refresh.
- `src/components/ui/` contains stub implementations of shadcn components — run `npx shadcn@latest add` to replace with full Radix UI versions.
- ETH price is fetched from CoinGecko in `src/lib/ethPrice.ts` (cached 5 min via `next.revalidate`). All USD cost math flows through `blobCostUsd()` and `formatUsd()` in that file.
- `BlobDataViewer` (`src/components/shared/BlobDataViewer.tsx`) fetches raw blob data from the Beacon chain via `/api/blob-sidecar`. It detects encoding (OP-Stack, zlib, zstd, Arbitrum) from the first bytes of the blob.

**Pages:**
| Route | Revalidate | Description |
|---|---|---|
| `/` | 3600s | Overview: blob cost chart, fee gauge, live feed (blocks + txs), 30d volume, rollup share |
| `/live` | 0 | Fully dynamic live blob/block feed |
| `/leaderboard` | 30s | Sortable rollup leaderboard with sparklines + CSV export |
| `/market` | 30s | Regime heatmap, fee trend, slot utilization, per-rollup activity, congestion forecast |
| `/research` | 60s | Long-horizon charts: cumulative growth, market share donut, regime timeline/heatmap (30d) |
| `/research/ai-insights` | 3600s | AI-generated weekly blob market analysis |
| `/research/security` | 86400s | Chain security metrics |
| `/rollup/[id]` | 30s | Per-rollup: stats, tabbed activity/transactions/fees |
| `/dashboard` | 60s | Top DA performers and fee market health / regime classification |
| `/whale-watch` | 300s | Whale wallet leaderboard with OFAC cross-reference |
| `/compliance/ofac` | 3600s | OFAC sanctions list with address lookup |
| `/rwa` | 60s | Real-world asset token tracker |
| `/eth-liquidity` | 3600s | ETH supply distribution by category |
| `/unknown` | 60s | Unattributed blob senders |

**ClickHouse tables (blob_lens database — written by apps/indexer):**
- `blob_transactions` — one row per Type-3 tx; `ReplacingMergeTree(version)` on `(block_number, tx_hash)`; always query with `FINAL WHERE is_canonical = 1`
- `block_blob_stats` — one row per block; same engine/pattern
- `sync_progress` — backfill cursor (`source='backfill'`, `last_block`)

**PostgreSQL tables queried by the frontend (written by apps/api_v1):**
- `blob_transactions` — one row per EIP-4844 tx: `tx_hash`, `block_number`, `from_address`, `rollup`, `num_blobs`, `max_fee_per_blob_gas` (VARCHAR), `blob_base_fee` (BIGINT), `blob_hashes` (text[]), `bytes_used`, `fullness_ratio`, `is_ghost_blob`, `created_at`
- `block_blob_stats` — one row per block: `block_number`, `blob_base_fee`, `blob_gas_used`, `excess_blob_gas`, `blob_count`, `utilization` (0–1 float), `created_at`
- `regime_alerts` — triggered market regime alerts
- `rwa_tokens` / `rwa_token_prices` — real-world asset token list + price history
- `eth_liquidity_snapshot` — ETH supply snapshots by category
- `whale_wallets` / `whale_wallet_snapshots` / `whale_activity_log` — whale balance tracking
- `ofac_sanctions_list` / `ofac_sanctions_history` — OFAC sanctions data
- `l1_transaction_costs` — per-chain L1 gas cost comparisons
- `chain_security_metrics` — validator/sequencer security metrics per chain
- `ai_insights` — AI-generated weekly analysis records

**API routes** (all `force-dynamic`):
- `GET /api/health` — DB liveness
- `GET /api/blobs` — latest 20 transactions
- `GET /api/blocks` — latest 20 blocks with blob stats
- `GET /api/leaderboard?hours=N` — rollup aggregates
- `GET /api/market?hours=N` — hourly activity
- `GET /api/rollup/[id]` — per-rollup transactions
- `GET /api/rollup-fee?rollup=&hours=N` — per-rollup fee history
- `GET /api/eth-price` — ETH/USD from CoinGecko (proxied, 5 min cache)
- `GET /api/blob-sidecar?tx_hash=&block_number=` — raw blob data + KZG commitments from Beacon API; detects encoding type
- `GET /api/alerts` — active regime alerts
- `GET /api/l1-fee` — L1 cost comparisons
- `GET /api/whale-watch` — whale wallet data

## Next.js 16 gotchas

This project uses Next.js 16 with React 19 — there are breaking API changes from earlier versions:
- `params` and `searchParams` in page/layout components are **Promises** — always `await params`.
- Check `node_modules/next/dist/docs/` for the authoritative guide before writing routing or server component code.

## Deployment

- **Frontend (Vercel):** Set `DATABASE_URL` as an environment variable in Vercel project settings. `vercel.json` handles the build. The DB must be reachable from Vercel's serverless runtime (use Neon, Supabase, or a VPS with exposed Postgres).
- **Backend + DB:** `docker-compose up --build` from repo root. Exposes `api:8080`, `frontend:3000`, `postgres:5432`.
- **VPS (GitHub Actions + PM2 + Nginx):** See `docs/PRODUCTION_DEPLOYMENT.md`. Deploys to `/opt/blob-lens/releases/<timestamp>` with a `current` symlink. PM2 config at `ops/pm2/ecosystem.config.cjs` runs both the Next.js server and the Rust indexer. Nginx config template at `ops/nginx/blob-lens.conf`.
