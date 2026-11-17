# gas-audit — BlobLens gas-repricing invariant audit

Standing, neutral version of what ChainSecurity/Dedaub/EF did by hand for ACDT
#103: find which deployed contracts break under a gas-repricing EIP (EIP-8037/
8038 first), with evidence. See `docs/GAS_INVARIANT_AUDIT_PLAN.md` (internal).

**Internal tooling. The `.env` holds a webhook — do not commit it.** The
`.gitignore` here already excludes `.env`, `outputs/`, `targets/`, `replayer/revm/`.

Two tiers:
- **Tier 0 (ready):** static scan of verified source for the 8 invariant red
  flags, ranked by on-chain activity. Finds *candidates* (places to look).
- **Tier 1 (bootstrapping):** replay each candidate's real historical txs under
  Osaka vs Glamsterdam rules and diff, to *confirm* a candidate.

---

## Tier 0 — batch audit (run on ba-data)

Everything is Python stdlib only (no pip). It reads config from `.env` and pings
Discord when done.

### 1. Copy the tool to ba-data
From your laptop (Tailscale up):
```bash
cd /Users/dhanushlnaik/Workspace/Dev/Avarch/blob_lens/scripts
SSHPASS=badmin sshpass -e rsync -az --exclude outputs --exclude targets \
  gas-audit/ badmin@ba-data:~/gas-audit/
```
(No rsync? `scp -r gas-audit badmin@ba-data:~/`.)

### 2. Run it in tmux (survives disconnect)
```bash
ssh badmin@ba-data
cd ~/gas-audit
tmux new -s gasaudit
./run-ba-data.sh
# detach: Ctrl-b then d
```
Reattach later: `tmux attach -t gasaudit`. When it finishes you get a Discord
ping with the top flagged contracts; the full report is in
`~/gas-audit/outputs/audit-<stamp>.md` (+ `.json`).

Scope knobs in `.env`: `TOP_N` (contracts to scan), `WINDOW_BLOCKS` (recency).
`TOP_N=300` takes a few minutes (Sourcify-fetch-bound). Bump to 1000+ for a
deeper sweep — that's the real "long job, check back" run.

### Scan a single contract locally
```bash
python3 scan.py targets/safe-1.3.0/
```

---

## Tier 1 — differential replayer (bootstrapping)

The hard part (an EVM that executes 8037/8038) already exists: the
`bluealloy/revm@glamsterdam-devnet-8` branch. We replay historical txs from our
archive node (ba-data Reth, `debug_`/`trace_` confirmed working) under mainnet
vs Glamsterdam rules and diff the outcome.

`bootstrap-replayer.sh` is the safe first step: it clones that revm branch,
builds it on ba-data, confirms the EIP-8037 support, and webhooks the result —
so we know the EVM builds here before wiring the full harness.

```bash
ssh badmin@ba-data && cd ~/gas-audit
tmux new -s replayer
./bootstrap-replayer.sh        # clone + build revm, webhook build status
```

`replayer/src/main.rs` is the differential-replay harness **draft** (RPC-backed
state from ba-data, execute under both specs, diff gas/success). It is wired but
unbuilt — once `bootstrap-replayer.sh` confirms revm builds, we pin alloy to the
branch's version and finish it against the real API. The bootstrap webhooks
either way, so you can fire it and check back.

---

## Output / honesty
- Tier-0 findings are **inferred** (a red flag is a place to look), never a
  confirmed bug. Tier-1 replay promotes them to **confirmed** with a reproducing
  tx.
- Source-only (we do not decompile closed bytecode). Report affected contracts
  privately, publish aggregates.
- The gas table and spec may still move (8037 has rival fixes in play) — keep it
  swappable.
