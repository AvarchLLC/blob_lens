# BlobLens — Ethereum Blob Analytics Engine

[![Rust](https://img.shields.io/badge/Rust-1.80%2B-orange)](https://www.rust-lang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Latest-2496ed)](https://www.docker.com/)

**BlobLens v0.2.0** — Real-time indexer for Ethereum blob transactions (EIP-4844). Continuously listens to Alchemy WebSocket, detects Type 3 blobs, and stores data in PostgreSQL.

---

## ✨ Features

- ✅ Real-time WebSocket listener (Alchemy)
- ✅ Type 3 blob transaction detection
- ✅ Rollup attribution (15+ chains supported)
- ✅ PostgreSQL persistence with indexes
- ✅ Health checks & auto-restart
- ✅ Structured JSON logging

---

## � Quick Start

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

---

## 📁 Project Structure

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

---

## 📊 Database Schema

### `blob_transactions`
```sql
CREATE TABLE blob_transactions (
    id BIGSERIAL PRIMARY KEY,
    tx_hash VARCHAR(255) UNIQUE NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(255) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255),
    num_blobs INT NOT NULL,
    max_fee_per_blob_gas VARCHAR(255) NOT NULL,
    blob_hashes TEXT[] NOT NULL,
    rollup VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `blob_hashes`
- Per-blob tracking with index and versioned hash
- Foreign key to `blob_transactions`

### `rollup_registry`
- Address → rollup name mapping
- Covered rollups: Base, OP Mainnet, Arbitrum, zkSync, Scroll, Starknet, Linea, Taiko, Mantle, Polygon zkEVM, and more

---

## � Check What's Been Collected

### Easiest Way (Automated Script)
```bash
# Run our inspector script
python3 check_blobs.py

# Output shows:
# • Total transactions indexed
# • Total blobs collected
# • Latest 5 transactions
# • Blobs by rollup
# • Average fees
# • Blocks with most blobs
```

### Manual Database Queries

### Get Latest Blob Transactions
```sql
SELECT tx_hash, block_number, rollup, num_blobs, max_fee_per_blob_gas, created_at
FROM blob_transactions
ORDER BY created_at DESC
LIMIT 10;
```

### Blob Count by Rollup
```sql
SELECT rollup, COUNT(*) as tx_count, SUM(num_blobs) as total_blobs
FROM blob_transactions
GROUP BY rollup
ORDER BY total_blobs DESC;
```

### Fee Trends (Hourly Average)
```sql
SELECT DATE_TRUNC('hour', created_at) as hour, 
       AVG(CAST(max_fee_per_blob_gas AS BIGINT)) as avg_fee,
       COUNT(*) as tx_count
FROM blob_transactions
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### Connect to Database
```bash
# Docker
docker exec -it blob-lens-postgres psql -U postgres -d blob_lens

# Local
psql -U postgres -d blob_lens -h localhost
```

---

## 📁 Project Structure

```
blob_lens/
├── src/
│   ├── main.rs                 Entry point
│   ├── services/
│   │   └── blob_parser.rs      WebSocket listener & TX processing
│   ├── db/
│   │   ├── mod.rs              Pool, schema, queries
│   │   └── models.rs           Database record types
│   └── rollup_registry.rs      Address → rollup mapping
├── Cargo.toml                  Dependencies
├── Dockerfile                  Multi-stage build
├── docker-compose.yml          Postgres + App orchestration
├── .env.example                Configuration template
├── README.md                   This file
├── SETUP.md                    Detailed setup guide
└── DOCKER.md                   Docker-specific documentation
```

---

## ⚙️ Configuration

```env
ALCHEMY_KEY=your_api_key_here
DATABASE_URL=postgresql://postgres:password@localhost:5432/blob_lens
RUST_LOG=info  # trace, debug, info, warn, error
```

---

## 🛠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| `ALCHEMY_KEY not set` | `cp .env.example .env` + add key |
| `Port 5432 in use` | `docker-compose down` or change port |
| `Cannot connect to Docker` | Start Docker Desktop |
| Database empty | Wait 2-3 minutes for first blobs |

---

## 📚 References

- **[EIP-4844](https://eips.ethereum.org/EIPS/eip-4844)** — Proto-Danksharding
- **[Alchemy](https://alchemy.com)** — WebSocket API provider
- **[Alloy-rs](https://alloy-rs.github.io/)** — Rust Ethereum library
- **[SQLx](https://sqlx.rs/)** — Type-safe async SQL
- **[Tokio](https://tokio.rs/)** — Async runtime


