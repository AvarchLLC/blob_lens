#!/usr/bin/env bash
# deploy-ba-data.sh — one-time setup + rolling deploy of the ExEx node on ba-data.
# Must be run as root (or with sudo).
#
# Steps:
#   1. Start ClickHouse (Docker)
#   2. Build the custom Reth+ExEx image
#   3. Stop the vanilla reth container
#   4. Start the new blob-indexer container (same data dir, same ports)
#   5. Optionally kick off the backfill job
#
# Prerequisites: Docker installed, /ethereum/data/reth pre-synced with stock Reth.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
INFRA_DIR="$REPO_ROOT/apps/indexer/infra"
INDEXER_DIR="$REPO_ROOT/apps/indexer"
ETH_DIR="/ethereum"

echo "=== [1/5] Start ClickHouse ==="
docker compose -f "$INFRA_DIR/clickhouse-compose.yml" up -d
echo "Waiting for ClickHouse to be healthy..."
for i in $(seq 1 30); do
    docker exec clickhouse clickhouse-client --query "SELECT 1" &>/dev/null && break
    sleep 2
done
echo "ClickHouse ready."

echo "=== [2/5] Build blob-indexer image ==="
docker build -t blob-indexer:latest "$INDEXER_DIR"

echo "=== [3/5] Stop vanilla reth ==="
# Graceful stop — Reth flushes DB on SIGTERM; give it 5 minutes
docker stop --time=300 reth 2>/dev/null || echo "reth not running, continuing"
docker rm reth 2>/dev/null || true

echo "=== [4/5] Start blob-indexer (Reth + ExEx) ==="
docker run -d \
    --name reth \
    --restart unless-stopped \
    --stop-timeout 300 \
    --network ethereum_eth-net \
    -p 30303:30303/tcp \
    -p 30303:30303/udp \
    -p 0.0.0.0:8545:8545 \
    -p 0.0.0.0:8546:8546 \
    -p 0.0.0.0:9001:9001 \
    -v "$ETH_DIR/data/reth:/data" \
    -v "$ETH_DIR/jwt:/jwt:ro" \
    -e CLICKHOUSE_URL="http://clickhouse:8123" \
    -e CLICKHOUSE_DB="blob_lens" \
    -e CLICKHOUSE_USER="blob_lens" \
    -e CLICKHOUSE_PASSWORD="changeme" \
    -e RUST_LOG="info,reth=warn" \
    blob-indexer:latest

echo "=== [5/5] Optional: run backfill (Dencun → head) ==="
echo "To start the backfill in the background, run:"
echo ""
echo "  docker run -d --name backfill --network ethereum_eth-net \\"
echo "    -e RETH_RPC=http://reth:8545 \\"
echo "    -e CLICKHOUSE_URL=http://clickhouse:8123 \\"
echo "    -e CLICKHOUSE_DB=blob_lens \\"
echo "    -e CLICKHOUSE_USER=blob_lens \\"
echo "    -e CLICKHOUSE_PASSWORD=changeme \\"
echo "    -e BATCH_SIZE=200 \\"
echo "    --entrypoint backfill \\"
echo "    blob-indexer:latest"
echo ""
echo "Deploy complete. Watch logs: docker logs -f reth"
