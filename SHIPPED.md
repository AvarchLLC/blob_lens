# BlobLens — What We've Shipped

---

## What the Data is Telling Us

*Snapshot from ~45k blocks indexed (blocks 24,998,182 → 25,043,485 — roughly 6 days of mainnet)*

### Volume
- **42,262 blob transactions** processed, carrying **110,758 blobs** total
- **40 distinct rollups** identified (+ an UNKNOWN bucket)
- Average **2.62 blobs per transaction** across the whole dataset

### Rollup Dominance
Base is running away with it:

| Rollup | Blobs | Share |
|---|---|---|
| Base | 46,197 | **41.7%** |
| World Chain | 12,480 | 11.3% |
| UNKNOWN | 10,056 | 9.1% |
| Arbitrum One | 9,522 | 8.6% |
| Soneium | 5,190 | 4.7% |
| OP Mainnet | 4,735 | 4.3% |
| Unichain | 3,430 | 3.1% |

Base alone is posting more blobs than all other named rollups combined.

### Blob Space Waste — The Core Insight
- Average utilization across **all** blocks: **42.5%**
- Average utilization across blocks **that actually had blobs**: **63.9%**
- **12,187 out of 36,432 blocks** had zero blobs (33% of blocks completely empty)
- Only **5,466 blocks** hit ≥90% utilization (15% of all blocks)
- The network is paying for 9 blob slots per block. On average, fewer than 4 are used.

### Packing Efficiency — Who's Doing It Right
Max blobs per tx is 6. Who's filling them:

| Rollup | Avg blobs/tx |
|---|---|
| Ink | 6.00 (perfect) |
| Linea | 6.00 (perfect) |
| Starknet | 5.94 |
| OP Mainnet | 5.00 |
| World Chain | 5.00 |
| Base | 4.99 |
| Arbitrum One | 3.00 |

Ink and Linea are maxing out every transaction. Arbitrum is leaving half the space on the table.

### Fees
*(ETH/USD = $2,321 at time of writing. Cost per blob = fee × 131,072 gas / 1e18 × ETH price)*

| | gwei | USD / blob |
|---|---|---|
| Average | 0.038 gwei | **~$0.012** |
| Cheapest seen | 0.0045 gwei | ~$0.0014 |
| Most expensive seen | 0.36 gwei | ~$0.109 |

- Posting a blob on Ethereum costs on average **1.2 cents**. At peak it hit ~11 cents. That's still orders of magnitude cheaper than pre-EIP-4844 calldata.
- Fee has stayed extremely cheap — the market is nowhere near saturation
- One data artifact: `max_util = 350%` in block_blob_stats is a pre-fix legacy row (blob_base_fee was wrong before the Pectra patch, those rows are filtered in queries)

### The UNKNOWN Problem
9.1% of blobs are coming from addresses not in the rollup registry. That's ~10k blobs we can't attribute. Expanding the registry (new L3s, alt-DA users, smaller chains) is the highest-leverage data quality improvement.

---

## Backend (Rust — `apps/api`)

### Blob Indexer (`src/services/blob_parser.rs`)
- WebSocket subscription to Ethereum mainnet via Alchemy
- Filters Type 3 (EIP-4844) blob transactions from every new block
- **Fixed post-Pectra blob fee bug**: alloy 0.4 hardcodes the pre-Pectra `BLOB_GASPRICE_UPDATE_FRACTION` constant, producing astronomically wrong fees. Fixed by fetching `blob_base_fee` via `eth_feeHistory` RPC call instead — node computes it with the correct constants.
- Stores `excess_blob_gas` per block (needed for fee forecast math)
- Rollup attribution via address registry (~20 known sequencers)

### Database (`src/db/mod.rs`)
- `blob_transactions` — per-tx: hash, block, from/to, num_blobs, max bid, base fee, versioned hashes[], rollup
- `block_blob_stats` — per-block: blob_base_fee, blob_gas_used, blob_count, utilization, excess_blob_gas
- `blob_hashes` — individual versioned hashes indexed per tx
- `rollup_registry` — DB-backed rollup address map (merged with static map at startup)
- Idempotent migrations: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

---

## Frontend (Next.js — `apps/web`)

### Layout & Navigation
- **Sidebar** with logo, nav links (Overview / Leaderboard / Market / Research), live badge, theme toggle, footer links
- **TopBar** per-page header with title, subtitle, right slot
- **Mobile top bar** (`lg:hidden`): all 4 nav links + theme toggle
- **ThemeProvider + ThemeToggle**: full light/dark mode via `next-themes`, CSS variable swap
- All pages migrated off old `AppHeader` to `TopBar`

### Pages

#### `/` — Overview
- BlobFeeGauge: ECharts semicircle speedometer, log-scale (0.001–10 gwei), 6 colour segments, theme-aware gap colour
- USD cost per blob (live ETH price)
- Regime badge, stat strip, rollup share chart, live blob feed

#### `/leaderboard`
- Rollup leaderboard with **efficiency scoring** columns:
  - **DA Cost (ETH)** — `SUM(blobs × base_fee × 131072) / 1e18`
  - **Packing Score** — visual bar, `avg_blobs_per_tx / 6 × 100`, colour-coded
  - **Network Share %** — rollup's blobs / total blobs in window
- All columns sortable, CSV export includes new fields
- SWR live refresh, time-window selector (1h / 6h / 24h / 7d)

#### `/market`
- Stat strip, regime heatmap, fee trend chart, utilization chart
- **Fee Congestion Forecast** widget:
  - Pulls `excess_blob_gas` + avg `blob_gas_used` from last 20 blocks
  - Projects fee at +4 / +8 / +12 / +25 / +50 blocks using EIP-4844 formula:
    `fee_N = fee_0 × e^(N × (avg_gas − 589824) / 5007716)`  (post-Pectra constants)
  - Shows pressure indicator: Rising / Stable / Falling

#### `/research`
- 30-day window: cumulative blob growth, rollup market share donut, daily volume stacked area
- 7-day window: slot utilization, blobs per block, regime timeline, regime heatmap
- Data from 4 parallel DB queries at build time (ISR 60s)

#### `/rollup/[id]`
- Per-rollup stats, activity heatmap, tabbed transactions / fees
- **Blob content viewer** (`BlobDataViewer`):
  - Expandable per-row in the transactions table
  - Fetches `/api/blob-sidecar` on demand (lazy, not on page load)
  - Shows per-blob: encoding badge, fill ratio bar, non-zero byte count, versioned hash, KZG commitment, 256-byte hex dump

### API Routes (all `force-dynamic`)
| Route | Purpose |
|---|---|
| `GET /api/blob-sidecar` | Fetch blob sidecar from Beacon API, match to tx by KZG→versioned hash, return encoding + density metadata |
| `GET /api/leaderboard` | Rollup aggregates with efficiency columns |
| `GET /api/market` | Hourly activity joined with block_blob_stats |
| `GET /api/blobs` | Latest 20 transactions |
| `GET /api/blocks` | Recent blocks with blob stats |
| `GET /api/rollup/[id]` | Per-rollup transactions |
| `GET /api/health` | DB liveness |

### Blob Sidecar API (`/api/blob-sidecar`)
- Computes beacon slot from block number (`slot = MERGE_SLOT + block - MERGE_BLOCK`)
- Retries ±2 slots to handle missed slots
- Tries Beacon APIs in order: Alchemy consensus → publicnode.com → beaconapi.io
- Encoding detection: OP-Stack field-element packing, zlib, zstd, Arbitrum batch marker, sparse

---

## Known Limitations / Tech Debt
- Historical data before indexer fix (post-Pectra) has `blob_base_fee = 0` — charts show `—` for those rows
- Blob content viewer requires a reachable Beacon API (`ALCHEMY_KEY` or `BEACON_RPC_URL` in `apps/web/.env.local`)
- `rollup_registry` has ~20 hardcoded addresses — UNKNOWN bucket is large, needs expansion
- No historical backfill script yet

---

## Stack
| Layer | Tech |
|---|---|
| Indexer | Rust, Tokio, Alloy 0.4, SQLx, Axum |
| DB | PostgreSQL (DigitalOcean managed) |
| Frontend | Next.js 16, React 19, Tailwind v4, shadcn/ui |
| Charts | Recharts, ECharts (echarts-for-react) |
| Data | postgres.js direct DB access from server components |
| Deployment | Ubuntu + nginx (server), Rust binary (indexer) |
