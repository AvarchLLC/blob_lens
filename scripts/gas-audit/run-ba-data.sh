#!/usr/bin/env bash
# Tier-0 batch gas-invariant audit — run this ON ba-data, inside tmux so it
# survives a disconnect. Pings the Discord webhook (from .env) when done.
#
#   ssh badmin@ba-data
#   cd ~/gas-audit
#   tmux new -s gasaudit
#   ./run-ba-data.sh
#   # detach: Ctrl-b then d   — reattach later: tmux attach -t gasaudit
#
# Needs only python3 stdlib (no pip). Reads config from ./.env.
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then echo "missing .env (copy .env.example and fill it)"; exit 1; fi
set -a; source ./.env; set +a

mkdir -p outputs
LOG="outputs/run-$(date -u +%Y%m%d-%H%M%S).log"
echo "logging to $LOG"
python3 batch_audit.py 2>&1 | tee "$LOG"
