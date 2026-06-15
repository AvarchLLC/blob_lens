export type MarketRegime = "undersaturated" | "healthy" | "congested" | "spike";

export interface BlobTransaction {
  tx_hash: string;
  block_number: number;
  num_blobs: number;
  rollup: string | null;
  max_fee_per_blob_gas: string;
  blob_base_fee: string;
  created_at: string;
}

export interface LeaderboardRow {
  rollup: string;
  tx_count: number;
  total_blobs: number;
  avg_blobs_per_tx: number;
  avg_fee: string;
  last_seen: string;
  da_cost_eth: number;
  packing_score: number;
  network_share_pct: number;
  /** Avg blob base fee in gwei — reflects block timing choice */
  cost_per_blob_gwei: number;
  /** 0–100: how cost-efficiently they choose submission windows vs network avg */
  timing_score: number;
  /** 0–100 composite: 70% packing + 30% timing */
  efficiency_score: number;
  /** Average blob content fullness 0–100; null until beacon sidecar data is available */
  avg_fullness_pct: number | null;
  /** Number of transactions containing at least one ghost blob (<5% content) */
  ghost_blob_count: number;
  /** Total bytes actually used across all blobs (from beacon sidecar) */
  total_bytes_used: number | null;
  /** DA cost in ETH per KB of blob space actually used; null until beacon data available */
  cost_per_byte_eth: number | null;
  /** Avg co-occurrence weight with peer rollups (0–100); higher = more coordination */
  coordination_score: number | null;
}

export interface ForecastData {
  current_fee_wei: number;
  avg_blob_gas_used: number;
  latest_excess: number;
  sample_size: number;
  /** Positive = excess rising (fee pressure building); negative = falling */
  excess_trend: number;
}

export interface MarketHour {
  hour: string;
  tx_count: number;
  blob_count: number;
  /** Actual blob base fee (wei) averaged across blocks in this hour bucket */
  avg_fee: string;
  /** Real blobs-per-block: MAX(block_blob_stats.blob_count) in this hour */
  max_blobs_in_block: number;
  /** Average blob market utilization 0–100 for this hour (from block_blob_stats) */
  avg_utilization: number;
}

export interface OverviewStats {
  total_txs: number;
  total_blobs: number;
  rollup_count: number;
  last_indexed: string;
  last_block: number;
  avg_utilization_24h: number;
}

export interface SparklinePoint {
  rollup: string;
  hour: string;
  blobs: number;
}

export interface HourlyRollupBlob {
  rollup: string;
  hour: string;
  blobs: number;
}

export interface HourlyRollupValue {
  rollup: string;
  hour: string;
  value: number;
}

export interface DailyRollupBlob {
  day: string;
  rollup: string;
  blobs: number;
}

export interface UnknownSender {
  from_address: string;
  tx_count: number;
  total_blobs: number;
  avg_blobs_per_tx: number;
}

export interface BlockRow {
  block_number: number;
  blob_base_fee: string;
  blob_gas_used: number;
  blob_count: number;
  utilization: number;
  tx_count: number;
  rollups: string[];
  created_at: string;
}

export interface FullnessHistogramBucket {
  bucket_start: number; // 0, 10, 20, … 90
  blob_count: number;
}

export type AlertRegimeThreshold = "healthy" | "congested" | "spike";

export interface RegimeAlert {
  id: number;
  webhook_url: string;
  label: string;
  min_regime: AlertRegimeThreshold;
  last_fired_regime: MarketRegime | null;
  last_fired_at: string | null;
  enabled: boolean;
  created_at: string;
}

export interface RWAToken {
  id: string;
  symbol: string;
  name: string;
  contract_addresses: Record<string, string>;
  decimals: number;
  coingecko_id: string | null;
  price_usd: number | null;
  market_cap_usd: number | null;
  volume_24h_usd: number | null;
  updated_at: string | null;
}

export interface ETHLiquiditySnapshot {
  category: string;
  balance_eth: number;
  balance_usd: number;
  num_addresses: number;
  timestamp: string;
}

export interface WhaleWallet {
  id: string;
  address: string;
  balance_eth: number;
  balance_usd: number;
  label: string | null;
  category: string | null;
  is_verified: boolean;
  is_sanctioned?: boolean;
  last_updated: string;
}

export interface WhaleActivity {
  tx_hash: string;
  from_addr: string;
  to_addr: string;
  amount_eth: number;
  tx_type: string;
  timestamp: string;
}

export interface OFACSanction {
  id: string;
  address: string;
  label: string | null;
  source: string;
  severity: string;
  risk_tags: string[];
  added_at: string;
}

export interface L1Cost {
  block_number: number;
  avg_gwei_per_gas: number;
  avg_usd_per_tx: number;
  avg_usd_per_swap: number;
  timestamp: string;
}

export interface SecurityMetric {
  chain_name: string;
  validator_count: number;
  staking_ratio: number | null;
  avg_stake_eth: number | null;
  sequencer_count: number | null;
  timestamp: string;
}

export interface AIInsight {
  id: string;
  insight_type: string;
  title: string;
  body: string;
  confidence_score: number | null;
  generated_at: string;
}

// ── Transaction Reader ────────────────────────────────────────────────────────

export interface TokenTransfer {
  token_address: string;
  from_address: string;
  to_address: string;
  value: string;
  log_index: number;
}

export interface TxDetail {
  tx_hash: string;
  block_number: number;
  block_timestamp: string;
  from_address: string;
  to_address: string;
  value: string;
  tx_type: number;
  rollup: string | null;
  status: boolean;
  gas_used: number;
  effective_gas_price: number;
  total_fee_wei: string;
  blob_gas_used: number;
  blob_gas_price: number;
  is_blob_tx: boolean;
  num_blobs: number;
  blob_hashes: string[];
  blob_base_fee: string | null;
  token_transfers: TokenTransfer[];
}

export interface AddressSummary {
  address: string;
  tx_total: number;
  tx_sent: number;
  tx_received: number;
  blob_tx_count: number;
  top_rollup: string | null;
  first_seen: string | null;
  last_seen: string | null;
  ofac_flagged: boolean;
  whale_flagged: boolean;
}

export interface AddressTx {
  block_number: number;
  block_timestamp: string;
  tx_hash: string;
  from_address: string;
  to_address: string;
  value: string;
  tx_type: number;
  direction: "in" | "out";
  rollup: string | null;
  status: boolean;
  gas_used: number;
  effective_gas_price: number;
  num_blobs: number;
}

export interface BlockDetail {
  block_number: number;
  block_timestamp: string;
  blob_count: number;
  blob_gas_used: number;
  excess_blob_gas: number;
  blob_base_fee: string;
  utilization: number;
  tx_count: number;
  rollups: string[];
  txs: AddressTx[];
}
