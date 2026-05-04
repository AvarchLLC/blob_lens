# BlobLens — TODO

## P0 · Blob Usage Tracking (not yet implemented)

Right now the indexer captures what *senders offer* to pay and how many blobs are in a transaction.
It does **not** capture what Ethereum *actually charges* or how full the blob market is.
These are the three missing pieces that make "blob usage" analytics real.

---

### 1. Capture `blobBaseFee` per block from the execution header

**What it is:**
The actual base fee burned per unit of blob gas. Derived from `excess_blob_gas` in the block header
using EIP-4844's exponential pricing formula. This is the market-clearing price every blob tx pays —
completely different from `max_fee_per_blob_gas` (which is just the sender's ceiling bid).

**Why it matters:**
- Every chart that says "avg fee" is currently showing the average *max bid*, not the fee actually paid.
  A sender willing to pay 100 gwei may have only paid 2 gwei if the base fee was 2 gwei that block.
- The base fee is the signal that tells you whether the blob market is cheap or expensive right now.

**Where to get it (Rust / Alloy):**
```rust
// already available in the block header you fetch in blob_parser.rs:
let blob_base_fee: u128 = block.header.blob_fee().unwrap_or(0);
// blob_fee() implements EIP-4844 §§ fake exponential formula over excess_blob_gas
```

**DB change needed:**
```sql
ALTER TABLE blob_transactions
  ADD COLUMN blob_base_fee BIGINT;          -- actual fee per blob gas unit, that block

-- also worth a per-block summary table:
CREATE TABLE IF NOT EXISTS block_blob_stats (
  block_number  BIGINT PRIMARY KEY,
  blob_base_fee BIGINT  NOT NULL,           -- wei per blob gas
  blob_gas_used INT     NOT NULL,           -- 0, 131072, 262144 … 786432
  blob_count    INT     NOT NULL,           -- blob_gas_used / 131072
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

**Frontend impact:**
- Fix the "Avg Fee" stat card and all fee charts to use `blob_base_fee` instead of `max_fee_per_blob_gas`.
- Add a "Fee paid" column to the tx table: `blob_base_fee × num_blobs × 131072 / 1e18` ETH.

---

### 2. Capture `blob_gas_used` per block → derive real blobs/block

**What it is:**
`blob_gas_used` is in the execution block header. Each blob consumes exactly 131,072 blob gas,
so `blob_count_in_block = blob_gas_used / 131072`.

**Why it matters:**
The current `max_blobs_in_block` field is `MAX(num_blobs)` per tx per hour — that is the most
blobs in a *single transaction*, not the total blobs in a block. If a block has 4 transactions
each carrying 1 blob, `max_blobs_in_block = 1` even though the block used 4 of 6 blob slots.
Every regime classification (Undersaturated / Healthy / Congested / Spike) is wrong because of this.

**Where to get it:**
```rust
let blob_gas_used: u64 = block.header.blob_gas_used.unwrap_or(0);
let blob_count_in_block: u32 = (blob_gas_used / 131_072) as u32;
// EIP-4844 target: 3 blobs (393_216 gas), max: 6 blobs (786_432 gas)
```

**DB change needed:**
Add to `block_blob_stats` above (same migration). Also backfill `blob_transactions` with a
`blob_count_in_block` column if you want per-tx context, or join through `block_number`.

**Frontend impact:**
- Fix `classifyRegime()` in `utils.ts` to use real blobs-per-block instead of `max_blobs_in_block`.
- Fix the "Blobs per Block" chart to plot actual block-level counts.
- Fix the Regime Heatmap and Timeline.

---

### 3. Add blob utilization rate

**What it is:**
`utilization = blob_count_in_block / 6` — how full each block's blob capacity was.
Ranges 0–100%. Target is 50% (3/6 blobs). Above 50% means demand exceeds target and base fee rises.

**Why it matters:**
This is the single most useful number for understanding the blob fee market. It tells you
at a glance whether blobs are cheap (utilization < 50%) or expensive (utilization → 100%).

**Where to compute it:**
Derived from `blob_gas_used`: `utilization = blob_gas_used / 786_432.0` (max blob gas per block).
No additional RPC call needed — already available from change #2.

**DB change:**
Store as a float in `block_blob_stats`:
```sql
ALTER TABLE block_blob_stats
  ADD COLUMN utilization FLOAT NOT NULL DEFAULT 0;
-- = blob_gas_used / 786432.0
```

**Frontend impact:**
- New stat card: "Avg Utilization (24h)" with a % value.
- New chart: Utilization over time (0–100% bar or area chart, with 50% target line).
- Overlay utilization on the existing Blobs per Block chart as a secondary axis.

---

## P1 · Other tracked items

- [ ] **Rollup registry gaps** — Some transactions show as UNKNOWN because their sequencer address
      isn't in `rollup_registry.rs`. Add a periodic diff: log UNKNOWN `to_address` values that appear
      more than N times so they can be manually attributed.

- [ ] **Historical backfill** — The indexer only captures blocks from the moment it starts.
      Add a backfill task (separate binary or CLI flag) to replay historical blocks via
      `eth_getBlockByNumber` from a given start block.

- [ ] **Blob content size / fill rate** — Each blob is exactly 128 KB but senders don't have to fill it.
      Actual data density requires fetching blob sidecars from the beacon chain
      (`/eth/v1/beacon/blob_sidecars/{slot}`). Deferred — needs beacon node access.

- [ ] **Gas price correlation** — Store `base_fee_per_gas` (EIP-1559) alongside `blob_base_fee`
      to show correlation between L1 congestion and blob demand.

- [ ] **Alert / webhook** — Emit a webhook or Slack message when utilization exceeds 80% for
      3 consecutive blocks (spike warning).
