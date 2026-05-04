# blob_lens — Implementation Status

_Last updated: 2026-05-01_

---

## apps/api (Rust — Axum + SQLx + Alloy)

### What's done

**Indexer (`src/services/blob_parser.rs`)**
- WebSocket subscription to Alchemy for new blocks
- Per-block: reads `excess_blob_gas` + `blob_gas_used` from execution header
- Computes `blob_base_fee` via EIP-4844 `fake_exponential(1, excess_blob_gas, 3_338_477)`
- Computes `blob_count = blob_gas_used / 131_072` and `utilization = blob_gas_used / 786_432.0`
- Stores one row in `block_blob_stats` per block (even if no blob txs)
- Filters Type-3 transactions, resolves rollup, inserts into `blob_transactions` with `blob_base_fee`
- Static rollup registry + DB override via `rollup_registry` table

**Database schema (`src/db/mod.rs`)** — auto-created on first boot via `CREATE TABLE IF NOT EXISTS`
```
blob_transactions
  id, tx_hash (UNIQUE), block_number, block_hash
  from_address, to_address, num_blobs
  max_fee_per_blob_gas VARCHAR  ← what sender bids
  blob_base_fee BIGINT          ← actual market rate (wei)
  blob_hashes TEXT[]
  rollup VARCHAR
  created_at TIMESTAMPTZ

block_blob_stats
  block_number BIGINT PK
  blob_base_fee BIGINT          ← per-block base fee (wei)
  blob_gas_used INT             ← 0–786432
  blob_count INT                ← 0–6
  utilization FLOAT             ← 0.0–1.0 (target 0.5)
  created_at TIMESTAMPTZ

blob_hashes
  id, tx_hash FK, blob_index, versioned_hash

rollup_registry
  address PK, rollup_name, chain_id
```

Indexes: `idx_blob_transactions_rollup`, `idx_blob_transactions_block`, `idx_block_blob_stats_created`

**Rollup registry (`src/rollup_registry.rs`)** — ~20 hardcoded sequencer addresses
- OP Stack: Base, OP Mainnet, Unichain, Lisk, Blast, Mode, Zora, WorldChain, Fraxtal, Metal L2, Cyber, Ink, Derive
- Arbitrum One, Arbitrum Nova
- zkSync Era, Starknet, Linea, Scroll, Taiko, Mantle, Polygon zkEVM
- DB overrides merged at startup from `rollup_registry` table
- Falls back to `"UNKNOWN"` with `from_address` logged

**Axum REST API (`src/api.rs`)** — port 8080 (used for debugging; frontend talks direct to Postgres)
| Endpoint | Description |
|---|---|
| `GET /health` | liveness |
| `GET /api/stats` | total blobs, txs, avg fee |
| `GET /api/blobs/by-rollup` | rollup → count, total_blobs |
| `GET /api/blobs/recent` | latest 50 txs |
| `GET /api/blobs/unknown-top?hours=&limit=` | top UNKNOWN senders by blob count |
| `GET /api/activity/hourly` | hourly tx counts (24h) |
| `GET /api/fees/trend` | min/max/avg fee trend (7d) |

**Known gaps in `api.rs`** — the Axum API is not wired into the frontend; these endpoints exist for standalone debugging/inspection only and do not yet expose `block_blob_stats` or per-rollup utilization.

---

## apps/web (Next.js 16 — postgres.js, ECharts, Tailwind v4, shadcn/ui)

### Data layer

**`src/lib/db.ts`**
- `postgres.js` singleton pool, max 10 connections, 20s idle timeout
- SSL auto-enabled when `DATABASE_URL` contains `sslmode=require` (DigitalOcean managed Postgres)

**`src/lib/queries.ts`** — all queries hit Postgres directly, no Rust API dependency
| Function | Description |
|---|---|
| `getOverviewStats()` | total txs/blobs, rollup count, last block + time, avg utilization 24h |
| `getLeaderboard(hours)` | rollup aggregates: tx_count, total_blobs, avg_blobs_per_tx, avg_fee, last_seen |
| `getMarketActivity(hours)` | hourly: tx_count, blob_count, avg_fee (from blob_base_fee), max_blobs_in_block, avg_utilization — LEFT JOINs block_blob_stats |
| `getRollupTransactions(id)` | last 500 txs for one rollup |
| `getLatestBlobs(limit)` | latest N blob txs |
| `getRecentBlocks(limit)` | last N blocks from block_blob_stats, with rollup array and tx count |
| `getRollupSparklines()` | hourly blobs per rollup (24h) for leaderboard sparklines |

**`src/types/index.ts`**
```ts
MarketHour     { hour, tx_count, blob_count, avg_fee, max_blobs_in_block, avg_utilization }
BlobTransaction { tx_hash, block_number, num_blobs, rollup, max_fee_per_blob_gas, blob_base_fee, created_at }
LeaderboardRow  { rollup, tx_count, total_blobs, avg_blobs_per_tx, avg_fee, last_seen }
OverviewStats   { total_txs, total_blobs, rollup_count, last_indexed, last_block, avg_utilization_24h }
SparklinePoint  { rollup, hour, blobs }
BlockRow        { block_number, blob_base_fee, blob_gas_used, blob_count, utilization, tx_count, rollups[], created_at }
```

### Pages

| Route | ISR | Description |
|---|---|---|
| `/` | 60s | 5 stat cards (total blobs, txs, rollups, last block, avg utilization 24h) · rollup volume area + donut charts · blobs per block + cumulative growth · Live Feed tabbed: Blocks / Transactions |
| `/leaderboard` | 30s | Sortable table with BlobSparkline per rollup, CSV export |
| `/market` | 30s + SWR 12s | Regime badge + 4 stat cards · regime heatmap · fee trend + utilization charts · blobs per block + fee-blob scatter |
| `/rollup/[id]` | 30s | 4 stat cards · tabbed: Activity (heatmap + line chart) / Transactions (table with base fee + max bid cols) / Fees |

### API routes (SWR endpoints — `force-dynamic`)

| Route | Source query | Refresh |
|---|---|---|
| `GET /api/blobs` | `getLatestBlobs(20)` | SWR 12s |
| `GET /api/blocks` | `getRecentBlocks(20)` | SWR 12s |
| `GET /api/leaderboard?hours=N` | `getLeaderboard(N)` | SWR 30s |
| `GET /api/market?hours=N` | `getMarketActivity(N)` | SWR 12s |
| `GET /api/rollup/[id]` | `getRollupTransactions(id)` | on-demand |
| `GET /api/health` | `SELECT 1` | health check |

### Components

**Charts** (`src/components/charts/`) — all `"use client"`, `echarts-for-react`, 280px height, dark theme
| Component | Chart type | Data source |
|---|---|---|
| `BlobFeeLineChart` | Area line | `MarketHour.avg_fee` |
| `BlobsPerBlockChart` | Bar | `MarketHour.max_blobs_in_block` |
| `BlobUtilizationChart` | Area line 0–100% + 50% dashed target | `MarketHour.avg_utilization` |
| `CumulativeBlobGrowth` | Cumulative area | `MarketHour.blob_count` |
| `RollupVolumeAreaChart` | Stacked area | `LeaderboardRow.total_blobs` |
| `RollupShareDonut` | Donut | `LeaderboardRow.total_blobs` |
| `FeeBlobScatter` | Scatter | `MarketHour.avg_fee` vs `blob_count` |
| `RegimeHeatmap` | Custom cell grid | `MarketHour.max_blobs_in_block` |
| `RollupActivityHeatmap` | Calendar heatmap | `BlobTransaction[]` (rollup page) |
| `BlobSparkline` | Mini area line | `SparklinePoint[]` |
| `MarketRegimeTimeline` | Timeline bar | `MarketHour` regime classification |

**Shared** (`src/components/shared/`)
| Component | Description |
|---|---|
| `AppHeader` | Nav with active link highlight, regime badge slot |
| `StatCard` | `.stat-label` / value / `.caption` sub, purple top border |
| `RegimeBadge` | Colored dot + label based on `max_blobs_in_block` threshold |
| `RollupBadge` | Colored pill; UNKNOWN renders as italic grey; `linkable` prop → `/rollup/[id]` |
| `LiveBlobFeed` | SWR tx feed, 3px rollup-colored left accent strip, base fee shown |
| `BlockFeed` | SWR block feed, progress bar for blob gas utilization, rollup badges per block |

### Design system (`src/app/globals.css`)

- Typography: `Fraunces 400 1.125rem` for `.section-title`, `Geist 0.6875rem` for `.stat-label` / `.caption`
- Regime colors: `--regime-undersaturated #3d3d4e` / `--regime-healthy #1a8c6a` / `--regime-congested #c4822a` / `--regime-spike #c0394a`
- `ROLLUP_COLORS` map in `utils.ts`, `UNKNOWN → #3D3D4E`
- `shortHash`: `0x{first6}...{last4}`
- `formatFee`: converts wei → Gwei with 4 sig figs

---

## Environment / Deployment

**Hosted DB** — DigitalOcean managed PostgreSQL (sgp1)
- `DATABASE_URL` in `apps/web/.env.local` with `?sslmode=require`
- Schema auto-created by Rust indexer on first `cargo run --release --bin blob_lens`
- Run indexer: `cd apps/api && cargo run --release --bin blob_lens`

**Local full stack**
```bash
cp .env.example .env   # add ALCHEMY_KEY
docker-compose up --build
```

---

## What's not done yet (P1+)

- **Backfill** — no historical sync; only live data from indexer start
- **Rollup registry gaps** — UNKNOWN txs not yet identified; no UI to browse top UNKNOWN senders
- **Beacon chain blob content** — sidecar data (actual KiB per blob) not fetched; blob size shown as blob count only
- **Gas price correlation** — no chart comparing `blob_base_fee` vs L1 `baseFee`
- **Alerts / webhooks** — no spike detection or notifications
- **Axum API parity** — `api.rs` endpoints don't expose `block_blob_stats`; could expose a `/api/blocks/recent` for external consumers
- **Rollup registry admin UI** — no way to update `rollup_registry` table from the frontend
