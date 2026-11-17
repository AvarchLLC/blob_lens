#!/usr/bin/env bash
# Tier-0 -> Tier-1 driver — run ON ba-data in tmux. Replays the top flagged
# contracts under Osaka vs Glamsterdam and Discord-pings confirmed breakages.
# Needs: a Tier-0 report in outputs/ and the built replayer (bootstrap-replayer.sh).
set -euo pipefail
cd "$(dirname "$0")"
[[ -f .env ]] && { set -a; source ./.env; set +a; }
mkdir -p outputs
LOG="outputs/tier1-$(date -u +%Y%m%d-%H%M%S).log"
echo "logging to $LOG"
python3 tier1_driver.py 2>&1 | tee "$LOG"
