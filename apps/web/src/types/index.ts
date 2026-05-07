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
}

export interface ForecastData {
  current_fee_wei: number;
  avg_blob_gas_used: number;
  latest_excess: number;
  sample_size: number;
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

export interface DailyRollupBlob {
  day: string;
  rollup: string;
  blobs: number;
}

export interface UnknownSender {
  from_address: string;
  tx_count: number;
  total_blobs: number;
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
