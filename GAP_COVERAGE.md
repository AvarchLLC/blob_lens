# Gap Coverage: What's Built and Where

This document maps the two core problem statements to the specific charts, components, and pages that address them — useful for pitching, demos, or onboarding contributors.

---

## Gap 1 — Per-Rollup DA Cost-Efficiency Scoring

> *"No public tool computes cost per byte actually used, blob fullness ratios, amortized DA cost per L2 transaction, or blob coordination opportunity scores across rollups."*

### How the score is computed

All scoring lives in `apps/web/src/lib/queries.ts` and runs on ClickHouse via the `blob_transactions` table:

| Metric | Formula |
|---|---|
| **Packing score** | `min(100, avg(num_blobs) / 6.0 × 100)` — rewards rollups that fill the 6-blob tx cap |
| **Timing score** | `clamp(0–100, (1 − cost_per_blob / network_avg_fee) × 50 + 50)` — rewards posting when fees are below average |
| **Efficiency score** | `0.70 × packing + 0.30 × timing` — composite, 0–100 |
| **Cost per blob** | `avg(blob_base_fee)` in Gwei |
| **Cost per byte** | `da_cost_eth / (total_blobs × 128 KB)` — or beacon-sourced `fullness_ratio` when available |

### Charts & components

| Component | File | What it shows |
|---|---|---|
| **Efficiency Scatter** | `charts/EfficiencyScatterplot.tsx` | Packing vs timing 2D scatter, one dot per rollup — quadrant split reveals under-packers vs mistimed posters |
| **Efficiency Leaderboard** | `charts/EfficiencyComparisonTable.tsx` | Sortable table: packing / timing / composite score / cost per blob Gwei / vs network avg |
| **Full Leaderboard** | `components/tables/BlobLeaderboardTable.tsx` | All rollups ranked by blob volume with sparklines, efficiency score column, CSV export |
| **DA Cost Charts** | `charts/DACostCharts.tsx` | Two bar charts: (1) cost per MB in USD, (2) blobfulness ratio — both across top-10 rollups |
| **Submission Timing Heatmap** | `charts/SubmissionTimingHeatmap.tsx` | UTC hour × rollup matrix — reveals which rollups compete for the same fee window |
| **Top DA Performers** | `app/leaderboard/page.tsx` (inline) | Medal cards for top-3 by efficiency score, showing packing/timing breakdown and cost per blob |
| **Mini Leaderboard** | `components/shared/EfficiencyLeaderboardMini.tsx` | Compact 5-row version used on Dashboard → Cost Efficiency tab |

### Where to find it in the UI

| Route | What you see |
|---|---|
| `/da-insights` | **Primary gap page.** All efficiency charts together: scatter, leaderboard table, DA cost bars, submission timing heatmap, per-rollup fee trend, daily volume stacked chart |
| `/leaderboard` | Top-3 DA performer spotlight + full sortable leaderboard with time-window picker (1h / 6h / 24h / 7d) |
| `/dashboard → Cost Efficiency tab` | Efficiency scatterplot + comparison table + mini leaderboard |
| `/rollup/[id] → Benchmarking tab` | Single-rollup deep-dive: packing score, timing score, fee vs network avg, blob activity over time |

---

## Gap 2 — Live Blob Fee Market Health Layer

> *"No public system classifies the current market regime, forecasts congestion from excess_blob_gas accumulation, or pushes threshold alerts to rollup operators."*

### How regime classification works

Classification runs in `apps/web/src/lib/utils.ts → classifyRegime(maxBlobsInBlock)`:

| Regime | Condition (Pectra: target 6, max 9) | Meaning |
|---|---|---|
| **Undersaturated** | max blobs < 3 (< target/2) | Demand well below target — fees near floor |
| **Healthy** | max blobs 3–6 (≤ target) | Supply and demand balanced |
| **Congested** | max blobs 7–8 (> target, < max) | Fee pressure building |
| **Spike** | max blobs = 9 (= max) | Full capacity — fees elevated, competition |

### How congestion forecasting works

`charts/CongestionForecast.tsx` uses the live `excess_blob_gas` from `block_blob_stats` and Ethereum's `fake_exponential` price function to project the blob base fee **4, 8, and 12 slots** forward, then classifies each projected slot into a regime. This is the same math the EL clients use — no heuristic, exact on-chain arithmetic.

### How alerts work

- Rollup operators register a **webhook URL + minimum regime threshold** (Healthy+ / Congested+ / Spike only) via the UI.
- `/api/alerts/check` is called by a background worker every epoch.
- When the live regime meets or exceeds the threshold, a POST is fired to the registered URL with the regime name and timestamp.
- Stored in the `regime_alerts` Postgres table; history is surfaced in the alert panel.

### Charts & components

| Component | File | What it shows |
|---|---|---|
| **Regime Badge** | `components/shared/RegimeBadge.tsx` | Pill badge (Undersaturated / Healthy / Congested / Spike) — persists in App Header and Market page |
| **Regime Heatmap** | `charts/RegimeHeatmap.tsx` | Hour-of-day × day-of-week grid colored by regime — reveals repeating daily congestion patterns |
| **Regime Timeline** | `charts/MarketRegimeTimeline.tsx` | Time series with colored regime bands — shows how state has shifted over a window |
| **Congestion Forecast** | `charts/CongestionForecast.tsx` | 4/8/12 slot fee projection using `fake_exponential` + `excess_blob_gas` |
| **Fee Gauge** | `charts/BlobFeeGauge.tsx` | Arc gauge: current base fee as % of the EIP-4844 fee cap — live on Dashboard |
| **Fee Percentile Bands** | `charts/FeePercentilesChart.tsx` | P25 / P50 / P75 / P95 per hour — wide bands signal uncoordinated, bursty submissions |
| **Slot Utilization** | `charts/SlotUtilizationChart.tsx` | Hourly utilization % trend — the key signal before fees start climbing |
| **Cost Heatmap** | `charts/CostHeatmap.tsx` | Hour-of-day × day-of-week grid colored by avg USD cost — surfaces the cheapest posting windows |
| **Regime Alert Panel** | `components/shared/RegimeAlertPanel.tsx` | Full webhook management UI: add, label, test, delete alerts; shows last-triggered timestamp per alert |
| **Blob Fee Line Chart** | `charts/BlobFeeLineChart.tsx` | Base fee trend in Gwei and USD (dual-axis) over selected time window |

### Where to find it in the UI

| Route | What you see |
|---|---|
| `/da-insights` | **Primary gap page.** Fee market health section: percentile bands, 4–12 slot forecast, fee trend, slot utilization, regime heatmap, cost heatmap, regime timeline, fee-vs-volume scatter. Alert panel in right column. |
| `/market` | Regime badge, fee trend, slot utilization, per-rollup activity, L1 vs blob cost comparison, rollup network graph |
| `/dashboard → Market Health tab` | Fee gauge, regime badge, regime alert panel |
| `/dashboard → Overview tab` | Live block feed + regime badge in the header bar |
| App header (all pages) | Persistent `RegimeBadge` — regime is always visible |

---

## The Unified Page: `/da-insights`

Both gaps are addressed on a single page, organised into two logical halves:

```
/da-insights
├── Orientation strip  ← current regime + key market stats (live)
├── Left column (8/12)
│   └── Blob Fee Market Health  [Gap 2]
│       ├── Fee Percentile Bands
│       ├── 4–12 Slot Congestion Forecast
│       ├── Blob Base Fee Trend
│       ├── Slot Utilisation
│       ├── Regime Heatmap
│       ├── Cumulative Blobs
│       ├── Regime Timeline
│       ├── Fee vs Blob Volume
│       └── Cost Heatmap (cheapest posting window)
├── Right column (4/12)
│   ├── Network Share (donut)   [Gap 1 — attribution context]
│   └── Regime Threshold Alerts [Gap 2 — webhook alert panel]
└── Full-width sections
    ├── Per-Rollup DA Cost Breakdown  [Gap 1]
    │   ├── Hourly Blob Activity by Rollup
    │   ├── Daily Volume Stacked by Rollup
    │   ├── Per-Rollup Fee Trend
    │   ├── Efficiency Scatter (Packing vs Timing)
    │   ├── DA Cost per Rollup (cost/byte + blobfulness)
    │   └── Efficiency Leaderboard Table
    ├── Rollup Submission Timing  [Gap 1 — coordination gap]
    │   └── UTC hour × rollup heatmap
    └── Long-Term Network Trends  [historical context]
        ├── Daily Blob Volume
        └── Daily Avg Blob Cost
```

---

## What's still not fully solved

| Remaining gap | Status |
|---|---|
| **Amortized DA cost per L2 tx** | Needs L2 tx count feed (not in ClickHouse schema yet); current proxy is cost per blob |
| **Blob fullness ratio from beacon** | `fullness_ratio` column exists in Postgres schema but beacon sidecar data is not fully backfilled — shows `null` for older rows |
| **Webhook alert delivery guarantees** | Current worker is a Next.js route handler — not a durable queue; a missed cron call = missed alert |
| **Self-hostable scoring engine** | The scoring runs inside the Next.js app; an API-first standalone binary (`blob-indexer`) would make this truly self-hostable for operators |
