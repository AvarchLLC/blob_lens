# BlobLens — Feature Progress & ETA

_Last updated: 2026-05-13_

---

## Problem Statements

Two capability gaps define the roadmap for this project:

**Gap 1 — Per-rollup DA cost-efficiency scoring**
No public tool computes cost per byte actually used, blob fullness ratios, amortized DA cost per L2 transaction, or blob coordination opportunity scores across rollups. The goal: a self-hostable efficiency scoring engine updated every epoch, and a public rollup leaderboard queryable by researchers and operators.

**Gap 2 — Live blob fee market health layer**
No public system classifies the current market regime, forecasts congestion from excess_blob_gas accumulation, or pushes threshold alerts to rollup operators. The goal: a real-time regime classifier (undersaturated / healthy / congested / spike), a 4–12 slot congestion forecast, and a webhook alert system for rollup teams.

---

## Gap 1: Per-rollup DA Cost-Efficiency Scoring

### Status: ~65% complete

| Feature | Status | Where |
|---|---|---|
| Blob fullness ratios | **Done** | `fullness_ratio` stored per-tx via Beacon API (`beacon.rs`); `avg_fullness_pct` in leaderboard query (`queries.ts:78`) |
| Ghost blob detection | **Done** | `is_ghost_blob` flag stored per-tx; backfill binary at `apps/api/src/bin/backfill_beacon.rs` |
| Packing score | **Done** | `packing_score = avg_blobs_per_tx / 6 × 100`, computed in SQL (`queries.ts:66`) |
| Timing score | **Done** | `timing_score` = how cheaply a rollup picks submission windows vs. network avg fee (`queries.ts:89`) |
| Composite efficiency score | **Done** | `efficiency_score = 70% packing + 30% timing` (0–100), shown in `BlobLeaderboardTable` |
| DA cost in ETH per rollup | **Done** | `da_cost_eth = SUM(blobs × base_fee × 131072) / 1e18`, in leaderboard |
| Sortable leaderboard + CSV export | **Done** | `/leaderboard` page with all efficiency columns, CSV download |
| Efficiency glow in network graph | **Done** | `RollupNetworkGraphD3` node border color = efficiency tier |
| **Cost per byte actually used** | **Missing** | `bytes_used` is in DB but `da_cost_eth / bytes_used` ratio is not surfaced in any query or UI column |
| **Public REST API for leaderboard** | **Missing** | Scoring is embedded in the dashboard UI. The Rust API at `:8080` is not documented as the public consumer endpoint; no versioned JSON endpoint for external queries |
| **Amortized DA cost per L2 transaction** | **Blocked** | Requires L2 transaction count per rollup — not in current schema, no external data source wired in |
| **Blob coordination opportunity scores** | **Not built** | Network graph shows co-occurrence but produces no scored metric; needs metric definition |
| **Self-hostable scoring engine** | **Not built** | Scoring logic is embedded in Next.js SQL queries, not a standalone queryable service or epoch-updated feed |

### Remaining work

| Task | Effort |
|---|---|
| Add `cost_per_byte` column to leaderboard query + UI | ~2h |
| Expose `/api/leaderboard` as documented public JSON endpoint | ~4h |
| Define and implement blob coordination opportunity score | ~8h |
| L2 tx amortized cost (needs external data source decision first) | TBD |
| Self-hostable scoring engine / Docker-composable export | ~1d |

---

## Gap 2: Live Blob Fee Market Health Layer

### Status: ~90% complete

| Feature | Status | Where |
|---|---|---|
| Regime classifier (4 states) | **Done** | `classifyRegime()` in `utils.ts`; states: undersaturated / healthy / congested / spike based on `max_blobs_in_block` |
| Regime heatmap (7d × 24h) | **Done** | `RegimeHeatmap` on `/market` and `/research` |
| Regime timeline strip | **Done** | `MarketRegimeTimeline` on `/`, `/market`, `/research` |
| 4–12 slot congestion forecast | **Done** | `CongestionForecast` uses exact EIP-4844 formula at +4 / +8 / +12 / +25 / +50 blocks; `excess_blob_gas` slope adjusts projected utilization |
| Regime alert panel (UI) | **Done** | `RegimeAlertPanel` on `/market` — CRUD for webhook URLs, threshold levels (Healthy+ / Congested+ / Spike), 1-minute cooldown |
| Webhook alert firing | **Done** | `POST /api/alerts/check` fires webhooks when regime crosses threshold and changed since last fire; payload includes regime, fee_gwei, avg_blobs_per_block, timestamp |
| Fee pressure indicator | **Done** | Rising / Stable / Falling label with color in `CongestionForecast` header |
| **Persistent background alert worker** | **Missing** | Alert check is browser-triggered — `RegimeAlertPanel.tsx:50–51` polls `/api/alerts/check` every 30s only while the panel is open. If no browser session is active, no webhooks fire. Not a true push system for operators. |

### Remaining work

| Task | Effort |
|---|---|
| Server-side background worker for alert polling (Next.js cron route or Rust task) | ~4h |

---

## Project Timeline

```
Phase 1 — Foundation                                        COMPLETE
─────────────────────────────────────────────────────────────────────
✅ Rust blob indexer (WebSocket → Postgres)
✅ Rollup attribution (~50 sequencer addresses)
✅ Schema: blob_transactions + block_blob_stats + blob_hashes
✅ Beacon API sidecar fetch + encoding detection
✅ bytes_used + fullness_ratio + ghost blob detection

Phase 2 — Dashboard Core                                    COMPLETE
─────────────────────────────────────────────────────────────────────
✅ Overview page (gauge, fee chart, cost heatmap, live feed)
✅ Leaderboard (sortable, sparklines, CSV export)
✅ Market page (regime heatmap, fee trend, utilization, scatter)
✅ Research page (30d charts, market share donut, growth)
✅ Per-rollup page (stats, heatmap, tx table, blob viewer)
✅ Light/dark theme, mobile nav

Phase 3 — Efficiency Scoring (Gap 1)                        ~65% DONE
─────────────────────────────────────────────────────────────────────
✅ Packing score (avg blobs/tx ÷ 6)
✅ Timing score (fee vs. network avg)
✅ Composite efficiency score (70/30 weighted)
✅ DA cost in ETH per rollup
✅ Fullness ratio per blob
✅ Ghost blob flag
❌ Cost-per-byte metric                               ~2h remaining
❌ Public REST API for leaderboard                    ~4h remaining
❌ Blob coordination opportunity score                ~8h remaining
❌ Amortized DA cost per L2 tx                        BLOCKED
❌ Self-hostable scoring engine                       ~1d remaining

Phase 4 — Market Health Layer (Gap 2)                       ~90% DONE
─────────────────────────────────────────────────────────────────────
✅ Regime classifier (4 states)
✅ Congestion forecast (EIP-4844 formula, 4-50 blocks)
✅ Webhook alert panel + CRUD
✅ Alert firing with threshold + cooldown logic
❌ Persistent server-side alert worker                ~4h remaining
```

---

## ETA Summary

| Item | Effort | Priority |
|---|---|---|
| Cost-per-byte metric in leaderboard | ~2h | High — closes the most cited gap claim |
| Persistent alert background worker | ~4h | High — makes alerts work without a browser open |
| Public documented REST API endpoint | ~4h | Medium — needed for "self-hostable / queryable by researchers" claim |
| Blob coordination opportunity score | ~8h | Medium — needs metric definition first |
| Self-hostable scoring engine (Docker) | ~1d | Low — nice-to-have for operator adoption |
| Amortized DA cost per L2 tx | TBD | Blocked on external L2 tx count data source |

**To fully close Gap 2:** ~4h (one persistent worker task).

**To fully close Gap 1 (excluding blocked item):** ~3–4 days of implementation.

---

## What's Not Feasible Without External Data

**Amortized DA cost per L2 transaction** requires knowing how many L2 user transactions each rollup batched into a given blob submission. This data is not available on L1 and would require:
- Pulling L2 transaction counts from each rollup's own RPC or a sequencer API
- Or decoding the blob payload (rollup-specific encoding per OP-Stack / Arbitrum / zkSync formats)

This is a non-trivial integration and is not estimated until a data source decision is made.

---

## Tech Debt & Known Gaps

- Historical data before indexer fix (post-Pectra) has `blob_base_fee = 0` — charts render `—` for those rows.
- No historical backfill for old blocks; indexer only captures live data from startup.
- UNKNOWN bucket is ~9% of blobs; registry expansion is the highest-leverage data quality fix.
- Blob content viewer requires a reachable Beacon API (`BEACON_RPC_URL` or `ALCHEMY_KEY`).
- `STATUS.md` last updated 2026-05-01 and is now significantly out of date vs. shipped features.
