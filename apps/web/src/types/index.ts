export type MarketRegime = "undersaturated" | "healthy" | "congested" | "spike";

export interface BlobTransaction {
  tx_hash: string;
  block_number: number;
  num_blobs: number;
  rollup: string | null;
  max_fee_per_blob_gas: string;
  created_at: string;
}

export interface LeaderboardRow {
  rollup: string;
  tx_count: number;
  total_blobs: number;
  avg_blobs_per_tx: number;
  avg_fee: string;
  last_seen: string;
}

export interface MarketHour {
  hour: string;
  tx_count: number;
  blob_count: number;
  avg_fee: string;
  max_blobs_in_block: number;
}

export interface OverviewStats {
  total_txs: number;
  total_blobs: number;
  rollup_count: number;
  last_indexed: string;
  last_block: number;
}

export interface SparklinePoint {
  rollup: string;
  hour: string;
  blobs: number;
}
