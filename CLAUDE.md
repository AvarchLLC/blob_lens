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
| `/mev` | 30s | MEV sandwich tracker — protocol breakdown, USD volume, bots, pools, live feed |

**ClickHouse tables (blob_lens database — written by apps/indexer):**
- `blob_transactions` — one row per Type-3 tx; `ReplacingMergeTree(version)` on `(block_number, tx_hash)`; always query with `FINAL WHERE is_canonical = 1`
- `block_blob_stats` — one row per block; same engine/pattern
- `sync_progress` — backfill cursor (`source='backfill'`, `last_block`)

**ClickHouse tables — MEV sandwich pipeline (blob_lens database):**
- `mev_sandwiches` — one row per detected sandwich; `ReplacingMergeTree(version)` on `(block_number, frontrun_tx, victim_tx, backrun_tx)`; always query `FINAL`
  - Core: `block_number`, `block_timestamp`, `sandwicher`, `pool`, `protocol` (uniswap_v3/v2/sushiswap_v2/curve/dodo)
  - Transaction triple: `frontrun_tx/idx`, `victim_tx/idx`, `backrun_tx/idx`
  - Denormalized pool info (avoids JOIN): `token0`, `token1`, `fee_tier`
  - Victim swap amounts (raw ABI slots as UInt256): `victim_data0`, `victim_data1`
    - v2: `data0=amount0In`, `data1=amount1In`; positive slot = victim's input token
    - v3: `data0=amount0` (int256 as UInt256), `data1=amount1`; if value ≥ 2^255 it's negative (token flows out)
  - Frontrun amounts: `fr_data0/1/2/3` (all 4 ABI slots for profit estimation)
  - Backrun amounts: `br_data0/1/2/3`
  - Gas costs from receipts: `frontrun_gas_used`, `frontrun_eff_gas_px`, `backrun_gas_used`, `backrun_eff_gas_px`
- `mev_backfill_progress` — cursor for MEV backfill (`source='mev_sandwich'`, `last_block`)
- `pool_tokens` — DEX pool → token mapping; `ReplacingMergeTree()` on `pool`; columns: `pool`, `token0`, `token1`, `protocol`, `fee_tier`, `factory`; ~250k pools populated from factory events
- `eth_daily_price` — daily ETH/USD closing price; `ReplacingMergeTree()` on `date`; 831 days from 2024-03-13; sourced from Kraken API + hardcoded Dencun-era prices

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
- `GET /api/mev?type=` — MEV sandwich data from ClickHouse; types:
  - `stats` — totals: sandwich count, unique victims/bots/pools, per-protocol breakdown, % blocks sandwiched
  - `weekly-trend&weeks=N` — weekly count + active bots + blocks sandwiched + per-protocol counts + `victim_usd_total`
  - `top-bots&limit=N` — ranked by sandwich count + `total_gas_cost_usd`
  - `top-pools&limit=N` — ranked pools with COALESCE(s.token0, pt.token0) fallback
  - `top-token-pairs&limit=N` — uses denormalized token0/token1 from mev_sandwiches + `victim_usd_total`
  - `recent&limit=N` — latest sandwiches with `victim_usd` per row
  - `blocks-pct&weeks=N` — weekly sandwich_blocks / total_blocks (requires `ethereum.blocks` scan)
  - `backfill-progress` — current backfill cursor + total sandwich count
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

## MEV sandwich detection pipeline

### Detection logic

Same-pool same-block sandwich pattern: `a (bot frontrun) → b (victim) → c (bot backrun)` where `a.from == c.from != b.from` and `a.tx_idx < b.tx_idx < c.tx_idx`.

Runs as a bash backfill script on ba-data (`/tmp/mev_backfill_v2.sh`), processes 10k-block chunks, progress in `mev_backfill_progress`. Safe to kill and resume — `ReplacingMergeTree` keeps latest version per key.

### Swap event signatures detected

| Protocol | Topic0 | Notes |
|---|---|---|
| Uniswap v3 | `0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67` | `Swap(address,address,int256,int256,uint160,uint128,int24)` |
| Uniswap v2 (+ forks) | `0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822` | `Swap(address,uint256,uint256,uint256,uint256,address)` |
| Curve CryptoSwap | `0xb2e76ae99761dc136e598d4a629bb347eccb9532a5f8bbd72e18467c3c34cc98` | `TokenExchange(...)` |
| DODO | `0xc2c0245e056d5fb095f04cd6373bc770802ebd1e6c918eb78fdef843cdb37b0f` | `DODOSwap(...)` |

SushiSwap uses the same event as Uniswap v2 — differentiated by factory address in `pool_tokens`.

### Pool → token mapping (pool_tokens table)

Populated from factory `PairCreated`/`PoolCreated` events in `ethereum.logs`:
- Uniswap v2 PairCreated topic0: `0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9`; `token0=substring(topic1,27)`, `token1=substring(topic2,27)`, `pool=substring(data,27,40)`
- Uniswap v3 PoolCreated topic0: `0x783cca1c0412dd0d695e784568c96da2e9c22ff989357a2e8b1d9b2b4e6b7118`; `pool=substring(data,91,40)`
- SushiSwap factory: `0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac` (same PairCreated event as v2)
- Coverage: ~74.7% of sandwiched pools (only pools created after Dencun are in our log data range)

### USD volume computation

Defined in `apps/web/src/app/api/mev/route.ts` as `victimUsdSql()` TypeScript helper. Logic (applied at query time with a LEFT JOIN on `eth_daily_price`):

1. Check if `token0` is USDC/USDT → `victim_data0 / 1e6` (if `victim_data0 < 2^255`, i.e., positive)
2. Check if `token0` is DAI → `victim_data0 / 1e18`
3. Check if `token0` is WETH → `victim_data0 / 1e18 * eth_price`
4. Repeat for `token1` / `victim_data1`
5. Otherwise → 0 (unknown token, no pricing)

The `2^255` threshold: for v3, `victim_data0` stores a signed int256 as UInt256 (two's complement). Values ≥ 2^255 have the high bit set = negative = token flows OUT (not the victim's input). For v2, amounts are always unsigned uint256, so the check is always true.

### Backfill script

Location on ba-data: `/tmp/mev_backfill_v2.sh`. Key query structure:

```sql
WITH swaps AS (
    SELECT l.block_number AS blk_num, l.tx_index AS tx_idx, l.tx_hash, l.address AS pool,
           t.from_address AS from_addr, t.block_timestamp AS blk_ts,
           l.data AS swap_data,
           coalesce(pt.token0,'') AS tk0, coalesce(pt.token1,'') AS tk1, coalesce(pt.fee_tier,0) AS fee_t,
           coalesce(toUInt64(r.gas_used),0) AS gas_used, coalesce(toUInt64(r.effective_gas_price),0) AS eff_gas_px,
           multiIf(...) AS proto
    FROM ethereum.logs l
    JOIN ethereum.transactions t ON l.tx_hash=t.tx_hash AND l.block_number=t.block_number AND t.is_deleted=0
    LEFT JOIN blob_lens.pool_tokens pt FINAL ON l.address=pt.pool
    LEFT JOIN ethereum.receipts r ON l.tx_hash=r.tx_hash AND l.block_number=r.block_number AND r.is_deleted=0
    WHERE l.block_number BETWEEN $CUR AND $BATCH_END AND l.is_deleted=0
      AND l.topic0 IN (/* 4 swap event signatures */)
),
swap_txs AS (SELECT blk_num, tx_hash, min(tx_idx) AS tx_idx, pool, any(...) FROM swaps GROUP BY blk_num, tx_hash, pool)
-- Sandwich triple self-join on swap_txs
-- Amount decoding: reinterpretAsUInt256(reverse(unhex(substring(l.data, 3, 64))))
-- data field in ethereum.logs has 0x prefix; first 32 bytes at substring(data,3,64), second at (67,64), etc.
```

### ethereum.* tables (discovered schema)

These live in the `ethereum` database on ClickHouse (ba-data), written by the Reth ExEx:

- `ethereum.logs` — `block_number`, `tx_hash`, `tx_index`, `log_index`, `address`, `topic0/1/2/3`, `data` (hex WITH `0x` prefix), `is_deleted`
- `ethereum.transactions` — `block_number`, `tx_hash`, `tx_index`, `from_address`, `to_address`, `gas_price (Nullable(UInt128))`, `max_fee_per_gas (Nullable(UInt128))`, `max_priority_fee (Nullable(UInt128))`, `gas_limit`, `value`, `input`, `is_deleted`
- `ethereum.receipts` — `block_number`, `tx_hash`, `tx_index`, `gas_used (UInt64)`, `effective_gas_price (UInt64)`, `cumulative_gas_used`, `success`, `blob_gas_used`, `blob_gas_price`, `is_deleted`
- `ethereum.blocks` — `number`, `hash`, `timestamp`, `miner`, `gas_limit`, `gas_used`, `base_fee_per_gas`, `is_deleted`

**Critical note:** `ethereum.logs.data` is stored WITH the `0x` prefix. To decode ABI-encoded 32-byte slots:
```sql
reinterpretAsUInt256(reverse(unhex(substring(data, 3, 64))))   -- slot 0 (bytes 0-31)
reinterpretAsUInt256(reverse(unhex(substring(data, 67, 64))))  -- slot 1 (bytes 32-63)
reinterpretAsUInt256(reverse(unhex(substring(data, 131, 64)))) -- slot 2 (bytes 64-95)
reinterpretAsUInt256(reverse(unhex(substring(data, 195, 64)))) -- slot 3 (bytes 96-127)
```

## Next.js 16 gotchas

This project uses Next.js 16 with React 19 — there are breaking API changes from earlier versions:
- `params` and `searchParams` in page/layout components are **Promises** — always `await params`.
- Check `node_modules/next/dist/docs/` for the authoritative guide before writing routing or server component code.

## Deployment

- **Frontend (Vercel):** Set `DATABASE_URL` as an environment variable in Vercel project settings. `vercel.json` handles the build. The DB must be reachable from Vercel's serverless runtime (use Neon, Supabase, or a VPS with exposed Postgres).
- **Backend + DB:** `docker-compose up --build` from repo root. Exposes `api:8080`, `frontend:3000`, `postgres:5432`.
- **VPS (GitHub Actions + PM2 + Nginx):** See `docs/PRODUCTION_DEPLOYMENT.md`. Deploys to `/opt/blob-lens/releases/<timestamp>` with a `current` symlink. PM2 config at `ops/pm2/ecosystem.config.cjs` runs both the Next.js server and the Rust indexer. Nginx config template at `ops/nginx/blob-lens.conf`.
