# BlobLens — Ethereum Blob Analytics

Full-stack EIP-4844 analytics platform. Indexes every Ethereum block in real time using a custom Reth ExEx, stores data in ClickHouse, and serves it through a Next.js dashboard.

## Architecture

```
Self-hosted Reth archive node (ba-data, 100.76.225.2)
  └── apps/exex-node/    Custom Reth v2.2.0 binary with embedded ExEx
        ├── Live indexing → ClickHouse (ethereum.* + blob_lens.*)
        └── Internal MDBX backfill → historical data from Dencun

apps/indexer/            Standalone JSON-RPC backfill binary
  └── backfill           Fills ethereum.* + blob_lens.* from Dencun via RPC

apps/web/                Next.js 16 dashboard (React 19, Tailwind v4, shadcn/ui)
  └── Reads ClickHouse for blob/ETH data, Postgres for whale/RWA/OFAC/AI data

apps/api_v1/             Legacy Rust service (Alchemy-based, archived)
  └── Still runs: whale, RWA, OFAC, L1 cost, security metrics, AI analyst
```

## Data Sources

**ClickHouse** (`ba-data:8123`, db=`blob_lens`, db=`ethereum`):
- `ethereum.blocks / transactions / receipts / logs` — all Ethereum data from Dencun
- `ethereum.erc20_transfers / block_gas_stats / contract_events` — materialized views
- `blob_lens.blob_transactions / block_blob_stats / blob_tx_logs` — blob-specific tables
- User: `blob_lens` / Password: `changeme`

**PostgreSQL** — whale wallets, RWA tokens, OFAC sanctions, AI insights, L1 costs

## Quick Start

### Frontend
```bash
cd apps/web
cp .env.local.example .env.local   # set DATABASE_URL + CLICKHOUSE_* vars
pnpm install
pnpm dev                           # http://localhost:3000
```

### Backfill (standalone, no Reth node needed)
```bash
cd apps/indexer
RETH_RPC=http://ba-data:8545 \
CLICKHOUSE_URL=http://ba-data:8123 \
CLICKHOUSE_DB=blob_lens \
CLICKHOUSE_USER=blob_lens \
CLICKHOUSE_PASSWORD=changeme \
cargo run --release --bin backfill
```

### ExEx binary (requires Reth node)
```bash
cd apps/exex-node
cargo build --release --bin blob-indexer

# Build Docker image and deploy
docker build -t blob-indexer:latest .
# Update /ethereum/reth-docker-compose/docker-compose.yml → image: blob-indexer:latest
# docker compose up -d reth
```

## Monorepo

| Path | Description |
|---|---|
| `apps/exex-node/` | Reth ExEx + full ETH indexer |
| `apps/indexer/` | Standalone backfill binary |
| `apps/web/` | Next.js dashboard |
| `apps/api_v1/` | Legacy Alchemy indexer (whale/RWA/OFAC still active) |
| `ops/` | PM2, Nginx configs |
| `docs/` | Deployment guides |

## Environment Variables

Root `.env`:
```env
ALCHEMY_KEY=          # Legacy api_v1 services only
DATABASE_URL=postgresql://postgres:password@localhost:5432/blob_lens
RUST_LOG=info
```

`apps/web/.env.local`:
```env
DATABASE_URL=postgresql://...
CLICKHOUSE_URL=http://ba-data:8123
CLICKHOUSE_USER=blob_lens
CLICKHOUSE_PASSWORD=changeme
BEACON_RPC_URL=http://ba-data:5052
```

## References

- [EIP-4844](https://eips.ethereum.org/EIPS/eip-4844) — Proto-Danksharding
- [Reth ExEx docs](https://reth.rs/exex/exex.html) — Execution Extensions
- [ClickHouse](https://clickhouse.com/) — Column-store for blob analytics
