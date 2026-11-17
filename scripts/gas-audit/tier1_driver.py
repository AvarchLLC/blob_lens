#!/usr/bin/env python3
"""
Tier-0 -> Tier-1 driver (runs on ba-data, unattended).

Takes the top flagged contracts from the latest Tier-0 report, pulls their
recent real txs from ClickHouse, replays each under Osaka vs Glamsterdam with
the Rust differential replayer, classifies the flips (fixed-gas vs hard-break),
and pings Discord with the confirmed breakages.

Env (see .env):
  CLICKHOUSE_URL/USER/PASSWORD, DISCORD_WEBHOOK, MAINNET_RPC
  TIER1_TOP_N     default 8    contracts to replay (by Tier-0 score)
  TIER1_TXS       default 15   recent txs per contract
  TIER1_MIN_SCORE default 50   skip low-signal contracts
"""

import glob
import json
import os
import subprocess
import sys
import time
import traceback
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CH_URL = os.environ.get("CLICKHOUSE_URL", "http://127.0.0.1:8123")
CH_USER = os.environ.get("CLICKHOUSE_USER", "blob_lens")
CH_PASS = os.environ.get("CLICKHOUSE_PASSWORD", "changeme")
WEBHOOK = os.environ.get("DISCORD_WEBHOOK", "").strip()
RPC = os.environ.get("MAINNET_RPC", "http://127.0.0.1:8545")
TOP_N = int(os.environ.get("TIER1_TOP_N", "8"))
TXN = int(os.environ.get("TIER1_TXS", "15"))
MIN_SCORE = int(os.environ.get("TIER1_MIN_SCORE", "50"))
BIN = HERE / "replayer/revm/target/release/example-gas-replayer"


def ch(sql):
    url = f"{CH_URL}/?{urllib.parse.urlencode({'user': CH_USER, 'password': CH_PASS})}"
    req = urllib.request.Request(url, data=sql.encode(), method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode()


def discord(msg):
    if not WEBHOOK:
        return
    try:
        req = urllib.request.Request(
            WEBHOOK, data=json.dumps({"content": msg[:1900]}).encode(),
            headers={"Content-Type": "application/json", "User-Agent": "bloblens-gas-audit"},
            method="POST")
        urllib.request.urlopen(req, timeout=20)
    except Exception as e:
        print(f"[warn] webhook: {e}")


def latest_report():
    files = sorted(glob.glob(str(HERE / "outputs/audit-*.json")))
    if not files:
        sys.exit("no Tier-0 report in outputs/ — run run-ba-data.sh first")
    return json.loads(Path(files[-1]).read_text())


def txs_for(addr, n):
    out = ch(f"""SELECT tx_hash FROM ethereum.transactions
        WHERE to_address = lower('{addr}')
          AND block_number > (SELECT max(number) FROM ethereum.blocks) - 2600000
        ORDER BY block_number DESC LIMIT {n} FORMAT TabSeparated""").strip()
    return [l.strip() for l in out.splitlines() if l.strip()]


def replay(addr, hashes):
    path = HERE / f"replayer/txlist_{addr[:10]}.txt"
    path.write_text("\n".join(hashes))
    env = {**os.environ, "JSONL": "1", "LABEL": addr, "TXLIST": str(path), "MAINNET_RPC": RPC}
    rows = []
    try:
        p = subprocess.run([str(BIN)], env=env, capture_output=True, text=True, timeout=1800)
        for line in p.stdout.splitlines():
            line = line.strip()
            if line.startswith("{"):
                try:
                    rows.append(json.loads(line))
                except Exception:
                    pass
        if p.returncode != 0 and not rows:
            print(f"      replayer exited {p.returncode}: {p.stderr[-300:]}")
    except subprocess.TimeoutExpired:
        print(f"      {addr} replay timed out")
    return rows


def main():
    if not BIN.exists():
        sys.exit(f"replayer binary missing: {BIN}\nrun ./bootstrap-replayer.sh and build the example first")
    started = time.time()
    report = latest_report()
    targets = [r for r in report if int(r.get("score", 0)) >= MIN_SCORE][:TOP_N]
    print(f"Tier-1: replaying {len(targets)} contracts x {TXN} txs under Osaka vs Glamsterdam\n")

    summary = []
    for i, t in enumerate(targets, 1):
        addr = t["addr"]
        print(f"[{i}/{len(targets)}] {addr} (Tier-0 score {t.get('score')})")
        hashes = txs_for(addr, TXN)
        rows = replay(addr, hashes)
        ran = [r for r in rows if "flip" in r]
        flips = [r for r in ran if r.get("flip")]
        hard = [r for r in flips if r.get("class") == "hard-break"]
        deltas = [r.get("delta", 0) for r in ran if r.get("amster_ok")]
        max_delta = max(deltas) if deltas else 0
        summary.append({"addr": addr, "score": t.get("score"), "ran": len(ran),
                        "flips": len(flips), "hard": len(hard), "max_delta": max_delta,
                        "hard_tx": [r["tx"] for r in hard[:3]], "flip_tx": [r["tx"] for r in flips[:3]]})
        print(f"      ran={len(ran)} flips={len(flips)} hard-break={len(hard)} max_delta=+{max_delta}")

    # rank: hard-breaks first, then flips, then gas delta
    summary.sort(key=lambda s: (s["hard"], s["flips"], s["max_delta"]), reverse=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    (HERE / "outputs" / f"tier1-{stamp}.json").write_text(json.dumps(summary, indent=2))

    dur = int(time.time() - started)
    lines = [f"🔬 **Tier-1 replay done** ({dur}s) — Osaka vs Glamsterdam on top Tier-0 contracts\n"]
    any_hard = False
    for s in summary:
        tag = ""
        if s["hard"]:
            any_hard = True
            tag = f" ⛔ **{s['hard']} HARD-BREAK**"
        elif s["flips"]:
            tag = f" ⚠️ {s['flips']} fixed-gas flip"
        lines.append(f"`{s['addr']}` ran {s['ran']} · max Δ+{s['max_delta']} gas{tag}")
        if s["hard_tx"]:
            lines.append(f"   break tx: {s['hard_tx'][0]}")
    if not any_hard:
        lines.append("\nNo hard-breaks found; flips are fixed-gas (raise the limit). Try more txs / contracts.")
    msg = "\n".join(lines)
    print("\n" + msg)
    discord(msg)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        tb = traceback.format_exc()
        print(tb)
        discord(f"❌ **Tier-1 driver FAILED**\n```\n{tb[-1400:]}\n```")
        sys.exit(1)
