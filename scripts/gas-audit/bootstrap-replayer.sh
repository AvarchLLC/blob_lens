#!/usr/bin/env bash
# Tier-1 replayer bootstrap — run ON ba-data, in tmux.
#
# Safe first step: clone the revm Glamsterdam branch (the EVM that executes
# EIP-8037/8038), build it, confirm the 8037 support, and Discord-ping the
# result. This tells us the EVM builds on ba-data before we wire the full
# replay harness. Fire it and check back.
#
#   ssh badmin@ba-data && cd ~/gas-audit
#   tmux new -s replayer
#   ./bootstrap-replayer.sh
set -uo pipefail
cd "$(dirname "$0")"
[[ -f .env ]] && { set -a; source ./.env; set +a; }
WEBHOOK="${DISCORD_WEBHOOK:-}"
REVM_DIR="replayer/revm"
BRANCH="glamsterdam-devnet-8"
mkdir -p replayer outputs
LOG="outputs/replayer-bootstrap-$(date -u +%Y%m%d-%H%M%S).log"

ping() {  # $1 = message
  echo "$1"
  [[ -n "$WEBHOOK" ]] && curl -s -m 20 -H 'Content-Type: application/json' -H 'User-Agent: bloblens-gas-audit' \
    -d "$(python3 -c 'import json,sys;print(json.dumps({"content":sys.argv[1][:1900]}))' "$1")" \
    "$WEBHOOK" >/dev/null || true
}

{
  echo "== bootstrap replayer $(date -u) =="

  # 0. toolchain
  if ! command -v cargo >/dev/null 2>&1; then
    echo "installing rustup (no toolchain found)..."
    curl -sSf https://sh.rustup.rs | sh -s -- -y >/dev/null 2>&1
    source "$HOME/.cargo/env" 2>/dev/null || export PATH="$HOME/.cargo/bin:$PATH"
  fi
  cargo --version || { ping "❌ replayer bootstrap: no Rust toolchain and install failed"; exit 1; }

  # 1. clone the revm Glamsterdam branch
  if [[ ! -d "$REVM_DIR/.git" ]]; then
    echo "cloning bluealloy/revm@$BRANCH ..."
    git clone --depth 1 -b "$BRANCH" https://github.com/bluealloy/revm "$REVM_DIR" \
      || { ping "❌ replayer bootstrap: git clone of revm@$BRANCH failed"; exit 1; }
  else
    echo "revm already cloned."
  fi

  # 2. confirm EIP-8037 support is present in the branch
  HITS=$(grep -rl "amsterdam_eip8037\|EIP-8037\|state_gas_reservoir\|is_amsterdam" "$REVM_DIR/crates" 2>/dev/null | head -5)
  echo "8037 references:"; echo "$HITS"

  # 3. build the revm CLI (revme) — proves the EVM compiles on ba-data
  echo "building revme (this is the long part)..."
  START=$(date +%s)
  if (cd "$REVM_DIR" && cargo build --release -p revme 2>&1 | tail -30); then
    DUR=$(( $(date +%s) - START ))
    BIN="$REVM_DIR/target/release/revme"
    [[ -x "$BIN" ]] && STATUS="✅ built in ${DUR}s ($BIN)" || STATUS="⚠ build ok but revme binary not found"
    ping "$STATUS
revm@$BRANCH cloned on ba-data; EIP-8037 refs found: $(echo "$HITS" | wc -l)
Next: finish replayer/src/main.rs against this revm, then replay target txs."
  else
    ping "❌ replayer bootstrap: revm build FAILED. See $LOG on ba-data (tail below).
$(cd "$REVM_DIR" && cargo build --release -p revme 2>&1 | tail -15)"
    exit 1
  fi
} 2>&1 | tee "$LOG"
