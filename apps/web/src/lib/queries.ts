import type {
  BlockRow,
  BlobTransaction,
  DailyRollupBlob,
  ForecastData,
  FullnessHistogramBucket,
  HourlyRollupBlob,
  HourlyRollupValue,
  LeaderboardRow,
  MarketHour,
  OFACSanction,
  OverviewStats,
  RWAToken,
  ETHLiquiditySnapshot,
  SparklinePoint,
  UnknownSender,
  WhaleWallet,
} from "@/types";
import sql from "./db";

export async function getRWATokens(): Promise<RWAToken[]> {
  try {
    const rows = await sql<RWAToken[]>`
      SELECT 
          t.id::text, t.symbol, t.name, t.contract_addresses, t.decimals, t.coingecko_id,
          p.price_usd::float8, p.market_cap_usd::float8, p.volume_24h_usd::float8, p.timestamp::text as updated_at
      FROM rwa_tokens t
      LEFT JOIN (
          SELECT DISTINCT ON (rwa_token_id) *
          FROM rwa_token_prices
          ORDER BY rwa_token_id, timestamp DESC
      ) p ON t.id = p.rwa_token_id
      ORDER BY p.market_cap_usd DESC NULLS LAST
    `;
    return rows;
  } catch (e) {
    console.error("getRWATokens error (likely table not created yet):", e);
    return [];
  }
}

export async function getETHLiquidity(): Promise<ETHLiquiditySnapshot[]> {
  try {
    const rows = await sql<ETHLiquiditySnapshot[]>`
      SELECT DISTINCT ON (category) 
          category, balance_eth::float8, balance_usd::float8, num_addresses, timestamp::text
      FROM eth_liquidity_snapshot
      ORDER BY category, timestamp DESC
    `;
    return rows;
  } catch (e) {
    console.error("getETHLiquidity error (likely table not created yet):", e);
    return [];
  }
}

export async function getWhales(limit = 100): Promise<WhaleWallet[]> {
  try {
    const rows = await sql<any[]>`
      SELECT 
          w.id::text, w.address, w.balance_eth::float8, w.balance_usd::float8, 
          w.label, w.category, w.is_verified, w.last_updated::text,
          (o.address IS NOT NULL) as is_sanctioned
      FROM whale_wallets w
      LEFT JOIN ofac_sanctions_list o ON w.address = o.address
      ORDER BY w.balance_eth DESC
      LIMIT ${limit}
    `;
    return rows;
  } catch (e) {
    console.error("getWhales error (likely table not created yet):", e);
    return [];
  }
}

export async function getOFACList(): Promise<OFACSanction[]> {
  try {
    const rows = await sql<OFACSanction[]>`
      SELECT id::text, address, label, source, severity, risk_tags, added_at::text
      FROM ofac_sanctions_list
      ORDER BY added_at DESC
    `;
    return rows;
  } catch (e) {
    console.error("getOFACList error (likely table not created yet):", e);
    return [];
  }
}

export async function getL1Costs(days = 30): Promise<L1Cost[]> {
  try {
    const rows = await sql<L1Cost[]>`
      SELECT block_number, avg_gwei_per_gas::float8, avg_usd_per_tx::float8, avg_usd_per_swap::float8, timestamp::text
      FROM l1_transaction_costs
      WHERE timestamp > NOW() - INTERVAL '1 day' * ${days}
      ORDER BY timestamp ASC
    `;
    return rows;
  } catch (e) {
    console.error("getL1Costs error (likely table not created yet):", e);
    return [];
  }
}

export async function getSecurityMetrics(): Promise<SecurityMetric[]> {
  try {
    const rows = await sql<SecurityMetric[]>`
      SELECT chain_name, validator_count, staking_ratio::float8, avg_stake_eth::float8, sequencer_count, timestamp::text
      FROM chain_security_metrics
      ORDER BY validator_count DESC
    `;
    return rows;
  } catch (e) {
    console.error("getSecurityMetrics error (likely table not created yet):", e);
    return [];
  }
}

export async function getAIInsights(type?: string, limit = 10): Promise<AIInsight[]> {
  try {
    const rows = type 
      ? await sql<AIInsight[]>`
          SELECT id::text, insight_type, title, body, confidence_score::float8, generated_at::text
          FROM ai_insights
          WHERE insight_type = ${type}
          ORDER BY generated_at DESC
          LIMIT ${limit}
        `
      : await sql<AIInsight[]>`
          SELECT id::text, insight_type, title, body, confidence_score::float8, generated_at::text
          FROM ai_insights
          ORDER BY generated_at DESC
          LIMIT ${limit}
        `;
    return rows;
  } catch (e) {
    console.error("getAIInsights error (likely table not created yet):", e);
    return [];
  }
}

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
    WITH window_total AS (
      SELECT COALESCE(SUM(num_blobs), 0)::float8 AS total_blobs_all
      FROM blob_transactions
      WHERE rollup IS NOT NULL
        AND created_at > NOW() - INTERVAL '1 hour' * ${hours}
    ),
    -- Network-wide avg blob base fee for timing comparison
    period_stats AS (
      SELECT COALESCE(AVG(
        CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000
             THEN blob_base_fee ELSE NULL END
      ), 1)::float8 AS network_avg_fee
      FROM blob_transactions
      WHERE rollup IS NOT NULL
        AND created_at > NOW() - INTERVAL '1 hour' * ${hours}
    ),
    base AS (
      SELECT
        rollup,
        COUNT(*)::bigint                                    AS tx_count,
        COALESCE(SUM(num_blobs), 0)::bigint                 AS total_blobs,
        COALESCE(AVG(num_blobs), 0)::float8                 AS avg_blobs_per_tx,
        COALESCE(AVG(CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000 THEN blob_base_fee ELSE NULL END), 0)::text AS avg_fee,
        MAX(created_at)                                     AS last_seen,
        COALESCE(
          SUM(num_blobs * CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000 THEN blob_base_fee ELSE 0 END) * 131072.0 / 1e18,
          0
        )::float8                                           AS da_cost_eth,
        LEAST(100, COALESCE(AVG(num_blobs) / 6.0 * 100, 0))::float8 AS packing_score,
        COALESCE(
          SUM(num_blobs)::float8 / NULLIF((SELECT total_blobs_all FROM window_total), 0) * 100,
          0
        )::float8                                           AS network_share_pct,
        -- Avg blob base fee in gwei — reflects which blocks they chose to submit in
        COALESCE(
          AVG(CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000
                   THEN blob_base_fee ELSE NULL END) / 1e9,
          0
        )::float8                                           AS cost_per_blob_gwei,
        -- Beacon sidecar metrics (NULL until indexer collects them)
        (AVG(fullness_ratio) * 100)::float8                 AS avg_fullness_pct,
        COALESCE(SUM(CASE WHEN is_ghost_blob THEN 1 ELSE 0 END), 0)::bigint AS ghost_blob_count,
        -- Cost-per-byte: bytes_used stored by beacon backfill
        NULLIF(SUM(bytes_used), 0)::float8                  AS total_bytes_used,
        CASE
          WHEN NULLIF(SUM(bytes_used), 0) IS NOT NULL
          THEN (
            SUM(num_blobs * CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000 THEN blob_base_fee ELSE 0 END) * 131072.0 / 1e18
          ) / (SUM(bytes_used)::float8 / 1024.0)
          ELSE NULL
        END::float8                                         AS cost_per_byte_eth
      FROM blob_transactions
      WHERE rollup IS NOT NULL
        AND created_at > NOW() - INTERVAL '1 hour' * ${hours}
      GROUP BY rollup
    ),
    -- Per-rollup coordination score: avg co-occurrence weight with all peers
    coordination AS (
      WITH block_rollups AS (
        SELECT block_number, ARRAY_AGG(DISTINCT rollup) AS rollups
        FROM blob_transactions
        WHERE rollup IS NOT NULL AND rollup != 'UNKNOWN'
          AND created_at > NOW() - INTERVAL '1 hour' * ${hours}
        GROUP BY block_number
      ),
      total_blocks AS (
        SELECT COUNT(DISTINCT block_number)::float8 AS cnt
        FROM blob_transactions
        WHERE created_at > NOW() - INTERVAL '1 hour' * ${hours}
      ),
      pairs AS (
        SELECT
          br1.rollup AS rollup,
          COUNT(*)::float8 AS co_count
        FROM (SELECT block_number, unnest(rollups) AS rollup FROM block_rollups) br1
        JOIN (SELECT block_number, unnest(rollups) AS rollup FROM block_rollups) br2
          ON br1.block_number = br2.block_number AND br1.rollup != br2.rollup
        GROUP BY br1.rollup
      )
      SELECT
        rollup,
        LEAST(100, (co_count / NULLIF((SELECT cnt FROM total_blocks), 0) * 100))::float8 AS coordination_score
      FROM pairs
    )
    SELECT
      b.*,
      -- Timing score: 50 = network avg, 100 = cheapest, 0 = 2× avg cost
      LEAST(100, GREATEST(0,
        (1.0 - (b.cost_per_blob_gwei * 1e9)
              / NULLIF((SELECT network_avg_fee FROM period_stats), 1)
        ) * 50.0 + 50.0
      ))::float8                                            AS timing_score,
      -- Composite efficiency: 70% packing + 30% timing
      LEAST(100, GREATEST(0,
        0.70 * b.packing_score +
        0.30 * LEAST(100, GREATEST(0,
          (1.0 - (b.cost_per_blob_gwei * 1e9)
                / NULLIF((SELECT network_avg_fee FROM period_stats), 1)
          ) * 50.0 + 50.0
        ))
      ))::float8                                            AS efficiency_score,
      c.coordination_score
    FROM base b
    LEFT JOIN coordination c ON c.rollup = b.rollup
    ORDER BY total_blobs DESC
  `;
}

export async function getForecastData(): Promise<ForecastData | null> {
  const rows = await sql<ForecastData[]>`
    WITH recent AS (
      SELECT
        block_number,
        excess_blob_gas,
        blob_gas_used,
        ROW_NUMBER() OVER (ORDER BY block_number DESC) AS rn
      FROM block_blob_stats
      ORDER BY block_number DESC
      LIMIT 50
    )
    SELECT
      COALESCE(
        (SELECT blob_base_fee FROM block_blob_stats ORDER BY block_number DESC LIMIT 1),
        0
      )                                              AS current_fee_wei,
      COALESCE(AVG(blob_gas_used), 0)::float8        AS avg_blob_gas_used,
      COALESCE(
        (SELECT excess_blob_gas FROM block_blob_stats ORDER BY block_number DESC LIMIT 1),
        0
      )                                              AS latest_excess,
      COUNT(*)::int                                  AS sample_size,
      -- Trend: latest-10 avg vs prior-10 avg excess (positive = fee pressure building)
      COALESCE(
        AVG(CASE WHEN rn <= 10 THEN excess_blob_gas::float8 END) -
        AVG(CASE WHEN rn > 10 AND rn <= 20 THEN excess_blob_gas::float8 END),
        0
      )::float8                                      AS excess_trend
    FROM recent
  `;
  return rows[0] ?? null;
}

export async function getUnknownSenders(): Promise<UnknownSender[]> {
  return sql<UnknownSender[]>`
    SELECT
      from_address,
      COUNT(*)::bigint                              AS tx_count,
      COALESCE(SUM(num_blobs), 0)::bigint           AS total_blobs,
      ROUND(AVG(num_blobs)::numeric, 2)::float      AS avg_blobs_per_tx
    FROM blob_transactions
    WHERE rollup = 'UNKNOWN'
    GROUP BY from_address
    ORDER BY total_blobs DESC
    LIMIT 10
  `;
}

export async function getAllUnknownSenders(limit = 100): Promise<UnknownSender[]> {
  return sql<UnknownSender[]>`
    SELECT
      from_address,
      COUNT(*)::bigint                              AS tx_count,
      COALESCE(SUM(num_blobs), 0)::bigint           AS total_blobs,
      ROUND(AVG(num_blobs)::numeric, 2)::float      AS avg_blobs_per_tx
    FROM blob_transactions
    WHERE rollup = 'UNKNOWN'
    GROUP BY from_address
    ORDER BY total_blobs DESC
    LIMIT ${limit}
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
      COALESCE(AVG(CASE WHEN bbs.blob_base_fee > 0 AND bbs.blob_base_fee <= 1000000000000000000 THEN bbs.blob_base_fee ELSE NULL END), 0)::text AS avg_fee,
      COALESCE(MAX(bbs.blob_count), 0)::int                              AS max_blobs_in_block,
      COALESCE(AVG(bbs.utilization) * 100, 0)::float8                    AS avg_utilization
    FROM blob_transactions bt
    LEFT JOIN block_blob_stats bbs ON bt.block_number = bbs.block_number
    WHERE bt.created_at > NOW() - INTERVAL '1 hour' * ${hours}
    GROUP BY DATE_TRUNC('hour', bt.created_at)
    ORDER BY DATE_TRUNC('hour', bt.created_at) ASC
  `;
}

export async function getPerRollupFeeActivity(
  rollup: string,
  hours = 24
): Promise<MarketHour[]> {
  // Get hourly average fee for a specific rollup
  return sql<MarketHour[]>`
    SELECT
      DATE_TRUNC('hour', bt.created_at)::text                             AS hour,
      COUNT(*)::bigint                                                     AS tx_count,
      COALESCE(SUM(bt.num_blobs), 0)::bigint                              AS blob_count,
      COALESCE(AVG(CASE WHEN bbs.blob_base_fee > 0 AND bbs.blob_base_fee <= 1000000000000000000 THEN bbs.blob_base_fee ELSE NULL END), 0)::text AS avg_fee,
      COALESCE(MAX(bbs.blob_count), 0)::int                              AS max_blobs_in_block,
      COALESCE(AVG(bbs.utilization) * 100, 0)::float8                    AS avg_utilization
    FROM blob_transactions bt
    LEFT JOIN block_blob_stats bbs ON bt.block_number = bbs.block_number
    WHERE bt.rollup = ${rollup}
      AND bt.created_at > NOW() - INTERVAL '1 hour' * ${hours}
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
      CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000
           THEN blob_base_fee ELSE 0 END::text AS blob_base_fee,
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
      CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000
           THEN blob_base_fee ELSE 0 END::text AS blob_base_fee,
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
      CASE WHEN bbs.blob_base_fee > 0 AND bbs.blob_base_fee <= 1000000000000000000
           THEN bbs.blob_base_fee ELSE 0 END::text             AS blob_base_fee,
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

export async function getHourlyRollupFee(
  hours = 24,
  topN = 10
): Promise<HourlyRollupValue[]> {
  return sql<HourlyRollupValue[]>`
    WITH top_rollups AS (
      SELECT rollup
      FROM blob_transactions
      WHERE created_at > NOW() - INTERVAL '1 hour' * ${hours}
        AND rollup IS NOT NULL AND rollup != 'UNKNOWN'
      GROUP BY rollup
      ORDER BY SUM(num_blobs) DESC
      LIMIT ${topN}
    )
    SELECT
      bt.rollup,
      DATE_TRUNC('hour', bt.created_at)::text AS hour,
      COALESCE(AVG(
        CASE WHEN bbs.blob_base_fee > 0 AND bbs.blob_base_fee < 1000000000000000000
             THEN bbs.blob_base_fee ELSE NULL END
      ), 0)::float8 AS value
    FROM blob_transactions bt
    JOIN top_rollups tr ON tr.rollup = bt.rollup
    LEFT JOIN block_blob_stats bbs ON bbs.block_number = bt.block_number
    WHERE bt.created_at > NOW() - INTERVAL '1 hour' * ${hours}
    GROUP BY bt.rollup, DATE_TRUNC('hour', bt.created_at)
    ORDER BY DATE_TRUNC('hour', bt.created_at) ASC, bt.rollup ASC
  `;
}

export async function getHourlyRollupUtilization(
  hours = 24,
  topN = 10
): Promise<HourlyRollupValue[]> {
  return sql<HourlyRollupValue[]>`
    WITH top_rollups AS (
      SELECT rollup
      FROM blob_transactions
      WHERE created_at > NOW() - INTERVAL '1 hour' * ${hours}
        AND rollup IS NOT NULL AND rollup != 'UNKNOWN'
      GROUP BY rollup
      ORDER BY SUM(num_blobs) DESC
      LIMIT ${topN}
    )
    SELECT
      bt.rollup,
      DATE_TRUNC('hour', bt.created_at)::text AS hour,
      (SUM(bt.num_blobs)::float8
        / (COUNT(DISTINCT bt.block_number) * 9.0) * 100) AS value
    FROM blob_transactions bt
    JOIN top_rollups tr ON tr.rollup = bt.rollup
    WHERE bt.created_at > NOW() - INTERVAL '1 hour' * ${hours}
    GROUP BY bt.rollup, DATE_TRUNC('hour', bt.created_at)
    ORDER BY DATE_TRUNC('hour', bt.created_at) ASC, bt.rollup ASC
  `;
}

export async function getHourlyRollupActivity(
  hours = 24,
  topN = 10
): Promise<HourlyRollupBlob[]> {
  return sql<HourlyRollupBlob[]>`
    WITH top_rollups AS (
      SELECT rollup
      FROM blob_transactions
      WHERE created_at > NOW() - INTERVAL '1 hour' * ${hours}
        AND rollup IS NOT NULL
        AND rollup != 'UNKNOWN'
      GROUP BY rollup
      ORDER BY SUM(num_blobs) DESC
      LIMIT ${topN}
    )
    SELECT
      bt.rollup,
      DATE_TRUNC('hour', bt.created_at)::text AS hour,
      SUM(bt.num_blobs)::bigint               AS blobs
    FROM blob_transactions bt
    JOIN top_rollups tr ON tr.rollup = bt.rollup
    WHERE bt.created_at > NOW() - INTERVAL '1 hour' * ${hours}
    GROUP BY bt.rollup, DATE_TRUNC('hour', bt.created_at)
    ORDER BY DATE_TRUNC('hour', bt.created_at) ASC, bt.rollup ASC
  `;
}

export interface RollupNetworkNode {
  name: string;
  value: number; // blob count
  efficiency: number; // 0-100
  avgFeeGwei: number;
  txCount: number;
  costEth: number;
}

export interface RollupNetworkEdge {
  source: string;
  target: string;
  weight: number; // co-occurrence strength 0-100
}

export interface RollupNetworkGraph {
  nodes: RollupNetworkNode[];
  edges: RollupNetworkEdge[];
}

export async function getRollupNetworkGraph(hours = 24): Promise<RollupNetworkGraph> {
  // Get rollup metrics for nodes
  const nodesData = await sql<RollupNetworkNode[]>`
    SELECT
      rollup::text                                        AS name,
      COALESCE(SUM(num_blobs), 0)::bigint                AS value,
      COALESCE(
        LEAST(100, GREATEST(0,
          0.70 * LEAST(100, COALESCE(AVG(num_blobs) / 6.0 * 100, 0)) +
          0.30 * LEAST(100, GREATEST(0,
            (1.0 - (COALESCE(AVG(CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000 THEN blob_base_fee ELSE NULL END), 0) * 1e9)
                  / NULLIF((SELECT COALESCE(AVG(CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000 THEN blob_base_fee ELSE NULL END), 1) FROM blob_transactions WHERE created_at > NOW() - INTERVAL '1 hour' * ${hours}), 1)
            ) * 50.0 + 50.0
          ))
        ))
      )::float8                                           AS efficiency,
      COALESCE(
        AVG(CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000 THEN blob_base_fee ELSE NULL END) / 1e9,
        0
      )::float8                                           AS avgFeeGwei,
      COUNT(*)::int                                       AS txCount,
      COALESCE(
        SUM(num_blobs * CASE WHEN blob_base_fee > 0 AND blob_base_fee <= 1000000000000000000 THEN blob_base_fee ELSE 0 END) * 131072.0 / 1e18,
        0
      )::float8                                           AS costEth
    FROM blob_transactions
    WHERE rollup IS NOT NULL
      AND rollup != 'UNKNOWN'
      AND created_at > NOW() - INTERVAL '1 hour' * ${hours}
    GROUP BY rollup
    HAVING SUM(num_blobs) > 0
    ORDER BY SUM(num_blobs) DESC
  `;

  // Get edges: co-occurrence in same blocks (transaction flow)
  const edgesData = await sql<Array<{ source: string; target: string; weight: number }>>`
    WITH block_rollups AS (
      SELECT
        block_number,
        ARRAY_AGG(DISTINCT rollup) AS rollups
      FROM blob_transactions
      WHERE rollup IS NOT NULL
        AND rollup != 'UNKNOWN'
        AND created_at > NOW() - INTERVAL '1 hour' * ${hours}
      GROUP BY block_number
    ),
    -- Unnest to get all rollup pairs in same block
    rollup_pairs AS (
      SELECT
        br1.rollup AS source,
        br2.rollup AS target,
        COUNT(*) AS co_occurrence
      FROM (
        SELECT block_number, unnest(rollups) AS rollup FROM block_rollups
      ) br1
      JOIN (
        SELECT block_number, unnest(rollups) AS rollup FROM block_rollups
      ) br2
        ON br1.block_number = br2.block_number
        AND br1.rollup < br2.rollup
      GROUP BY br1.rollup, br2.rollup
    )
    SELECT
      source,
      target,
      LEAST(100, (co_occurrence::float8 / (SELECT COUNT(DISTINCT block_number) FROM blob_transactions WHERE created_at > NOW() - INTERVAL '1 hour' * ${hours}) * 100))::float8 AS weight
    FROM rollup_pairs
    ORDER BY weight DESC
  `;

  return {
    nodes: nodesData,
    edges: edgesData,
  };
}

export async function getFullnessHistogram(days = 7): Promise<FullnessHistogramBucket[]> {
  return sql<FullnessHistogramBucket[]>`
    SELECT
      (FLOOR(fullness_ratio * 10) * 10)::int AS bucket_start,
      COUNT(*)::bigint                        AS blob_count
    FROM blob_transactions
    WHERE fullness_ratio IS NOT NULL
      AND created_at > NOW() - INTERVAL '1 day' * ${days}
    GROUP BY bucket_start
    ORDER BY bucket_start ASC
  `;
}
