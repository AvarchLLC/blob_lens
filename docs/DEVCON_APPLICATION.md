# Devcon Supporter & Impact Booth Application: BlobLens

This document contains the refined application content for BlobLens's Devcon Supporter and Impact Booth submission, along with technical context to support the application.

---

## 1. Why do you want to be a Devcon Supporter?

**BlobLens** is a governance-grade analytics platform built for the most consequential phase of Ethereum’s roadmap: the scaling of the data availability (DA) layer. While EIP-4844 introduced blobs, the upcoming transitions (Pectra, PeerDAS, and Fusaka) require deep, real-time visibility into how the fee market evolves. We don't just track transaction counts; we index every block via a custom **Reth Execution Extension (ExEx)** to calculate sophisticated health metrics like **Rollup Packing Scores**, **Submission Timing Efficiency**, and **Market Regime Classification**. 

Devcon is the epicenter of the rollup ecosystem. Being a Supporter allows us to put these high-signal analytics—ranging from blob utilization to OFAC compliance and RWA tracking—directly into the hands of the researchers and engineers building the next generation of Ethereum. We want to ensure that as Ethereum scales, the data driving its economic and technical decisions remains transparent, open-source, and accessible to everyone.

---

## 2. Impact Booth: Project Description & Connection to Ethereum

**BlobLens** is a fully open-source (FOSS) public infrastructure project dedicated to Ethereum's DA layer. While many explorers provide surface-level data, BlobLens dives into the "why" behind blob market dynamics. Our technical stack is built for extreme performance and transparency: a custom **Reth v2.2.0 binary** with an embedded **ExEx** that streams data directly into **ClickHouse** for sub-millisecond analytical queries.

Beyond simple fee tracking, BlobLens surfaces unique datasets critical for the ecosystem:
*   **DA Efficiency:** We analyze blob sidecars to identify "ghost blobs" (empty blobs) and calculate actual byte-level utilization vs. capacity.
*   **Market Regimes:** We track fee dynamics across protocol epochs (Dencun → Pectra → Fusaka), providing historical context for target vs. max blob utilization.
*   **Whale & RWA Indexing:** We monitor the on-chain movement of high-net-worth entities and Real World Asset (RWA) tokens to understand their impact on the L1 fee market.
*   **Security & Compliance:** Real-time OFAC sanction syncing and sequencer/validator count tracking for major L2s.

By providing this data for free and keeping the entire stack open, we support the Ethereum community's commitment to decentralization and informed protocol governance.

---

## 3. Impact Booth: Use of Space

The booth will serve as a **"Live DA War Room."** We will run real-time visualizations of the blob fee market, featuring:
*   **Rollup Leaderboards:** Live rankings based on **Packing Scores** (how well they fill blobs) and **Timing Efficiency** (how well they navigate fee spikes).
*   **Ghost Blob Detection:** A deep-dive explorer into empty blob submissions and their impact on network congestion.
*   **Market Regime Heatmaps:** Visualizing how the network behaves as it approaches the target blob count (e.g., the jump from 3 to 6 target blobs in Pectra).
*   **Coordination Graph:** A network graph showing how rollups "overlap" in blocks, revealing hidden patterns in submission coordination.

We will also use the space to host **"Feedback Sprints"** with rollup teams, asking: *"What metrics do you need to optimize your DA spend?"* Our goal is to transform the booth into an active research hub where the community can shape the future of Ethereum's DA analytics.

---

## Technical Appendix (For Reference)

### Core Architecture
- **Execution Layer:** Custom Reth v2.2.0 node with an embedded **Execution Extension (ExEx)** for real-time indexing.
- **Data Storage:** 
    - **ClickHouse:** Used for high-throughput blockchain data (blocks, transactions, receipts, logs) and specialized blob tables.
    - **PostgreSQL:** Stores enriched data including Whale wallet labels, RWA token prices, OFAC sanctions, and AI-generated insights.
- **Frontend:** Next.js 16 (React 19, Tailwind v4, shadcn/ui) providing sub-second dashboard updates via ClickHouse columnar queries.

### Key Metrics Tracked
- **Packing Score:** `(avg(num_blobs) / 6.0) * 100`. Measures how effectively a rollup utilizes the blob space it purchases.
- **Timing Score:** Analyzes `cost_per_blob_gwei` against the `network_avg_fee` to determine if a rollup is overpaying for inclusion.
- **Efficiency Score:** A weighted metric (70% Packing + 30% Timing) used to rank rollup DA operations.
- **Market Activity:** Hourly breakdowns of utilization, max blobs per block, and fee percentiles (P25, P50, P75, P95).
- **Epoch Tracking:** Dedicated tracking for Dencun, Pectra, and Fusaka target/max blob parameters.

### Enriched Data Services
- **Whale Indexer:** Tracks high-balance Ethereum wallets and their interaction with L2s.
- **RWA Tracker:** Real-time indexing of Real World Asset tokens and their liquidity snapshots.
- **Compliance Sync:** Automated OFAC list integration to flag sanctioned addresses interacting with the DA layer.
- **AI Analyst:** Confidence-scored insights generated from on-chain activity trends.
