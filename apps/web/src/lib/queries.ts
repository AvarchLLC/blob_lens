import type {
  BlobTransaction,
  LeaderboardRow,
  MarketHour,
  OverviewStats,
  SparklinePoint,
} from "@/types";
import sql from "./db";

export async function getOverviewStats(): Promise<OverviewStats> {
  const rows = await sql<OverviewStats[]>`
    SELECT
      COUNT(*)::bigint                    AS total_txs,
      COALESCE(SUM(num_blobs), 0)::bigint AS total_blobs,
      COUNT(DISTINCT rollup)::bigint      AS rollup_count,
      MAX(created_at)                     AS last_indexed,
      COALESCE(MAX(block_number), 0)      AS last_block
    FROM blob_transactions
  `;
  return rows[0];
}

export async function getLeaderboard(hours = 24): Promise<LeaderboardRow[]> {
  return sql<LeaderboardRow[]>`
    SELECT
      rollup,
      COUNT(*)::bigint                                    AS tx_count,
      COALESCE(SUM(num_blobs), 0)::bigint                 AS total_blobs,
      COALESCE(AVG(num_blobs), 0)::float8                 AS avg_blobs_per_tx,
      COALESCE(AVG(CAST(max_fee_per_blob_gas AS BIGINT))::float8, 0)::text AS avg_fee,
      MAX(created_at)                                     AS last_seen
    FROM blob_transactions
    WHERE rollup IS NOT NULL
      AND created_at > NOW() - INTERVAL '1 hour' * ${hours}
    GROUP BY rollup
    ORDER BY total_blobs DESC
  `;
}

export async function getMarketActivity(hours = 24): Promise<MarketHour[]> {
  return sql<MarketHour[]>`
    SELECT
      DATE_TRUNC('hour', created_at)::text            AS hour,
      COUNT(*)::bigint                                 AS tx_count,
      COALESCE(SUM(num_blobs), 0)::bigint              AS blob_count,
      COALESCE(AVG(CAST(max_fee_per_blob_gas AS BIGINT))::float8, 0)::text AS avg_fee,
      COALESCE(MAX(num_blobs), 0)::int                 AS max_blobs_in_block
    FROM blob_transactions
    WHERE created_at > NOW() - INTERVAL '1 hour' * ${hours}
    GROUP BY DATE_TRUNC('hour', created_at)
    ORDER BY DATE_TRUNC('hour', created_at) ASC
  `;
}

export async function getRollupTransactions(
  rollupId: string
): Promise<BlobTransaction[]> {
  return sql<BlobTransaction[]>`
    SELECT
      tx_hash,
      block_number,
      num_blobs,
      rollup,
      max_fee_per_blob_gas,
      created_at::text AS created_at
    FROM blob_transactions
    WHERE rollup = ${rollupId}
    ORDER BY created_at DESC
    LIMIT 500
  `;
}

export async function getLatestBlobs(limit = 20): Promise<BlobTransaction[]> {
  return sql<BlobTransaction[]>`
    SELECT
      tx_hash,
      block_number,
      num_blobs,
      rollup,
      max_fee_per_blob_gas,
      created_at::text AS created_at
    FROM blob_transactions
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function getRollupSparklines(): Promise<SparklinePoint[]> {
  return sql<SparklinePoint[]>`
    SELECT
      rollup,
      DATE_TRUNC('hour', created_at)::text AS hour,
      SUM(num_blobs)::bigint               AS blobs
    FROM blob_transactions
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND rollup IS NOT NULL
    GROUP BY rollup, DATE_TRUNC('hour', created_at)
    ORDER BY rollup, DATE_TRUNC('hour', created_at) ASC
  `;
}
