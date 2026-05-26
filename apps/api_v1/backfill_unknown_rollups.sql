-- Backfill historical UNKNOWN rows using the DB rollup_registry table.
-- Usage:
--   set -a; source .env
--   psql "$DATABASE_URL" -f apps/api/seed_rollup_registry.sql
--   psql "$DATABASE_URL" -f apps/api/backfill_unknown_rollups.sql

WITH candidates AS (
  SELECT
    bt.id,
    rr.rollup_name,
    ROW_NUMBER() OVER (
      PARTITION BY bt.id
      ORDER BY CASE WHEN LOWER(bt.from_address) = LOWER(rr.address) THEN 0 ELSE 1 END,
               rr.rollup_name
    ) AS rn
  FROM blob_transactions bt
  JOIN rollup_registry rr
    ON LOWER(bt.from_address) = LOWER(rr.address)
    OR LOWER(COALESCE(bt.to_address, '')) = LOWER(rr.address)
  WHERE bt.rollup = 'UNKNOWN'
)
UPDATE blob_transactions bt
SET rollup = c.rollup_name
FROM candidates c
WHERE bt.id = c.id
  AND c.rn = 1;

-- Quick post-check
-- SELECT rollup, COUNT(*) tx_count, SUM(num_blobs) blobs
-- FROM blob_transactions
-- GROUP BY rollup
-- ORDER BY blobs DESC;
