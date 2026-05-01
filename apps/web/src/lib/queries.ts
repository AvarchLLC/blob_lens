import type {
  BlockRow,
  BlobTransaction,
  DailyRollupBlob,
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
      COALESCE(MAX(block_number), 0)      AS last_block,
      COALESCE(
        (SELECT AVG(utilization) * 100
         FROM block_blob_stats
         WHERE created_at > NOW() - INTERVAL '24 hours'),
        0
      )::float8                           AS avg_utilization_24h
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
      COALESCE(AVG(blob_base_fee), 0)::text               AS avg_fee,
      MAX(created_at)                                     AS last_seen
    FROM blob_transactions
    WHERE rollup IS NOT NULL
      AND created_at > NOW() - INTERVAL '1 hour' * ${hours}
    GROUP BY rollup
    ORDER BY total_blobs DESC
  `;
}

export async function getMarketActivity(hours = 24): Promise<MarketHour[]> {
  // Join blob_transactions with block_blob_stats to get:
  //   - avg_fee from real blob_base_fee (not max bid)
  //   - max_blobs_in_block from actual per-block blob count
  //   - avg_utilization across blocks in that hour
  return sql<MarketHour[]>`
    SELECT
      DATE_TRUNC('hour', bt.created_at)::text                             AS hour,
      COUNT(*)::bigint                                                     AS tx_count,
      COALESCE(SUM(bt.num_blobs), 0)::bigint                              AS blob_count,
      COALESCE(AVG(bbs.blob_base_fee), 0)::text                          AS avg_fee,
      COALESCE(MAX(bbs.blob_count), 0)::int                              AS max_blobs_in_block,
      COALESCE(AVG(bbs.utilization) * 100, 0)::float8                    AS avg_utilization
    FROM blob_transactions bt
    LEFT JOIN block_blob_stats bbs ON bt.block_number = bbs.block_number
    WHERE bt.created_at > NOW() - INTERVAL '1 hour' * ${hours}
    GROUP BY DATE_TRUNC('hour', bt.created_at)
    ORDER BY DATE_TRUNC('hour', bt.created_at) ASC
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
      blob_base_fee::text AS blob_base_fee,
      created_at::text    AS created_at
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
      blob_base_fee::text AS blob_base_fee,
      created_at::text    AS created_at
    FROM blob_transactions
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function getRecentBlocks(limit = 20): Promise<BlockRow[]> {
  const rows = await sql`
    SELECT
      bbs.block_number,
      bbs.blob_base_fee::text                                   AS blob_base_fee,
      bbs.blob_gas_used,
      bbs.blob_count,
      ROUND((bbs.utilization * 100)::numeric, 1)::float8        AS utilization,
      COUNT(bt.tx_hash)::int                                    AS tx_count,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT bt.rollup), NULL)         AS rollups,
      bbs.created_at::text                                      AS created_at
    FROM block_blob_stats bbs
    LEFT JOIN blob_transactions bt ON bt.block_number = bbs.block_number
    WHERE bbs.blob_count > 0
    GROUP BY bbs.block_number, bbs.blob_base_fee, bbs.blob_gas_used,
             bbs.blob_count, bbs.utilization, bbs.created_at
    ORDER BY bbs.block_number DESC
    LIMIT ${limit}
  `;
  return rows as unknown as BlockRow[];
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

export async function getDailyRollupBreakdown(
  days = 30,
  topRollups = 16
): Promise<DailyRollupBlob[]> {
  return sql<DailyRollupBlob[]>`
    WITH daily AS (
      SELECT
        DATE_TRUNC('day', created_at)::text             AS day,
        rollup,
        COALESCE(SUM(num_blobs), 0)::bigint             AS blobs
      FROM blob_transactions
      WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
        AND rollup IS NOT NULL
        AND rollup <> 'UNKNOWN'
      GROUP BY DATE_TRUNC('day', created_at), rollup
    ),
    top AS (
      SELECT rollup
      FROM daily
      GROUP BY rollup
      ORDER BY COALESCE(SUM(blobs), 0) DESC
      LIMIT ${topRollups}
    )
    SELECT d.day, d.rollup, d.blobs
    FROM daily d
    JOIN top t ON t.rollup = d.rollup
    ORDER BY d.day ASC, d.rollup ASC
  `;
}
