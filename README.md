# BlobLens — Ethereum Blob Analytics Engine

[![Rust](https://img.shields.io/badge/Rust-1.80%2B-orange)](https://www.rust-lang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Latest-2496ed)](https://www.docker.com/)

**BlobLens v0.2.0** — Real-time indexer for Ethereum blob transactions (EIP-4844). Continuously listens to Alchemy WebSocket, detects Type 3 blobs, and stores data in PostgreSQL.

## Features

- ✅ Real-time WebSocket listener (Alchemy)
- ✅ Type 3 blob transaction detection
- ✅ Rollup attribution (15+ chains)
- ✅ PostgreSQL persistence with indexes
- ✅ Health checks & auto-restart
- ✅ Structured JSON logging

## Quick Start

### Docker (Recommended)
```bash
cp .env.example .env
# Edit .env → add ALCHEMY_KEY=your_key_here

docker-compose up --build
```

### Local Setup
```bash
# Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

cp .env.example .env
cargo run --release
```

### Check Data
```bash
python3 check_blobs.py    # Dashboard with all stats
bash check-blobs.sh       # Shell version
```

## Project Structure

```
blob_lens/
├── src/
│   ├── main.rs
│   ├── services/blob_parser.rs     # WebSocket listener
│   ├── db/
│   │   ├── mod.rs                  # Pool & schema
│   │   └── models.rs               # Types
│   └── rollup_registry.rs          # Rollup mapping
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── check_blobs.py                  # Data inspector
```

## Database

Schema:
- `blob_transactions`: tx_hash, block_number, num_blobs, rollup, max_fee_per_blob_gas, created_at
- Indexes: (rollup, block_number)

Quick queries:
```sql
-- Count blobs
SELECT COUNT(*) FROM blob_transactions;

-- Latest blobs
SELECT tx_hash, num_blobs, rollup FROM blob_transactions ORDER BY created_at DESC LIMIT 10;

-- By rollup
SELECT rollup, COUNT(*), SUM(num_blobs) FROM blob_transactions GROUP BY rollup ORDER BY COUNT(*) DESC;

-- Connect
docker-compose exec postgres psql -U postgres -d blob_lens
```

## Configuration

```env
ALCHEMY_KEY=your_api_key_here
DATABASE_URL=postgresql://postgres:password@localhost:5433/blob_lens
RUST_LOG=info  # trace, debug, info, warn, error
```

## Production Deploy

For VPS/server deployment with GitHub Actions + PM2 + Nginx reverse proxy:

- See **[docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)**
- Workflow file: **`.github/workflows/deploy-production.yml`**
- PM2 config: **`ops/pm2/ecosystem.config.cjs`**
- Nginx config template: **`ops/nginx/blob-lens.conf`**

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ALCHEMY_KEY not set` | `cp .env.example .env` + add key |
| `Port 5432 in use` | `docker-compose down` or change port |
| `Cannot connect to Docker` | Start Docker Desktop |
| Database empty | Wait 2-3 minutes for first blobs |

## References

- **[EIP-4844](https://eips.ethereum.org/EIPS/eip-4844)** — Proto-Danksharding
- **[Alchemy](https://alchemy.com)** — WebSocket API
- **[Alloy-rs](https://alloy-rs.github.io/)** — Rust Ethereum library
- **[SQLx](https://sqlx.rs/)** — Type-safe async SQL
- **[Tokio](https://tokio.rs/)** — Async runtime

**MIT License** | Building blob analytics, one transaction at a time. 
