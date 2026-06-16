#!/usr/bin/env bash
# deploy-ba-data.sh — one-time setup + rolling deploy of the ExEx node on ba-data.
# Must be run as root (or with sudo).
#
# Steps:
#   1. Start ClickHouse (Docker)
#   2. Build the custom Reth+ExEx image (from apps/exex-node — this is the
#      crate with the real Reth dependency; apps/indexer only has the
#      backfill binary now, see apps/indexer/Cargo.toml)
#   3. Stop the vanilla reth container
#   4. Start the new blob-indexer container (same data dir, same ports)
#   5. Backfill (Dencun → head historical catch-up) is run separately, NOT
#      via this script or Docker — in practice it's built with
#      `cargo build --release --bin backfill` from apps/indexer and run
#      directly on the host (e.g. in a long-lived tmux session), since it's
#      a one-shot/resumable catch-up job, not a perpetual service. The live
#      ExEx container started in step 4 already keeps blob_lens.* AND
#      ethereum.* fresh in real time on its own — backfill is only needed
#      to fill in historical blocks from before the ExEx was first deployed,
#      or after an extended downtime gap.
#
# Prerequisites: Docker installed, /ethereum/data/reth pre-synced with stock Reth.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
INFRA_DIR="$REPO_ROOT/apps/indexer/infra"
EXEX_NODE_DIR="$REPO_ROOT/apps/exex-node"
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
# apps/exex-node's Dockerfile just COPYs a pre-built binary (no builder
# stage), so the release binary must exist on the host before building.
(cd "$EXEX_NODE_DIR" && cargo build --release --bin blob-indexer)
docker build -t blob-indexer:latest "$EXEX_NODE_DIR"

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

echo "=== [5/5] Optional: run backfill (Dencun → head, or to fill a gap) ==="
echo "The live ExEx container started above already keeps blob_lens.* and"
echo "ethereum.* fresh going forward. Only run backfill if you need to fill"
echo "in historical blocks (first deploy, or after extended downtime)."
echo "It's a one-shot/resumable job, not a perpetual service — run it"
echo "directly on the host, e.g. in tmux:"
echo ""
echo "  tmux new-session -d -s backfill"
echo "  tmux send-keys -t backfill \\"
echo "    'cd $REPO_ROOT/apps/indexer && \\"
echo "     RETH_RPC=http://localhost:8545 \\"
echo "     CLICKHOUSE_URL=http://localhost:8123 \\"
echo "     CLICKHOUSE_DB=blob_lens CLICKHOUSE_USER=blob_lens \\"
echo "     CLICKHOUSE_PASSWORD=changeme BATCH_SIZE=200 \\"
echo "     cargo run --release --bin backfill' Enter"
echo ""
echo "Deploy complete. Watch logs: docker logs -f reth"
