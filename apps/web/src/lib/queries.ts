import type {
  AIInsight,
  BlockRow,
  BlobTransaction,
  DailyRollupBlob,
  ForecastData,
  FullnessHistogramBucket,
  HourlyRollupBlob,
  HourlyRollupValue,
  L1Cost,
  LeaderboardRow,
  MarketHour,
  OFACSanction,
  OverviewStats,
  RWAToken,
  ETHLiquiditySnapshot,
  SecurityMetric,
  SparklinePoint,
  UnknownSender,
  WhaleWallet,
} from "@/types";
import sql from "./db";
import ch from "./clickhouse";

// ── Postgres queries (api_v1 data) ──────────────────────────────────────────

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

// ── ClickHouse queries (blob data from apps/indexer) ────────────────────────

export async function getOverviewStats(): Promise<OverviewStats> {
  const result = await ch.query({
    query: `
      SELECT
        count()                      AS total_txs,
        sum(num_blobs)               AS total_blobs,
        uniqExact(rollup)            AS rollup_count,
        toString(max(block_timestamp)) AS last_indexed,
        max(block_number)            AS last_block,
        (
          SELECT avg(utilization) * 100
          FROM ethereum.blocks FINAL
          WHERE is_deleted = 0
            AND blob_count > 0
            AND timestamp > now() - toIntervalHour(24)
        ) AS avg_utilization_24h
      FROM ethereum.transactions FINAL
      WHERE is_deleted = 0 AND tx_type = 3
    `,
    format: "JSONEachRow",
  });
  const rows = await result.json<OverviewStats>();
  return rows[0];
}

export async function getLeaderboard(hours = 24): Promise<LeaderboardRow[]> {
  const result = await ch.query({
    query: `
      SELECT
        b.rollup,
        b.tx_count,
        b.total_blobs,
        b.avg_blobs_per_tx,
        b.avg_fee,
        toString(b.last_seen_ts) AS last_seen,
        b.da_cost_eth,
        b.packing_score,
        b.total_blobs / greatest(wt.total_blobs_all, 1) * 100 AS network_share_pct,
        b.cost_per_blob_gwei,
        NULL AS avg_fullness_pct,
        0    AS ghost_blob_count,
        NULL AS total_bytes_used,
        NULL AS cost_per_byte_eth,
        least(100, greatest(0,
          (1.0 - b.cost_per_blob_gwei * 1e9 / greatest(na.network_avg_fee, 1)) * 50.0 + 50.0
        )) AS timing_score,
        least(100, greatest(0,
          0.70 * b.packing_score + 0.30 * least(100, greatest(0,
            (1.0 - b.cost_per_blob_gwei * 1e9 / greatest(na.network_avg_fee, 1)) * 50.0 + 50.0
          ))
        )) AS efficiency_score,
        0.0 AS coordination_score
      FROM (
        SELECT
          rollup,
          count()                                        AS tx_count,
          sum(num_blobs)                                 AS total_blobs,
          avg(num_blobs)                                 AS avg_blobs_per_tx,
          toString(toUInt64(ifNotFinite(avgIf(toFloat64(blob_base_fee), blob_base_fee < 1000000000000000000), 0.0))) AS avg_fee,
          max(block_timestamp)                           AS last_seen_ts,
          sum(if(blob_base_fee < 1000000000000000000, toFloat64(num_blobs) * toFloat64(blob_base_fee), 0)) * 131072.0 / 1e18 AS da_cost_eth,
          least(100, avg(num_blobs) / 6.0 * 100)        AS packing_score,
          ifNotFinite(avgIf(toFloat64(blob_base_fee), blob_base_fee < 1000000000000000000), 0.0) / 1e9 AS cost_per_blob_gwei
        FROM ethereum.transactions FINAL
        WHERE is_deleted = 0 AND tx_type = 3 AND rollup != ''
          AND block_timestamp > now() - toIntervalHour({hours:UInt32})
        GROUP BY (rollup)
      ) b
      CROSS JOIN (
        SELECT sum(num_blobs) AS total_blobs_all
        FROM ethereum.transactions FINAL
        WHERE is_deleted = 0 AND tx_type = 3 AND rollup != ''
          AND block_timestamp > now() - toIntervalHour({hours:UInt32})
      ) wt
      CROSS JOIN (
        SELECT avgIf(toFloat64(blob_base_fee), blob_base_fee < 1000000000000000000) AS network_avg_fee
        FROM ethereum.transactions FINAL
        WHERE is_deleted = 0 AND tx_type = 3 AND rollup != ''
          AND block_timestamp > now() - toIntervalHour({hours:UInt32})
      ) na
      ORDER BY total_blobs DESC
    `,
    format: "JSONEachRow",
    query_params: { hours },
  });
  return result.json<LeaderboardRow>();
}

export async function getForecastData(): Promise<ForecastData | null> {
  const result = await ch.query({
    query: `
      SELECT
        maxIf(toFloat64(blob_base_fee), rn = 1)     AS current_fee_wei,
        avg(blob_gas_used)                           AS avg_blob_gas_used,
        maxIf(toFloat64(excess_blob_gas), rn = 1)   AS latest_excess,
        count()                                      AS sample_size,
        avgIf(toFloat64(excess_blob_gas), rn <= 10) -
        avgIf(toFloat64(excess_blob_gas), rn > 10 AND rn <= 20) AS excess_trend
      FROM (
        SELECT
          blob_base_fee,
          blob_gas_used,
          excess_blob_gas,
          row_number() OVER (ORDER BY number DESC) AS rn
        FROM ethereum.blocks FINAL
        WHERE is_deleted = 0 AND blob_count > 0
        ORDER BY number DESC
        LIMIT 50
      )
    `,
    format: "JSONEachRow",
  });
  const rows = await result.json<ForecastData>();
  return rows[0] ?? null;
}

export async function getUnknownSenders(): Promise<UnknownSender[]> {
  const result = await ch.query({
    query: `
      SELECT
        from_address,
        count()               AS tx_count,
        sum(num_blobs)        AS total_blobs,
        round(avg(num_blobs), 2) AS avg_blobs_per_tx
      FROM ethereum.transactions FINAL
      WHERE is_deleted = 0 AND tx_type = 3 AND rollup = 'UNKNOWN'
      GROUP BY from_address
      ORDER BY total_blobs DESC
      LIMIT 10
    `,
    format: "JSONEachRow",
  });
  return result.json<UnknownSender>();
}

export async function getAllUnknownSenders(limit = 100): Promise<UnknownSender[]> {
  const result = await ch.query({
    query: `
      SELECT
        from_address,
        count()               AS tx_count,
        sum(num_blobs)        AS total_blobs,
        round(avg(num_blobs), 2) AS avg_blobs_per_tx
      FROM ethereum.transactions FINAL
      WHERE is_deleted = 0 AND tx_type = 3 AND rollup = 'UNKNOWN'
      GROUP BY from_address
      ORDER BY total_blobs DESC
      LIMIT {limit:UInt32}
    `,
    format: "JSONEachRow",
    query_params: { limit },
  });
  return result.json<UnknownSender>();
}

export async function getMarketActivity(hours = 24): Promise<MarketHour[]> {
  const result = await ch.query({
    query: `
      SELECT
        toString(toStartOfHour(bt.block_timestamp))                   AS hour,
        count()                                                        AS tx_count,
        sum(bt.num_blobs)                                              AS blob_count,
        toString(toUInt64(ifNotFinite(avgIf(toFloat64(bbs.blob_base_fee), bbs.blob_base_fee > 0 AND bbs.blob_base_fee < 1000000000000000000), 0.0))) AS avg_fee,
        max(bbs.blob_count)                                            AS max_blobs_in_block,
        round(avg(bbs.blob_gas_used / if(bbs.block_number >= 22431084, 1179648.0, 786432.0)) * 100, 2) AS avg_utilization
      FROM ethereum.transactions AS bt FINAL
      LEFT JOIN (
        SELECT number AS block_number, blob_base_fee, blob_count, ifNull(blob_gas_used, 0) AS blob_gas_used
        FROM ethereum.blocks FINAL
        WHERE is_deleted = 0
      ) bbs ON bbs.block_number = bt.block_number
      WHERE bt.is_deleted = 0 AND bt.tx_type = 3
        AND bt.block_timestamp > now() - toIntervalHour({hours:UInt32})
      GROUP BY toStartOfHour(bt.block_timestamp)
      ORDER BY toStartOfHour(bt.block_timestamp) ASC
    `,
    format: "JSONEachRow",
    query_params: { hours },
  });
  return result.json<MarketHour>();
}

export async function getPerRollupFeeActivity(
  rollup: string,
  hours = 24
): Promise<MarketHour[]> {
  const result = await ch.query({
    query: `
      SELECT
        toString(toStartOfHour(bt.block_timestamp))                   AS hour,
        count()                                                        AS tx_count,
        sum(bt.num_blobs)                                              AS blob_count,
        toString(toUInt64(ifNotFinite(avgIf(toFloat64(bbs.blob_base_fee), bbs.blob_base_fee > 0 AND bbs.blob_base_fee < 1000000000000000000), 0.0))) AS avg_fee,
        max(bbs.blob_count)                                            AS max_blobs_in_block,
        round(avg(bbs.blob_gas_used / if(bbs.block_number >= 22431084, 1179648.0, 786432.0)) * 100, 2) AS avg_utilization
      FROM ethereum.transactions AS bt FINAL
      LEFT JOIN (
        SELECT number AS block_number, blob_base_fee, blob_count, ifNull(blob_gas_used, 0) AS blob_gas_used
        FROM ethereum.blocks FINAL
        WHERE is_deleted = 0
      ) bbs ON bbs.block_number = bt.block_number
      WHERE bt.is_deleted = 0 AND bt.tx_type = 3
        AND bt.rollup = {rollup:String}
        AND bt.block_timestamp > now() - toIntervalHour({hours:UInt32})
      GROUP BY toStartOfHour(bt.block_timestamp)
      ORDER BY toStartOfHour(bt.block_timestamp) ASC
    `,
    format: "JSONEachRow",
    query_params: { rollup, hours },
  });
  return result.json<MarketHour>();
}

export async function getRollupTransactions(
  rollupId: string
): Promise<BlobTransaction[]> {
  const result = await ch.query({
    query: `
      SELECT
        tx_hash,
        block_number,
        num_blobs,
        rollup,
        toString(max_fee_per_blob_gas) AS max_fee_per_blob_gas,
        toString(blob_base_fee)        AS blob_base_fee,
        toString(block_timestamp)      AS created_at
      FROM ethereum.transactions FINAL
      WHERE is_deleted = 0 AND tx_type = 3 AND rollup = {rollupId:String}
      ORDER BY block_number DESC, tx_index DESC
      LIMIT 500
    `,
    format: "JSONEachRow",
    query_params: { rollupId },
  });
  return result.json<BlobTransaction>();
}

export async function getLatestBlobs(limit = 20): Promise<BlobTransaction[]> {
  const result = await ch.query({
    query: `
      SELECT
        tx_hash,
        block_number,
        num_blobs,
        rollup,
        toString(max_fee_per_blob_gas) AS max_fee_per_blob_gas,
        toString(blob_base_fee)        AS blob_base_fee,
        toString(block_timestamp)      AS created_at
      FROM blob_lens.blob_transactions FINAL
      WHERE is_canonical = 1
      ORDER BY block_number DESC, tx_hash DESC
      LIMIT {limit:UInt32}
    `,
    format: "JSONEachRow",
    query_params: { limit },
  });
  return result.json<BlobTransaction>();
}

export async function getRecentBlocks(limit = 20): Promise<BlockRow[]> {
  const result = await ch.query({
    query: `
      SELECT
        bbs.block_number,
        toString(bbs.blob_base_fee)                                AS blob_base_fee,
        bbs.blob_gas_used,
        bbs.blob_count,
        round(bbs.utilization * 100, 1)                            AS utilization,
        countIf(bt.tx_hash != '')                                  AS tx_count,
        arrayFilter(x -> x != '', groupUniqArray(bt.rollup))       AS rollups,
        toString(bbs.block_timestamp)                              AS created_at
      FROM blob_lens.block_blob_stats bbs FINAL
      LEFT JOIN blob_lens.blob_transactions bt FINAL
        ON bt.block_number = bbs.block_number AND bt.is_canonical = 1
      WHERE bbs.is_canonical = 1
      GROUP BY
        bbs.block_number, bbs.blob_base_fee, bbs.blob_gas_used,
        bbs.blob_count, bbs.utilization, bbs.block_timestamp
      ORDER BY bbs.block_number DESC
      LIMIT {limit:UInt32}
    `,
    format: "JSONEachRow",
    query_params: { limit },
  });
  return result.json<BlockRow>();
}

export async function getRollupSparklines(): Promise<SparklinePoint[]> {
  const result = await ch.query({
    query: `
      SELECT
        rollup,
        toString(toStartOfHour(block_timestamp)) AS hour,
        sum(num_blobs)                           AS blobs
      FROM ethereum.transactions FINAL
      WHERE is_deleted = 0 AND tx_type = 3 AND rollup != ''
        AND block_timestamp > now() - toIntervalHour(24)
      GROUP BY (rollup, toStartOfHour(block_timestamp))
      ORDER BY rollup ASC, toStartOfHour(block_timestamp) ASC
    `,
    format: "JSONEachRow",
  });
  return result.json<SparklinePoint>();
}

export async function getDailyRollupBreakdown(
  days = 30,
  topRollups = 16
): Promise<DailyRollupBlob[]> {
  const result = await ch.query({
    query: `
      SELECT d.day, d.rollup, d.blobs
      FROM (
        SELECT
          toString(toStartOfDay(block_timestamp)) AS day,
          rollup,
          sum(num_blobs)                          AS blobs
        FROM ethereum.transactions FINAL
        WHERE is_deleted = 0 AND tx_type = 3 AND rollup != '' AND rollup != 'UNKNOWN'
          AND block_timestamp > now() - toIntervalDay({days:UInt32})
        GROUP BY (toStartOfDay(block_timestamp), rollup)
      ) d
      INNER JOIN (
        SELECT rollup
        FROM ethereum.transactions FINAL
        WHERE is_deleted = 0 AND tx_type = 3 AND rollup != '' AND rollup != 'UNKNOWN'
          AND block_timestamp > now() - toIntervalDay({days:UInt32})
        GROUP BY (rollup)
        ORDER BY sum(num_blobs) DESC
        LIMIT {topRollups:UInt32}
      ) top ON top.rollup = d.rollup
      ORDER BY d.day ASC, d.rollup ASC
    `,
    format: "JSONEachRow",
    query_params: { days, topRollups },
  });
  return result.json<DailyRollupBlob>();
}

export async function getHourlyRollupFee(
  hours = 24,
  topN = 10
): Promise<HourlyRollupValue[]> {
  const result = await ch.query({
    query: `
      SELECT
        rollup,
        toString(toStartOfHour(block_timestamp))                AS hour,
        ifNotFinite(avgIf(toFloat64(blob_base_fee), blob_base_fee > 0 AND blob_base_fee < 1000000000000000000), 0.0) AS value
      FROM ethereum.transactions FINAL
      WHERE is_deleted = 0 AND tx_type = 3
        AND rollup != '' AND rollup != 'UNKNOWN'
        AND rollup IN (
          SELECT rollup
          FROM ethereum.transactions FINAL
          WHERE is_deleted = 0 AND tx_type = 3 AND rollup != '' AND rollup != 'UNKNOWN'
            AND block_timestamp > now() - toIntervalHour({hours:UInt32})
          GROUP BY (rollup)
          ORDER BY sum(num_blobs) DESC
          LIMIT {topN:UInt32}
        )
        AND block_timestamp > now() - toIntervalHour({hours:UInt32})
      GROUP BY (rollup, toStartOfHour(block_timestamp))
      ORDER BY toStartOfHour(block_timestamp) ASC, rollup ASC
    `,
    format: "JSONEachRow",
    query_params: { hours, topN },
  });
  return result.json<HourlyRollupValue>();
}

export async function getHourlyRollupUtilization(
  hours = 24,
  topN = 10
): Promise<HourlyRollupValue[]> {
  const result = await ch.query({
    query: `
      SELECT
        rollup,
        toString(toStartOfHour(block_timestamp))                AS hour,
        sum(num_blobs) / (uniqExact(block_number) * 9.0) * 100 AS value
      FROM ethereum.transactions FINAL
      WHERE is_deleted = 0 AND tx_type = 3
        AND rollup != '' AND rollup != 'UNKNOWN'
        AND rollup IN (
          SELECT rollup
          FROM ethereum.transactions FINAL
          WHERE is_deleted = 0 AND tx_type = 3 AND rollup != '' AND rollup != 'UNKNOWN'
            AND block_timestamp > now() - toIntervalHour({hours:UInt32})
          GROUP BY (rollup)
          ORDER BY sum(num_blobs) DESC
          LIMIT {topN:UInt32}
        )
        AND block_timestamp > now() - toIntervalHour({hours:UInt32})
      GROUP BY (rollup, toStartOfHour(block_timestamp))
      ORDER BY toStartOfHour(block_timestamp) ASC, rollup ASC
    `,
    format: "JSONEachRow",
    query_params: { hours, topN },
  });
  return result.json<HourlyRollupValue>();
}

export async function getHourlyRollupActivity(
  hours = 24,
  topN = 10
): Promise<HourlyRollupBlob[]> {
  const result = await ch.query({
    query: `
      SELECT
        rollup,
        toString(toStartOfHour(block_timestamp)) AS hour,
        sum(num_blobs)                           AS blobs
      FROM ethereum.transactions FINAL
      WHERE is_deleted = 0 AND tx_type = 3
        AND rollup != '' AND rollup != 'UNKNOWN'
        AND rollup IN (
          SELECT rollup
          FROM ethereum.transactions FINAL
          WHERE is_deleted = 0 AND tx_type = 3 AND rollup != '' AND rollup != 'UNKNOWN'
            AND block_timestamp > now() - toIntervalHour({hours:UInt32})
          GROUP BY (rollup)
          ORDER BY sum(num_blobs) DESC
          LIMIT {topN:UInt32}
        )
        AND block_timestamp > now() - toIntervalHour({hours:UInt32})
      GROUP BY (rollup, toStartOfHour(block_timestamp))
      ORDER BY toStartOfHour(block_timestamp) ASC, rollup ASC
    `,
    format: "JSONEachRow",
    query_params: { hours, topN },
  });
  return result.json<HourlyRollupBlob>();
}

export interface RollupNetworkNode {
  name: string;
  value: number;
  efficiency: number;
  avgFeeGwei: number;
  txCount: number;
  costEth: number;
}

export interface RollupNetworkEdge {
  source: string;
  target: string;
  weight: number;
}

export interface RollupNetworkGraph {
  nodes: RollupNetworkNode[];
  edges: RollupNetworkEdge[];
}

export async function getRollupNetworkGraph(hours = 24): Promise<RollupNetworkGraph> {
  const nodesResult = await ch.query({
    query: `
      SELECT
        rollup                                                          AS name,
        sum(num_blobs)                                                  AS value,
        ifNotFinite(avgIf(toFloat64(blob_base_fee), blob_base_fee < 1000000000000000000), 0.0) / 1e9 AS avgFeeGwei,
        count()                                                         AS txCount,
        sum(if(blob_base_fee < 1000000000000000000, toFloat64(num_blobs) * toFloat64(blob_base_fee), 0)) * 131072.0 / 1e18 AS costEth,
        least(100, greatest(0,
          0.70 * least(100, avg(num_blobs) / 6.0 * 100) + 0.30 * 50.0
        ))                                                              AS efficiency
      FROM ethereum.transactions FINAL
      WHERE is_deleted = 0 AND tx_type = 3 AND rollup != '' AND rollup != 'UNKNOWN'
        AND block_timestamp > now() - toIntervalHour({hours:UInt32})
      GROUP BY (rollup)
      HAVING sum(num_blobs) > 0
      ORDER BY sum(num_blobs) DESC
    `,
    format: "JSONEachRow",
    query_params: { hours },
  });
  const nodes = await nodesResult.json<RollupNetworkNode>();

  const edgesResult = await ch.query({
    query: `
      SELECT
        a.rollup                                                    AS source,
        b.rollup                                                    AS target,
        least(100, count() / greatest(total.total_blocks, 1) * 100) AS weight
      FROM (
        SELECT block_number, rollup
        FROM ethereum.transactions FINAL
        WHERE is_deleted = 0 AND tx_type = 3 AND rollup != '' AND rollup != 'UNKNOWN'
          AND block_timestamp > now() - toIntervalHour({hours:UInt32})
        GROUP BY (block_number, rollup)
      ) a
      JOIN (
        SELECT block_number, rollup
        FROM ethereum.transactions FINAL
        WHERE is_deleted = 0 AND tx_type = 3 AND rollup != '' AND rollup != 'UNKNOWN'
          AND block_timestamp > now() - toIntervalHour({hours:UInt32})
        GROUP BY (block_number, rollup)
      ) b ON a.block_number = b.block_number AND a.rollup < b.rollup
      CROSS JOIN (
        SELECT uniqExact(block_number) AS total_blocks
        FROM ethereum.transactions FINAL
        WHERE is_deleted = 0 AND tx_type = 3
          AND block_timestamp > now() - toIntervalHour({hours:UInt32})
      ) total
      GROUP BY (a.rollup, b.rollup, total.total_blocks)
      ORDER BY weight DESC
    `,
    format: "JSONEachRow",
    query_params: { hours },
  });
  const edges = await edgesResult.json<RollupNetworkEdge>();

  return { nodes, edges };
}

export async function getFullnessHistogram(_days = 7): Promise<FullnessHistogramBucket[]> {
  // fullness_ratio is not available in the ClickHouse schema (beacon sidecar data only)
  return [];
}

export interface BpoEpochStat {
  epoch: string;
  target_blobs: number;
  max_blobs: number;
  total_blocks_with_blobs: number;
  total_blobs: number;
  avg_blobs_per_block: number;
  avg_fee_gwei: number;
  start_block: number;
  end_block: number;
}

export interface HistoricalDailyStat {
  day: string;
  total_blobs: number;
  avg_fee_gwei: number;
  avg_blobs_per_block: number;
  blocks_with_blobs: number;
}

export async function getHistoricalDailyStats(): Promise<HistoricalDailyStat[]> {
  const result = await ch.query({
    query: `
      SELECT
        toString(toDate(timestamp))                                                          AS day,
        sum(blob_count)                                                                      AS total_blobs,
        round(avgIf(toFloat64(blob_base_fee), blob_base_fee > 0
              AND blob_base_fee < 1000000000000000000) / 1e9, 8)                            AS avg_fee_gwei,
        round(avg(blob_count), 3)                                                           AS avg_blobs_per_block,
        count()                                                                             AS blocks_with_blobs
      FROM ethereum.blocks FINAL
      WHERE is_deleted = 0
        AND blob_count > 0
      GROUP BY toDate(timestamp)
      ORDER BY toDate(timestamp) ASC
    `,
    format: "JSONEachRow",
  });
  return result.json<HistoricalDailyStat>();
}

export async function getBpoEpochStats(): Promise<BpoEpochStat[]> {
  const result = await ch.query({
    query: `
      SELECT
        epoch,
        target_blobs,
        max_blobs,
        count()                       AS total_blocks_with_blobs,
        sum(blobs_in_block)           AS total_blobs,
        round(avg(blobs_in_block), 2) AS avg_blobs_per_block,
        round(avg(fee_gwei), 6)       AS avg_fee_gwei,
        min(block_number)             AS start_block,
        max(block_number)             AS end_block
      FROM (
        SELECT
          block_number,
          sum(num_blobs) AS blobs_in_block,
          avgIf(toFloat64(blob_base_fee), blob_base_fee < 1000000000000000000) / 1e9 AS fee_gwei,
          multiIf(block_number < 22431084, 'Dencun',
                   block_number < 24833256, 'Pectra',
                   'Fusaka') AS epoch,
          multiIf(block_number < 22431084, 3,
                   block_number < 24833256, 6,
                   12) AS target_blobs,
          multiIf(block_number < 22431084, 6,
                   block_number < 24833256, 9,
                   18) AS max_blobs
        FROM ethereum.transactions FINAL
        WHERE is_deleted = 0 AND tx_type = 3
        GROUP BY block_number, epoch, target_blobs, max_blobs
      ) sub
      GROUP BY epoch, target_blobs, max_blobs
      ORDER BY start_block ASC
    `,
    format: "JSONEachRow",
  });
  return result.json<BpoEpochStat>();
}

// ── Transaction Reader ────────────────────────────────────────────────────────

export async function getTxDetail(hash: string): Promise<TxDetail | null> {
  try {
  const h = hash.toLowerCase();
  const result = await ch.query({
    query: `
      SELECT
        tx_hash,
        block_number,
        toString(block_timestamp)      AS block_timestamp,
        from_address,
        to_address,
        rollup,
        num_blobs,
        blob_hashes,
        toString(blob_base_fee)        AS blob_base_fee,
        toString(max_fee_per_blob_gas) AS max_fee_per_blob_gas
      FROM blob_lens.blob_transactions
      WHERE tx_hash = {hash:String} AND is_canonical = 1
      LIMIT 1
    `,
    query_params: { hash: h },
    format: "JSONEachRow",
  });

  type Row = {
    tx_hash: string; block_number: number; block_timestamp: string;
    from_address: string; to_address: string; rollup: string;
    num_blobs: number; blob_hashes: string[];
    blob_base_fee: string; max_fee_per_blob_gas: string;
  };

  const rows = await result.json<Row>();
  if (!rows.length) return null;
  const r = rows[0];

  return {
    tx_hash:             r.tx_hash,
    block_number:        r.block_number,
    block_timestamp:     r.block_timestamp,
    from_address:        r.from_address,
    to_address:          r.to_address,
    value:               "0",
    tx_type:             3,
    rollup:              r.rollup || null,
    status:              true,
    gas_used:            0,
    effective_gas_price: 0,
    total_fee_wei:       "0",
    is_blob_tx:          true,
    num_blobs:           r.num_blobs,
    blob_hashes:         r.blob_hashes,
    blob_base_fee:       r.blob_base_fee,
    token_transfers:     [],
  };
  } catch {
    return null;
  }
}

export async function getAddressSummary(addr: string): Promise<AddressSummary | null> {
  try {
  const a = addr.toLowerCase();
  const [blobResult, ofacResult, whaleResult] = await Promise.all([
    ch.query({
      query: `
        SELECT
          count()                        AS blob_tx_count,
          toString(min(block_timestamp)) AS first_seen,
          toString(max(block_timestamp)) AS last_seen,
          topK(1)(rollup)                AS top_rollups
        FROM blob_lens.blob_transactions FINAL
        WHERE is_canonical = 1 AND from_address = {a:String}
      `,
      query_params: { a },
      format: "JSONEachRow",
    }),
    sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM ofac_sanctions_list WHERE lower(address) = ${a}) AS exists
    `,
    sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM whale_wallets WHERE lower(address) = ${a}) AS exists
    `,
  ]);

  type BlobSummaryRow = { blob_tx_count: number; first_seen: string; last_seen: string; top_rollups: string[] };

  const blobRows = await blobResult.json<BlobSummaryRow>();
  const blob = blobRows[0] ?? { blob_tx_count: 0, first_seen: "", last_seen: "", top_rollups: [] };

  return {
    address:       a,
    tx_total:      blob.blob_tx_count,
    tx_sent:       blob.blob_tx_count,
    tx_received:   0,
    blob_tx_count: blob.blob_tx_count,
    top_rollup:    blob.top_rollups.find(r => r) ?? null,
    first_seen:    blob.first_seen || null,
    last_seen:     blob.last_seen || null,
    ofac_flagged:  ofacResult[0]?.exists ?? false,
    whale_flagged: whaleResult[0]?.exists ?? false,
  };
  } catch {
    return null;
  }
}

export async function getAddressTxs(
  addr: string, page = 1, limit = 25
): Promise<AddressTx[]> {
  try {
  const a = addr.toLowerCase();
  const offset = (page - 1) * limit;
  const result = await ch.query({
    query: `
      SELECT
        block_number,
        toString(block_timestamp)      AS block_timestamp,
        tx_hash,
        from_address,
        to_address,
        '0'                            AS value,
        3                              AS tx_type,
        'out'                          AS direction,
        rollup,
        1                              AS status,
        0                              AS gas_used,
        toUInt64(blob_base_fee)        AS effective_gas_price,
        num_blobs
      FROM blob_lens.blob_transactions FINAL
      WHERE is_canonical = 1 AND from_address = {a:String}
      ORDER BY block_number DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `,
    query_params: { a, limit, offset },
    format: "JSONEachRow",
  });

  type Row = {
    block_number: number; block_timestamp: string; tx_hash: string;
    from_address: string; to_address: string; value: string; tx_type: number;
    direction: string; rollup: string; status: number;
    gas_used: number; effective_gas_price: number; num_blobs: number;
  };

  const rows = await result.json<Row>();
  return rows.map(r => ({
    block_number:        r.block_number,
    block_timestamp:     r.block_timestamp,
    tx_hash:             r.tx_hash,
    from_address:        r.from_address,
    to_address:          r.to_address,
    value:               r.value,
    tx_type:             r.tx_type,
    direction:           "out" as const,
    rollup:              r.rollup || null,
    status:              true,
    gas_used:            r.gas_used,
    effective_gas_price: r.effective_gas_price,
    num_blobs:           r.num_blobs,
  }));
  } catch {
    return [];
  }
}

export async function getBlockDetail(blockNumber: number): Promise<BlockDetail | null> {
  try {
  const [statsResult, txsResult] = await Promise.all([
    ch.query({
      query: `
        SELECT
          block_number,
          toString(block_timestamp)  AS block_timestamp,
          blob_count,
          blob_gas_used,
          excess_blob_gas,
          toString(blob_base_fee)    AS blob_base_fee,
          round(utilization * 100, 1) AS utilization
        FROM blob_lens.block_blob_stats FINAL
        WHERE is_canonical = 1 AND block_number = {n:UInt64}
        LIMIT 1
      `,
      query_params: { n: blockNumber },
      format: "JSONEachRow",
    }),
    ch.query({
      query: `
        SELECT
          block_number,
          toString(block_timestamp)      AS block_timestamp,
          tx_hash,
          from_address,
          to_address,
          '0'                            AS value,
          3                              AS tx_type,
          'out'                          AS direction,
          rollup,
          1                              AS status,
          0                              AS gas_used,
          toUInt64(blob_base_fee)        AS effective_gas_price,
          num_blobs
        FROM blob_lens.blob_transactions FINAL
        WHERE is_canonical = 1 AND block_number = {n:UInt64}
        ORDER BY tx_index ASC
        LIMIT 200
      `,
      query_params: { n: blockNumber },
      format: "JSONEachRow",
    }),
  ]);

  type StatsRow = {
    block_number: number; block_timestamp: string; blob_count: number;
    blob_gas_used: number; excess_blob_gas: number; blob_base_fee: string; utilization: number;
  };
  type TxRow = {
    block_number: number; block_timestamp: string; tx_hash: string;
    from_address: string; to_address: string; value: string; tx_type: number;
    direction: string; rollup: string; status: number;
    gas_used: number; effective_gas_price: number; num_blobs: number;
  };

  const stats = await statsResult.json<StatsRow>();
  const txs = await txsResult.json<TxRow>();
  if (!stats.length && !txs.length) return null;

  const s = stats[0];
  const rollups = [...new Set(txs.filter(t => t.rollup).map(t => t.rollup))];

  return {
    block_number:   s?.block_number ?? blockNumber,
    block_timestamp: s?.block_timestamp ?? "",
    blob_count:     s?.blob_count ?? 0,
    blob_gas_used:  s?.blob_gas_used ?? 0,
    excess_blob_gas: s?.excess_blob_gas ?? 0,
    blob_base_fee:  s?.blob_base_fee ?? "0",
    utilization:    s?.utilization ?? 0,
    tx_count:       txs.length,
    rollups,
    txs: txs.map(r => ({
      block_number:        r.block_number,
      block_timestamp:     r.block_timestamp,
      tx_hash:             r.tx_hash,
      from_address:        r.from_address,
      to_address:          r.to_address,
      value:               r.value,
      tx_type:             r.tx_type,
      direction:           "out" as const,
      rollup:              r.rollup || null,
      status:              r.status !== 0,
      gas_used:            r.gas_used,
      effective_gas_price: r.effective_gas_price,
      num_blobs:           r.num_blobs,
    })),
  };
  } catch {
    return null;
  }
}
