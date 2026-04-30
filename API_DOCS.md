# BlobLens API Documentation

Real-time Ethereum blob transaction data from PostgreSQL. All endpoints return JSON with `Content-Type: application/json`.

---

## 🔗 Base URL

```
http://localhost:8080
```

All endpoints are prefixed with `/api/`.

---

## 📊 Endpoints

### 1. **GET /api/stats**

Overall statistics snapshot.

**Response:**
```json
{
  "total_transactions": 1734,
  "total_blobs": 4596,
  "average_fee_per_blob_gas": 14.25,
  "network": "mainnet",
  "last_block_indexed": 19521847,
  "indexed_at": "2026-04-28T14:32:19Z"
}
```

**Fields:**
- `total_transactions` (i64) — Total Type 3 blob transactions indexed
- `total_blobs` (i64) — Total number of blobs across all transactions
- `average_fee_per_blob_gas` (f64) — Mean max_fee_per_blob_gas across all transactions (in Gwei)
- `network` (string) — Ethereum network ("mainnet")
- `last_block_indexed` (i64) — Highest block number processed
- `indexed_at` (string) — ISO 8601 timestamp of when stats were computed

**Cache:** ~30 seconds (update frequency of indexer)

---

### 2. **GET /api/blobs/by-rollup**

Transaction and blob count aggregated by rollup.

**Response:**
```json
[
  {
    "rollup": "Base",
    "transaction_count": 647,
    "blob_count": 1892,
    "percentage": 41.15
  },
  {
    "rollup": "OP Mainnet",
    "transaction_count": 523,
    "blob_count": 1456,
    "percentage": 31.67
  },
  {
    "rollup": "Arbitrum One",
    "transaction_count": 312,
    "blob_count": 892,
    "percentage": 19.40
  },
  {
    "rollup": "UNKNOWN",
    "transaction_count": 252,
    "blob_count": 356,
    "percentage": 7.74
  }
]
```

**Fields:**
- `rollup` (string) — Rollup name (15 supported chains + "UNKNOWN")
- `transaction_count` (i64) — Number of transactions from this rollup
- `blob_count` (i64) — Total blobs submitted by this rollup
- `percentage` (f64) — Percentage of total blobs (0-100)

**Supported Rollups:**
Base, OP Mainnet, Arbitrum One, Arbitrum Nova, zkSync Era, Starknet, Linea, Scroll, Taiko, Mantle, Polygon zkEVM, Blast, Zora, World Chain, Mode Network, UNKNOWN

**Sort Order:** Descending by blob_count

---

### 3. **GET /api/blobs/recent**

Most recent blob transactions.

**Query Parameters:**
- `limit` (i64, optional, default: 20, max: 1000) — Number of results to return

**Response:**
```json
[
  {
    "tx_hash": "0xabc123...",
    "block_number": 19521847,
    "blob_count": 5,
    "rollup": "Base",
    "max_fee_per_blob_gas": 15.47,
    "created_at": "2026-04-28T14:32:19Z"
  },
  {
    "tx_hash": "0xdef456...",
    "block_number": 19521846,
    "blob_count": 2,
    "rollup": "OP Mainnet",
    "max_fee_per_blob_gas": 14.82,
    "created_at": "2026-04-28T14:32:05Z"
  }
]
```

**Fields:**
- `tx_hash` (string) — Full transaction hash (0x-prefixed hex)
- `block_number` (i64) — Block number containing transaction
- `blob_count` (i64) — Number of blobs in this transaction
- `rollup` (string) — Attributed rollup or "UNKNOWN"
- `max_fee_per_blob_gas` (f64) — Fee per blob in Gwei
- `created_at` (string) — ISO 8601 timestamp when indexed

**Sort Order:** Descending by created_at (newest first)

**Example:**
```bash
curl "http://localhost:8080/api/blobs/recent?limit=10"
```

---

### 4. **GET /api/activity/hourly**

Transaction and blob count per hour (UTC).

**Query Parameters:**
- `hours` (i64, optional, default: 24, max: 168) — Number of past hours to include

**Response:**
```json
[
  {
    "hour": "2026-04-28T14:00:00Z",
    "transaction_count": 45,
    "blob_count": 127
  },
  {
    "hour": "2026-04-28T13:00:00Z",
    "transaction_count": 52,
    "blob_count": 143
  }
]
```

**Fields:**
- `hour` (string) — ISO 8601 hour boundary (rounded down to HH:00:00)
- `transaction_count` (i64) — Transactions in this hour
- `blob_count` (i64) — Total blobs in this hour

**Sort Order:** Descending by hour (most recent first)

**Example:**
```bash
curl "http://localhost:8080/api/activity/hourly?hours=48"
```

---

### 5. **GET /api/fees/trend**

Fee statistics over time (hourly).

**Query Parameters:**
- `days` (i64, optional, default: 7, max: 30) — Number of past days to include

**Response:**
```json
[
  {
    "hour": "2026-04-28T14:00:00Z",
    "min_fee": 8.92,
    "max_fee": 24.15,
    "avg_fee": 14.53,
    "median_fee": 13.87
  },
  {
    "hour": "2026-04-28T13:00:00Z",
    "min_fee": 9.12,
    "max_fee": 22.48,
    "avg_fee": 13.92,
    "median_fee": 13.21
  }
]
```

**Fields:**
- `hour` (string) — ISO 8601 hour boundary
- `min_fee` (f64) — Minimum max_fee_per_blob_gas in this hour (Gwei)
- `max_fee` (f64) — Maximum max_fee_per_blob_gas in this hour (Gwei)
- `avg_fee` (f64) — Mean max_fee_per_blob_gas in this hour (Gwei)
- `median_fee` (f64) — Median max_fee_per_blob_gas in this hour (Gwei)

**Sort Order:** Descending by hour (most recent first)

**Example:**
```bash
curl "http://localhost:8080/api/fees/trend?days=14"
```

---

### 6. **GET /api/health**

Service health check.

**Response:**
```json
{
  "status": "healthy",
  "uptime_seconds": 3456,
  "database": "connected",
  "blocks_processed": 19521847
}
```

**HTTP Status:** 200 if healthy, 503 if unhealthy

---

### 7. **GET /api/blobs/unknown-top**

Top sender addresses currently classified as `UNKNOWN`, useful for attribution backfill.

**Query Parameters:**
- `hours` (i64, optional, default: 24, range: 1..720)
- `limit` (i64, optional, default: 20, range: 1..200)

**Response:**
```json
[
  {
    "from_address": "0x5050F69a9786F081509234F1a7F4684b5E5b76C9",
    "tx_count": 396,
    "total_blobs": 1977,
    "last_seen": "2026-04-30 11:38:59.492034+00"
  }
]
```

**Example:**
```bash
curl "http://localhost:8080/api/blobs/unknown-top?hours=24&limit=10"
```

---

## 🧭 Attribution Overrides

You can override/add rollup mappings without changing code by inserting into `rollup_registry`.

```sql
INSERT INTO rollup_registry (address, rollup_name, chain_id)
VALUES
  ('0x5050f69a9786f081509234f1a7f4684b5e5b76c9', 'Your Rollup Name', NULL)
ON CONFLICT (address)
DO UPDATE SET rollup_name = EXCLUDED.rollup_name;
```

The indexer loads DB mappings at startup and uses them as overrides.

---

## 📈 Data Types & Schemas

### BlobTransaction (Database Model)

```typescript
interface BlobTransaction {
  id: string;              // UUID primary key
  tx_hash: string;         // Transaction hash (0x-prefixed)
  block_number: i64;       // Ethereum block number
  num_blobs: i64;          // Number of blobs
  rollup: string;          // Rollup attribution or "UNKNOWN"
  max_fee_per_blob_gas: f64; // Fee in Gwei
  created_at: string;      // ISO 8601 timestamp
}
```

### Fee Format

All fees are in **Gwei** (1 Gwei = 10^-9 ETH):
- Type: Float64 / f64
- Precision: 2-6 decimal places
- Example: `14.25` Gwei = 14.25 * 10^-9 ETH

### Timestamps

All times are in **UTC** using ISO 8601 format:
- Format: `YYYY-MM-DDTHH:MM:SSZ`
- Example: `2026-04-28T14:32:19Z`
- Timezone: Always Z (UTC)

---

## 🔄 Real-Time Updates

### Polling Strategy
Recommended: **30-second interval**
```bash
# Bash example
while true; do
  curl http://localhost:8080/api/stats
  sleep 30
done
```

### JavaScript Example
```javascript
// Fetch latest data every 30 seconds
setInterval(async () => {
  const response = await fetch('http://localhost:8080/api/stats');
  const data = await response.json();
  console.log(`Latest: ${data.total_blobs} blobs`);
}, 30000);
```

### React Hook Example
```typescript
import { useState, useEffect } from 'react';

export function useStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const res = await fetch('/api/stats');
      setStats(await res.json());
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}
```

---

## 🎨 Chart.js Integration Example

### Rollup Pie Chart
```javascript
async function loadRollupChart() {
  const data = await fetch('/api/blobs/by-rollup').then(r => r.json());
  
  new Chart(document.getElementById('rollupChart'), {
    type: 'doughnut',
    data: {
      labels: data.map(r => r.rollup),
      datasets: [{
        data: data.map(r => r.blob_count),
        backgroundColor: ['#0066cc', '#ff6600', '#00cc00', '#cccccc'],
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}
```

### Activity Bar Chart
```javascript
async function loadActivityChart() {
  const data = await fetch('/api/activity/hourly?hours=24').then(r => r.json());
  
  new Chart(document.getElementById('activityChart'), {
    type: 'bar',
    data: {
      labels: data.map(d => new Date(d.hour).toLocaleTimeString()),
      datasets: [{
        label: 'Blobs/Hour',
        data: data.map(d => d.blob_count),
        backgroundColor: '#0066cc'
      }]
    }
  });
}
```

### Fee Trend Line Chart
```javascript
async function loadFeeChart() {
  const data = await fetch('/api/fees/trend?days=7').then(r => r.json());
  
  new Chart(document.getElementById('feeChart'), {
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.hour).toLocaleDateString()),
      datasets: [{
        label: 'Avg Fee (Gwei)',
        data: data.map(d => d.avg_fee),
        borderColor: '#ff6600',
        tension: 0.4,
        fill: false
      }]
    }
  });
}
```

---

## ⚙️ Advanced Queries (Direct PostgreSQL)

If you need to query the database directly via `docker-compose exec`:

### Total Blobs by Rollup
```sql
SELECT rollup, COUNT(*) as tx_count, SUM(num_blobs) as blob_count
FROM blob_transactions
GROUP BY rollup
ORDER BY blob_count DESC;
```

### Blobs Per Hour (Last 24h)
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as tx_count,
  SUM(num_blobs) as blob_count
FROM blob_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### Fee Statistics (Last 7 Days)
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  MIN(max_fee_per_blob_gas) as min_fee,
  MAX(max_fee_per_blob_gas) as max_fee,
  AVG(max_fee_per_blob_gas) as avg_fee,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY max_fee_per_blob_gas) as median_fee
FROM blob_transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### Top Transactions
```sql
SELECT tx_hash, block_number, num_blobs, rollup, max_fee_per_blob_gas, created_at
FROM blob_transactions
ORDER BY created_at DESC
LIMIT 100;
```

---

## 🚀 Deployment

### Docker
Endpoints available at `http://blob-lens:8080` inside Docker network or `http://localhost:8080` if exposed.

### Docker Compose
```yaml
services:
  blob-lens:
    ports:
      - "8080:8080"
```

### CORS
All endpoints support CORS headers (if configured):
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

---

## 📝 Error Handling

### Success Response (200)
```json
{
  "data": {...}
}
```

### Error Response (4xx/5xx)
```json
{
  "error": "Database connection failed",
  "status": 503
}
```

### Common Status Codes
- `200` — Success
- `400` — Invalid query parameters
- `503` — Service unavailable (database down)

---

## 🔍 Debugging

### Check API Availability
```bash
curl -v http://localhost:8080/api/health
```

### Monitor Database Connection
```bash
docker-compose exec postgres psql -U postgres -d blob_lens -c "SELECT COUNT(*) FROM blob_transactions;"
```

### View Application Logs
```bash
docker-compose logs -f blob-lens
```

---

## 📞 Integration Checklist

- [ ] Add API base URL to frontend environment config
- [ ] Implement `/api/stats` → stat cards display
- [ ] Implement `/api/blobs/by-rollup` → pie/bar chart
- [ ] Implement `/api/activity/hourly` → bar chart
- [ ] Implement `/api/fees/trend` → line chart
- [ ] Implement `/api/blobs/recent` → table/feed
- [ ] Add 30s polling interval
- [ ] Test responsive layout
- [ ] Add error state UI
- [ ] Add loading states

---

## 📚 Reference Links

- **Alloy Docs:** https://alloy-rs.github.io/
- **SQLx:** https://sqlx.rs/
- **Chart.js:** https://www.chartjs.org/
- **EIP-4844:** https://eips.ethereum.org/EIPS/eip-4844
