#!/usr/bin/env bash
# Build replayer/txlist.txt: recent txs sent to a target contract, from ClickHouse.
# Usage: ./gen-txlist.sh 0x<contract> [limit]   (run on ba-data, or with CLICKHOUSE_URL set)
set -euo pipefail
cd "$(dirname "$0")"
[[ -f .env ]] && { set -a; source ./.env; set +a; }
ADDR="${1:?usage: gen-txlist.sh 0xcontract [limit]}"
LIMIT="${2:-50}"
mkdir -p replayer
curl -s -m 60 "${CLICKHOUSE_URL:-http://127.0.0.1:8123}/?user=${CLICKHOUSE_USER:-blob_lens}&password=${CLICKHOUSE_PASSWORD:-changeme}" \
  --data "SELECT tx_hash FROM ethereum.transactions
          WHERE to_address = lower('$ADDR')
            AND block_number > (SELECT max(number) FROM ethereum.blocks) - 2600000
          ORDER BY block_number DESC LIMIT $LIMIT FORMAT TabSeparated" \
  > replayer/txlist.txt
echo "wrote $(wc -l < replayer/txlist.txt) txhashes to replayer/txlist.txt for $ADDR"
