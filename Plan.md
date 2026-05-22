# BlobLens Feature Expansion Roadmap

## Context

BlobLens is an EIP-4844 blob analytics platform tracking rollup efficiency, DA costs, and network dynamics. The current system indexes blob transactions via Alchemy WebSocket → PostgreSQL, exposes them through a Next.js frontend with SSR + SWR polling.

This roadmap expands beyond EIP-4844 blob data into broader Ethereum ecosystem intelligence: RWA valuations, ETH distribution, whale activity, regulatory compliance, L1 security metrics, and AI-driven research. These features deepen the "Protocol Intelligence" positioning but require new data sources and UI expansion.

---

## Feature Breakdown & Implementation Plan

### PHASE 1: Foundational Features (Weeks 1-4) — COMPLETE

#### Feature 1A: RWA Token Valuation (Week 1-2) — DONE

**Goal**: Track USD value of Real-World Asset tokens across different chains (Ethereum, Arbitrum, Base, etc.).

**Architecture**:

1. **Backend Changes** (Rust):
   - Add new `rwa_tokens` table to PostgreSQL:
     ```sql
     CREATE TABLE rwa_tokens (
       id UUID PRIMARY KEY,
       symbol VARCHAR UNIQUE,
       name VARCHAR,
       contract_addresses JSONB,  -- { "ethereum": "0x...", "arbitrum": "0x...", ... }
       decimals INT,
       coingecko_id VARCHAR,      -- for live price feed
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP
     );
     
     CREATE TABLE rwa_token_prices (
       id UUID PRIMARY KEY,
       rwa_token_id UUID REFERENCES rwa_tokens(id),
       chain VARCHAR,
       price_usd DECIMAL(18, 8),
       market_cap_usd DECIMAL(28, 2),
       volume_24h_usd DECIMAL(28, 2),
       timestamp TIMESTAMP DEFAULT NOW()
     );
     ```
   - Create `src/services/rwa_indexer.rs`:
     - Fetch RWA token list (static seed: USDT, USDC, AAPL, GOOG, etc.)
     - Poll CoinGecko API every 60 seconds for price updates
     - Query on-chain balances via RPC `eth_call` (ERC-20 `totalSupply`, optional per-chain balance)
     - Insert into `rwa_token_prices` table
   - Add HTTP endpoint: `GET /api/rwa/tokens` → list with latest prices & market caps
   - Add endpoint: `GET /api/rwa/chain-distribution` → price breakdown by chain

2. **Frontend Changes** (Next.js):
   - Create `/rwa` page (new route):
     - Query `rwa_token_prices` grouped by chain
     - Display table: Symbol, Price, 24h Volume, Market Cap, Chain Breakdown
     - Chart: Line chart showing price trends over 30 days (add timestamp filtering to query)
   - Add to navigation sidebar under "Market Intelligence"
   - Revalidate: 60s (live pricing)

3. **Data Source**:
   - CoinGecko API (free tier allows ~30 RWA tokens)
   - RPC calls for on-chain verification (optional, high cost)
   - **Seed tokens**: USDT, USDC, USDP, TUSD, AAPL-tokenized, GOOG-tokenized (Usual Finance, iExec, etc.)

4. **Frontend Component**:
   - Reuse: `MetricCard.tsx` for KPI display
   - Reuse: `RollupActivityLineChart.tsx` pattern for time-series
   - New: `RWADistributionChart.tsx` (bar chart: chain vs. USD value)

**Effort**: ~8 hours (3h backend indexer, 2h DB schema, 2h frontend, 1h testing)

---

#### Feature 1B: ETH Liquidity Distribution (Week 2-3) — DONE

**Goal**: Chart ETH holdings by category (staked, enterprise, personal wallets, CEX holdings, etc.).

**Architecture**:

1. **Backend Changes** (Rust):
   - Add `eth_liquidity_categories` table:
     ```sql
     CREATE TABLE eth_liquidity_categories (
       id UUID PRIMARY KEY,
       category VARCHAR,           -- "staked", "enterprise", "personal", "cex", "bridge", "contract"
       address_list TEXT[],         -- hardcoded list of addresses
       description VARCHAR,
       created_at TIMESTAMP DEFAULT NOW()
     );
     
     CREATE TABLE eth_liquidity_snapshot (
       id UUID PRIMARY KEY,
       category VARCHAR,
       balance_eth DECIMAL(28, 8),
       balance_usd DECIMAL(28, 2),
       num_addresses INT,
       timestamp TIMESTAMP DEFAULT NOW()
     );
     ```
   - Create `src/services/eth_distribution.rs`:
     - Hardcode category → address mappings (Lido staking, MakerDAO treasury, Binance wallet, etc.)
     - Poll RPC `eth_getBalance` for each address category (batch calls every 1 hour)
     - Calculate aggregate balance per category
     - Fetch ETH/USD price, convert to USD
     - Insert into `eth_liquidity_snapshot`
   - Add endpoint: `GET /api/eth-distribution` → categories with balances & percentages

2. **Frontend Changes** (Next.js):
   - Create `/eth-liquidity` page:
     - Query latest `eth_liquidity_snapshot` snapshot
     - Display:
       - Donut chart: Category breakdown (% of total ETH)
       - Table: Category, ETH amount, USD value, # of addresses
       - Small line chart: 30-day trend per category
   - Add to sidebar under "Market Intelligence"
   - Revalidate: 1 hour (batch balance fetches)

3. **Data Source**:
   - Ethereum RPC (`eth_getBalance`)
   - Hardcoded address lists (Staking pools, CEX wallets, known enterprises)
   - **Categories to track**:
     - Staked (Lido, Rocket Pool, solo stakers)
     - Enterprise (MakerDAO, Aave, Curve treasuries)
     - Centralized Exchange (Binance, Kraken, Coinbase hot wallets)
     - Bridges (Stargate, Across)
     - Personal/Unknown (sampled; statistical model)
     - Contract (other smart contracts)

4. **Frontend Component**:
   - Reuse: `RollupShareDonut.tsx` pattern
   - New: `ETHDistributionDonut.tsx`
   - Reuse: `RollupActivityLineChart.tsx` for trend

**Effort**: ~12 hours (3h backend indexer, 2h DB, 3h frontend, 2h address curation, 2h testing)

---

### PHASE 2: Wallet & Compliance Features (Weeks 3-6)

#### Feature 2A: Wallet Ranking ("Whale Watch") (Week 3-4) — IN PROGRESS

**Goal**: Interactive page ranking wallets by ETH holdings; gamified, fun presentation.

**Architecture**:

1. **Backend Changes** (Rust):
   - Add `whale_wallets` table:
     ```sql
     CREATE TABLE whale_wallets (
       id UUID PRIMARY KEY,
       address VARCHAR UNIQUE,
       balance_eth DECIMAL(28, 8),
       balance_usd DECIMAL(28, 2),
       label VARCHAR,             -- "Vitalik", "Binance", "Unknown Whale #1", etc.
       category VARCHAR,           -- "founder", "exchange", "whale", "contract", "unknown"
       first_seen TIMESTAMP,
       last_updated TIMESTAMP DEFAULT NOW(),
       is_verified BOOLEAN,        -- user-community flagged
       community_tags TEXT[]       -- ["early_adopter", "whale", "builder"]
     );
     
     CREATE TABLE whale_wallet_snapshots (
       id UUID PRIMARY KEY,
       address VARCHAR REFERENCES whale_wallets(address),
       balance_eth DECIMAL(28, 8),
       rank INT,
       timestamp TIMESTAMP DEFAULT NOW()
     );
     
     CREATE TABLE whale_activity_log (
       id UUID PRIMARY KEY,
       address VARCHAR,
       tx_hash VARCHAR,
       from_addr VARCHAR,
       to_addr VARCHAR,
       amount_eth DECIMAL(28, 8),
       tx_type VARCHAR,           -- "buy", "sell", "transfer", "stake", "unstake"
       timestamp TIMESTAMP
     );
     ```
   - Create `src/services/whale_indexer.rs`:
     - Poll top 10,000 Ethereum addresses by balance (via third-party API: Etherscan, Infura, or historical sync)
     - Fetch `eth_getBalance` for each
     - Classify via heuristics + manual labels (Vitalik, exchanges, staking pools, etc.)
     - Insert into `whale_wallets` and `whale_wallet_snapshots`
     - Track large transfers: indexing all Type 2+ tx → `whale_activity_log` (detect whale movement)
   - Add endpoints:
     - `GET /api/whale-watch?limit=100&sort=balance` → leaderboard
     - `GET /api/whale-watch/{address}` → details (balance history, activity feed)
     - `GET /api/whale-watch/{address}/activity` → recent transfers

2. **Frontend Changes** (Next.js):
   - Create `/whale-watch` page:
     - **Leaderboard table**: Rank, Address/Label, Balance (ETH), Balance (USD), Change 24h (%), Category Badge
     - **Interactive**: Click row → detail modal or new page
     - **Filters**: Category, balance range, verified status
     - **Search**: Address or label
   - Create `/whale-watch/[address]` detail page:
     - Profile card (balance, ETH change, category, tags)
     - "Activity Feed" tab: recent transfers (Type 2+ txs with amount)
     - "Correlation" tab: co-movements with other whales (shared transaction signatures, adjacent addresses)
     - "Prediction" tab (later): ML forecast of next movement
   - Add to sidebar under "Developer" or new "Whale Watch" section
   - Revalidate: 5 minutes (balance snapshots), 1 minute (activity log)

3. **Data Source**:
   - Etherscan API (top addresses by balance) or sync from historical node data
   - Ethereum RPC (`eth_getBalance`, transaction tracing)
   - Manual labeling + community crowdsourcing (UI form to tag wallets)

4. **Frontend Components**:
   - New: `WhaleLeaderboardTable.tsx` (interactive table with sorting/filtering)
   - New: `WhaleDetailCard.tsx` (profile, stats)
   - New: `WhaleActivityFeed.tsx` (transaction list with filtering)
   - Reuse: `MetricCard.tsx` for balance display

**Effort**: ~20 hours (4h backend indexer, 3h DB, 4h frontend leaderboard, 3h detail page, 2h activity feed, 2h labeling system, 2h testing)

**Note**: Requires external data source for top addresses (Etherscan API, or re-index from scratch — expensive).

---

#### Feature 2B: OFAC List (Week 4-5) — DONE

**Goal**: Comprehensive, community-driven list of sanctioned wallets with filtering, warnings, and compliance checks.

**Architecture**:

1. **Backend Changes** (Rust):
   - Add `ofac_sanctions_list` table:
     ```sql
     CREATE TABLE ofac_sanctions_list (
       id UUID PRIMARY KEY,
       address VARCHAR UNIQUE,
       label VARCHAR,             -- "Tornado Cash", "Lazarus Group", etc.
       source VARCHAR,            -- "official_ofac", "chainalysis", "community", "user_report"
       severity VARCHAR,          -- "high", "medium", "low"
       risk_tags TEXT[],          -- ["mixer", "hacker", "sanctioned_entity"]
       added_at TIMESTAMP DEFAULT NOW(),
       verified_by UUID,          -- user ID or NULL if official
       community_votes INT DEFAULT 0
     );
     
     CREATE TABLE ofac_sanctions_history (
       id UUID PRIMARY KEY,
       address VARCHAR,
       action VARCHAR,            -- "added", "removed", "flagged", "verified"
       actor_type VARCHAR,        -- "system", "community", "moderator"
       timestamp TIMESTAMP DEFAULT NOW()
     );
     ```
   - Create `src/services/ofac_sync.rs`:
     - Fetch official OFAC list (government source or OFAC API)
     - Fetch Chainalysis sanctions data (API or CSV export)
     - Merge with community-submitted addresses from Next.js form
     - Upsert into `ofac_sanctions_list` with source attribution
     - Run on startup + daily refresh
   - Add endpoints:
     - `GET /api/ofac/check?address=0x...` → boolean + details
     - `GET /api/ofac/list?limit=1000&sort=severity` → full list
     - `POST /api/ofac/report` → community report form submission (with rate limiting)

2. **Frontend Changes** (Next.js):
   - Create `/compliance/ofac` page:
     - **Search bar**: "Check if address is sanctioned"
     - **OFAC List table**: Address, Label, Severity (color-coded), Source, Risk Tags, Community Vote Count
     - **Filters**: Source, Severity, Risk Tag
     - **Community Panel**: "Report New Address" form
       - Input: Address, Label, Risk Tag, Evidence Link
       - Submission logged, displayed with (unverified) badge
       - Moderators can promote to verified
   - Add warning banner to `/whale-watch` leaderboard if any whale is on OFAC list (red flag)
   - Add to sidebar under "Developer" or "Compliance"
   - Revalidate: Daily (official sources) + Real-time (community submissions)

3. **Data Source**:
   - Official OFAC SDN list (FinCEN, Treasury Department)
   - Chainalysis sanctions API (paid) or free CSV
   - Community submissions via form (moderation queue)

4. **Frontend Components**:
   - New: `OFACSearchBox.tsx`
   - New: `OFACSanctionsList.tsx`
   - New: `OFACReportForm.tsx`
   - Reuse: `RegimeAlertPanel.tsx` pattern for warning display

**Effort**: ~16 hours (2h backend sync, 2h DB, 3h frontend list, 3h search/detail, 2h community form, 2h moderation UI, 2h testing)

---

### PHASE 3: L1 & Advanced Features (Weeks 5-8) — COMPLETE

#### Feature 3A: L1 Transaction Cost (Week 5-6) — DONE

**Goal**: Add Ethereum L1 transaction cost data to L2 cost comparison chart. Contextualize L2 efficiency gains.

**Architecture**:

1. **Backend Changes** (Rust):
   - Add `l1_transaction_costs` table:
     ```sql
     CREATE TABLE l1_transaction_costs (
       id UUID PRIMARY KEY,
       block_number BIGINT UNIQUE,
       avg_gwei_per_gas DECIMAL(18, 8),
       avg_usd_per_tx DECIMAL(18, 2),    -- standard ETH transfer (21,000 gas)
       avg_usd_per_swap DECIMAL(18, 2),  -- typical Uniswap swap (100,000 gas)
       timestamp TIMESTAMP DEFAULT NOW()
     );
     ```
   - Create `src/services/l1_cost_tracker.rs`:
     - On each block indexed, fetch `eth_gasPrice` (or use median from last 12 blocks)
     - Compute standard costs:
       - ETH transfer: 21,000 gas × gasPrice × ETH/USD
       - Swap: 100,000 gas × gasPrice × ETH/USD
       - Contract deploy: 200,000 gas × gasPrice × ETH/USD
     - Insert into `l1_transaction_costs`
   - Add endpoint: `GET /api/l1-costs?days=30` → daily averages

2. **Frontend Changes** (Next.js):
   - Update existing `/market` page (or new `/market/l1-comparison`):
     - Add row in cost comparison table: "L1 ETH Transfer" vs "L2 Rollup TX"
     - Add line chart overlay: L1 cost trend + L2 cost trend (dual axis)
     - Calculate & display savings: "L2 is 50x cheaper than L1 on average"
   - Update `/rollup/[id]` detail page:
     - Add metric: "DA Cost vs L1 Transfer" (e.g., "This rollup pays 2% of an L1 transfer cost")
   - Revalidate: 60 seconds (per-block basis)

3. **Data Source**:
   - Ethereum RPC `eth_gasPrice` (on-chain)
   - CoinGecko ETH/USD price

4. **Frontend Components**:
   - Reuse: `RollupActivityLineChart.tsx` for dual-axis chart
   - New: `L1CostComparisonTable.tsx`

**Effort**: ~10 hours (2h backend indexer, 1.5h DB, 2h frontend page, 2h charts, 1.5h testing)

---

#### Feature 3B: L1 Security (Week 6-7) — DONE

**Goal**: Compare validator counts, staking ratios, and security metrics between Ethereum L1 and L2s.

**Architecture**:

1. **Backend Changes** (Rust):
   - Add `chain_security_metrics` table:
     ```sql
     CREATE TABLE chain_security_metrics (
       id UUID PRIMARY KEY,
       chain_name VARCHAR,        -- "ethereum", "arbitrum", "base", etc.
       validator_count INT,
       staking_ratio DECIMAL(5, 2),  -- % of total supply staked
       avg_stake_eth DECIMAL(18, 2),
       tss_threshold INT,         -- threshold for validators (e.g., 2/3)
       sequencer_decentralization DECIMAL(5, 2), -- % for L2s (how many sequencers)
       timestamp TIMESTAMP DEFAULT NOW()
     );
     ```
   - Create `src/services/security_metrics.rs`:
     - **L1 (Ethereum)**:
       - Fetch validator count from Beacon API endpoint: `/eth/v1/beacon/states/head/validators`
       - Calculate staking ratio: staked ETH / 120M (total supply)
       - Store daily snapshot
     - **L2s (Base, Arbitrum, OP, etc.)**:
       - Fetch sequencer set size (hardcoded per L2)
       - Query Lido/staking contracts for staking ratio (if applicable)
       - Fetch validator count from L2 Beacon (if applicable)
     - Insert into `chain_security_metrics` daily
   - Add endpoint: `GET /api/security-comparison` → all chains with metrics

2. **Frontend Changes** (Next.js):
   - Create `/research/security` page:
     - **Bar chart**: Validator count comparison (Ethereum vs Top 10 L2s)
     - **Line chart**: Staking ratio trend (30 days)
     - **Table**: Chain, Validator Count, Staking Ratio (%), Sequencer Count, Avg Stake (ETH), Security Score (0-100)
     - **Analysis panel**: "Ethereum has 1M validators vs Base's 10 sequencers" (narrative insight)
   - Add to sidebar under "Research"
   - Revalidate: Daily (batch Beacon API calls)

3. **Data Source**:
   - Ethereum Beacon API (`/eth/v1/beacon/states/head/validators`)
   - L2-specific APIs (if available) or hardcoded sequencer lists
   - Staking contract queries (Lido, Rocket Pool)

4. **Frontend Components**:
   - New: `SecurityComparisonChart.tsx` (bar chart: validators by chain)
   - New: `StakingRatioChart.tsx` (line chart: staking % trend)
   - New: `SecurityMetricsTable.tsx`
   - Reuse: existing chart styles

**Effort**: ~14 hours (3h backend Beacon API polling, 2h DB, 2h frontend page, 2h charts, 2h data curation, 2h testing, 1h Beacon API latency optimization)

---

### PHASE 4: AI-Driven Intelligence (Week 7-8) — COMPLETE

#### Feature 4: AI-Driven Data Insights (Week 7-8) — DONE

**Goal**: Research and present data insights using AI. Generate weekly reports, anomaly detection, forecasting.

**Architecture**:

1. **Backend Changes** (Rust + Claude API):
   - Add `ai_insights` table:
     ```sql
     CREATE TABLE ai_insights (
       id UUID PRIMARY KEY,
       insight_type VARCHAR,      -- "weekly_report", "anomaly", "forecast", "trend"
       title VARCHAR,
       body TEXT,                 -- markdown format
       data_context JSONB,        -- raw metrics used for analysis
       confidence_score DECIMAL(3, 2), -- 0.0-1.0
       generated_at TIMESTAMP DEFAULT NOW(),
       published BOOLEAN DEFAULT TRUE
     );
     ```
   - Create `src/services/ai_analyst.rs`:
     - Weekly cron job (Sunday 00:00 UTC):
       - Query past 7 days of leaderboard, market activity, regime data
       - Construct prompt with metrics, charts URLs, top rollups
       - Call Claude API with context window (Sonnet 4.6 for cost efficiency)
       - Parse response as insight (title, body, key findings)
       - Insert into `ai_insights` table
     - Budget optimization for <$10/month:
       - Only weekly reports (≈ $0.05 per call, 4-5 calls/month = $0.20-0.25)
       - Skip real-time anomaly detection (expensive with high call volume)
       - Skip forecasting (save for future enhancement)
   - Add endpoint: `GET /api/ai-insights?type=weekly_report&limit=10` → recent insights

2. **Frontend Changes** (Next.js):
   - Create `/research/ai-insights` page:
     - **Filter tabs**: All, Weekly Report, Anomalies, Forecasts, Trends
     - **Insight cards**: Title, excerpt (first 200 chars), generated date, confidence badge
     - Click → full modal or detail page with full markdown body
     - **Live anomaly panel** (sidebar or banner): "Alert: Fee spike detected 2 hours ago"
   - Add insight cards to `/` homepage (pinned: latest weekly report + current anomalies)
   - Add subscribe form for email notifications on anomalies
   - Revalidate: Weekly for reports, 1 hour for anomalies, 5 min for forecasts

3. **Claude API Integration**:
   - Use Anthropic SDK (`@anthropic-ai/sdk`)
   - Model: `claude-opus-4-7` (latest, best reasoning for analysis)
   - System prompt template:
     ```
     You are a blockchain analyst specializing in EIP-4844 blob market dynamics.
     You have access to real-time data on rollup activity, DA costs, and Ethereum network state.
     Generate concise, actionable insights for a technical audience.
     
     [Insert weekly metrics: top rollups, fee trends, utilization, anomalies]
     
     Provide:
     1. Key finding (1 sentence)
     2. Supporting data (2-3 bullet points)
     3. Implications for rollups & Ethereum
     4. 7-day forecast
     ```
   - Rate limit: 1 weekly report call, 10-20 anomaly calls/week (keep costs low)
   - Cache queries (CoinGecko, DB aggregations) to minimize token usage

4. **Data Source**:
   - All existing BlobLens database metrics
   - Claude API (insight generation)

5. **Frontend Components**:
   - New: `AIInsightCard.tsx` (insight summary)
   - New: `AIInsightDetail.tsx` (full markdown rendering)
   - New: `AIInsightFilters.tsx`
   - New: `AnomalyAlertBanner.tsx` (live alerts)
   - Reuse: `MetricCard.tsx` for confidence badges

**Effort**: ~12 hours (2h backend Rust service, 1.5h Claude API integration (Sonnet only), 1.5h DB schema, 2.5h frontend insight page, 2h detail view, 1h testing, 1.5h prompt refinement)

---

## Implementation Timeline

```
Week 1-2: RWA Token Valuation
  ├─ Backend: CoinGecko indexer, DB schema, endpoints
  └─ Frontend: /rwa page, revalidate 60s

Week 2-3: ETH Liquidity Distribution
  ├─ Backend: Balance polling, category definitions
  └─ Frontend: /eth-liquidity page, donut chart, trends

Week 3-5: Whale Watch (parallel indexing + UI)
  ├─ Backend: Historical address indexing (2-3 weeks, running in background)
  ├─ DB: whale_wallets, activity snapshots
  └─ Frontend: Leaderboard (UI ready, populates as indexing completes), detail page

Week 4-5: OFAC List
  ├─ Backend: OFAC sync (official + community)
  ├─ Frontend: /compliance/ofac, search, warnings
  └─ Moderation system

Week 5-6: L1 Transaction Cost
  ├─ Backend: L1 cost tracking per block
  └─ Frontend: Cost comparison chart on /market, /rollup/[id]

Week 6-7: L1 Security
  ├─ Backend: Beacon API polling, validator counts
  └─ Frontend: /research/security page, comparative charts

Week 7-8: AI-Driven Insights (weekly reports only)
  ├─ Backend: Claude API (Sonnet 4.6) for weekly synthesis
  ├─ Frontend: /research/ai-insights, insight cards
  └─ Self-hosted email notification system

Total Effort: ~95 hours (including 2-3 weeks of background indexing for whale watch)
```

---

## Technical Decisions & Tradeoffs

### 1. Data Source for Whale Watch
- **Option A**: Use Etherscan API (top 10K addresses by balance)
  - Pro: Reliable, no indexing needed
  - Con: API cost, rate limits (paid tier ~$1k+/month for production)
- **Option B (Chosen)**: Full historical indexing
  - Pro: Self-contained, low cost, one-time effort
  - Con: 2-3 weeks to sync all Ethereum addresses, disk space (500GB+)
  - Implementation: Index all historical Type 2+ txs with `from` address, aggregate balances, rank by net outflow vs. inflow

### 2. OFAC Community Moderation
- **Option A (Chosen)**: Simple voting system (community votes, moderator override)
  - Pro: Scalable, decentralized feel
  - Con: Spam risk, requires moderation
- **Option B**: Whitelist only (only verified submissions)
  - Pro: Higher signal, less spam
  - Con: Slower to add addresses

### 3. AI Insight Frequency
- **Option A (Chosen)**: Weekly reports + real-time anomalies + daily forecasts
  - Pro: Regular content, live alerts
  - Con: Claude API cost ($0.03/weekly report, $0.01/anomaly = ~$10-20/month if many anomalies)
- **Option B**: Weekly only
  - Pro: Lower cost
  - Con: Stale during high-activity periods

### 4. L1 Security Data
- **Option A (Chosen)**: Beacon API for validator count, hardcoded sequencer lists for L2s
  - Pro: Accurate for L1, sufficient for L2 security profile
  - Con: L2 data may become stale
- **Option B**: Full L2 Beacon indexing
  - Pro: Complete coverage
  - Con: Each L2 has different consensus (Arbitrum = AnyTrust, OP = EOA, etc.), complex integration

---

## Database Schema Summary

```
PHASE 1:
  ├─ rwa_tokens
  ├─ rwa_token_prices
  ├─ eth_liquidity_categories
  └─ eth_liquidity_snapshot

PHASE 2:
  ├─ whale_wallets
  ├─ whale_wallet_snapshots
  ├─ whale_activity_log
  ├─ ofac_sanctions_list
  └─ ofac_sanctions_history

PHASE 3:
  ├─ l1_transaction_costs
  └─ chain_security_metrics

PHASE 4:
  └─ ai_insights
```

---

## Frontend Sidebar Navigation Updates

```
New Top-Level Sections:
├─ Overview (existing)
├─ Live Data (existing)
├─ Market Intelligence (existing) + NEW:
│  ├─ RWA Valuation (/rwa)
│  ├─ ETH Liquidity (/eth-liquidity)
│  └─ Whale Watch (/whale-watch)
├─ Research (existing) + NEW:
│  ├─ Security Comparison (/research/security)
│  └─ AI Insights (/research/ai-insights)
└─ Developer (existing) + NEW:
   ├─ OFAC List (/compliance/ofac)
   └─ API Docs (link)
```

---

## Testing Strategy

### Unit Tests
- RWA indexer: Mock CoinGecko API, test price aggregation
- ETH distribution: Mock RPC calls, test balance categorization
- Whale indexer: Mock Etherscan API, test address classification
- OFAC sync: Test list merge logic, community vote logic
- L1 cost tracker: Mock gas price fetches, cost calculations
- Security metrics: Mock Beacon API, validator aggregation
- AI insights: Mock Claude API, test prompt generation

### Integration Tests
- End-to-end: Database → indexer → API → frontend
- Real API calls to CoinGecko, Beacon (staging env)
- Claude API integration (test with small context)

### E2E Frontend Tests
- Leaderboard sorting/filtering
- Whale detail page loading
- OFAC search and reporting
- Insight reading and filtering

---

## Deployment Checklist

- [ ] Add environment variables: `ETHERSCAN_API_KEY`, `COINGECKO_API_KEY`, `CLAUDE_API_KEY`, `OFAC_MODERATOR_EMAIL`
- [ ] Create new database tables (migrations)
- [ ] Deploy backend services (Docker image rebuild)
- [ ] Deploy frontend changes (Vercel)
- [ ] Seed initial data (RWA tokens, OFAC list, whale addresses)
- [ ] Test all endpoints in staging
- [ ] Monitor indexer performance (DB query times)
- [ ] Set up email notifications (SendGrid or similar)
- [ ] Create moderator dashboard for OFAC approvals
- [ ] Monitor Claude API usage (cost tracking)

---

## Success Metrics

1. **RWA Valuation**: 100+ RWA tokens tracked, sub-60s price update lag
2. **ETH Distribution**: <1% variance vs. off-chain sources, 6-hour data freshness
3. **Whale Watch**: 10K top wallets indexed, activity feed lag <10 minutes
4. **OFAC List**: 1000+ addresses, 95%+ accuracy on known sanctions
5. **L1 Cost Tracking**: sub-minute update lag, within 1% of Etherscan estimates
6. **Security Metrics**: Daily updates, <5% deviation from official Beacon data
7. **AI Insights**: Weekly reports generated, community engagement >50% read rate

---

## Open Questions for User Clarification

1. **Whale Watch indexing scope**: Should we index all Ethereum addresses (full ledger) or only top 100K by transaction count?
2. **OFAC moderation**: How many moderators? Email-based approval or web UI?
3. **L2 security data**: Should we integrate with L2 Beacon APIs (if they exist) or stick to hardcoded sequencer counts?
4. **Email infrastructure**: Use existing sendmail server, or set up new SMTP relay (SendGrid requires $$)?
