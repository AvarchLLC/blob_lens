#!/usr/bin/env python3
"""
Tier-0 batch gas-repricing audit (runs on ba-data, unattended).

Pipeline:
  1. Rank the most-active contracts from ClickHouse (ethereum.transactions).
  2. Fetch each one's verified source from Sourcify v2 (skip unverified).
  3. Scan the source for the INV-1..8 red flags (scan.py).
  4. Rank by red-flag intensity x on-chain activity, write a report.
  5. Ping a Discord webhook when done (or on failure).

These are *inferred* candidates (places to look), not confirmed bugs. Tier-1
replay promotes them to confirmed. No source or result leaves ba-data except
the summary you send yourself.

Config via env (see .env):
  CLICKHOUSE_URL   default http://127.0.0.1:8123
  CLICKHOUSE_USER  default blob_lens
  CLICKHOUSE_PASSWORD
  DISCORD_WEBHOOK  optional; summary posted here when done
  TOP_N            default 300     contracts to consider
  WINDOW_BLOCKS    default 100000  recency window for the activity ranking
  OUT_DIR          default ./outputs
"""

import json
import os
import sys
import time
import traceback
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scan import scan_text, INVARIANTS  # noqa: E402

CH_URL = os.environ.get("CLICKHOUSE_URL", "http://127.0.0.1:8123")
CH_USER = os.environ.get("CLICKHOUSE_USER", "blob_lens")
CH_PASS = os.environ.get("CLICKHOUSE_PASSWORD", "changeme")
WEBHOOK = os.environ.get("DISCORD_WEBHOOK", "").strip()
TOP_N = int(os.environ.get("TOP_N", "300"))
WINDOW = int(os.environ.get("WINDOW_BLOCKS", "100000"))
OUT_DIR = Path(os.environ.get("OUT_DIR", Path(__file__).resolve().parent / "outputs"))

PRIO_WEIGHT = {1: 4, 2: 2, 3: 1}  # INV-4/INV-7 (prio 1) weighted highest
INV_PRIO = {inv_id: prio for inv_id, prio, *_ in INVARIANTS}


def http_post(url, data, headers=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def http_get(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "bloblens-gas-audit"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def ch_query(sql):
    url = f"{CH_URL}/?{urllib.parse.urlencode({'user': CH_USER, 'password': CH_PASS})}"
    return http_post(url, sql.encode("utf-8"), timeout=120)


def top_contracts(n, window):
    sql = f"""
    SELECT to_address, count() AS txs
    FROM ethereum.transactions
    WHERE block_number > (SELECT max(number) FROM ethereum.blocks) - {window}
      AND to_address != ''
    GROUP BY to_address ORDER BY txs DESC LIMIT {n} FORMAT TabSeparated
    """
    out = ch_query(sql).strip()
    rows = []
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) == 2:
            rows.append((parts[0].lower(), int(parts[1])))
    return rows


def sourcify_sources(addr, chain=1):
    """Return {filename: content} for a verified contract, or None."""
    url = f"https://sourcify.dev/server/v2/contract/{chain}/{addr}?fields=sources"
    try:
        data = json.loads(http_get(url, timeout=30))
    except Exception:
        return None
    srcs = data.get("sources")
    if not isinstance(srcs, dict) or not srcs:
        return None
    out = {}
    for path, obj in srcs.items():
        content = obj.get("content") if isinstance(obj, dict) else obj
        if isinstance(content, str) and path.endswith(".sol"):
            out[path] = content
    return out or None


def audit_contract(addr):
    srcs = sourcify_sources(addr)
    if srcs is None:
        return None  # unverified or no source
    per_inv = {}
    examples = {}
    for path, content in srcs.items():
        for prio, inv_id, assumption, note, ln, src, fix in scan_text(content):
            per_inv[inv_id] = per_inv.get(inv_id, 0) + 1
            examples.setdefault(inv_id, (path, ln, src))
    if not per_inv:
        return {"verified": True, "flagged": False, "per_inv": {}, "score": 0}
    score = sum(PRIO_WEIGHT[INV_PRIO[i]] * c for i, c in per_inv.items())
    return {
        "verified": True,
        "flagged": True,
        "per_inv": per_inv,
        "examples": examples,
        "score": score,
        "high_prio": any(INV_PRIO[i] == 1 for i in per_inv),
    }


def discord(msg):
    if not WEBHOOK:
        return
    try:
        http_post(
            WEBHOOK,
            json.dumps({"content": msg[:1900]}).encode("utf-8"),
            # Discord is behind Cloudflare, which 403s urllib's default UA.
            headers={"Content-Type": "application/json", "User-Agent": "bloblens-gas-audit"},
            timeout=20,
        )
    except Exception as e:
        print(f"[warn] discord webhook failed: {e}")


def main():
    started = time.time()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

    print(f"[1/3] ranking top {TOP_N} contracts (last {WINDOW} blocks)...")
    contracts = top_contracts(TOP_N, WINDOW)
    print(f"      got {len(contracts)} candidates")

    results = []
    verified = 0
    for i, (addr, txs) in enumerate(contracts, 1):
        try:
            r = audit_contract(addr)
        except Exception as e:
            print(f"      [{i}/{len(contracts)}] {addr} error: {e}")
            continue
        if r is None:
            continue
        verified += 1
        if r["flagged"]:
            r["addr"] = addr
            r["txs"] = txs
            results.append(r)
        if i % 25 == 0:
            print(f"      [{i}/{len(contracts)}] verified={verified} flagged={len(results)}")
        time.sleep(0.15)  # be gentle on Sourcify

    results.sort(key=lambda r: (r["high_prio"], r["score"], r["txs"]), reverse=True)

    # Report
    md = [f"# Tier-0 gas-invariant audit — {stamp}",
          f"\nScanned {len(contracts)} most-active contracts; {verified} verified on Sourcify; "
          f"**{len(results)} flagged**. Inferred candidates, not confirmed bugs.\n",
          "| # | Contract | Txs (window) | Score | Invariants |",
          "|---|---|---|---|---|"]
    for n, r in enumerate(results[:50], 1):
        invs = ", ".join(f"{k}×{v}" for k, v in sorted(r["per_inv"].items()))
        md.append(f"| {n} | `{r['addr']}` | {r['txs']:,} | {r['score']} | {invs} |")
    report_md = OUT_DIR / f"audit-{stamp}.md"
    report_md.write_text("\n".join(md))
    (OUT_DIR / f"audit-{stamp}.json").write_text(json.dumps(results, indent=2, default=str))

    dur = int(time.time() - started)
    top = results[:10]
    lines = [f"✅ **Gas-invariant Tier-0 audit done** ({dur}s)",
             f"Scanned {len(contracts)} contracts · {verified} verified · **{len(results)} flagged**",
             f"Report: `{report_md}`", "", "**Top flagged (score):**"]
    for n, r in enumerate(top, 1):
        invs = ",".join(sorted(r["per_inv"]))
        lines.append(f"{n}. `{r['addr']}` — score {r['score']} ({invs})")
    summary = "\n".join(lines)
    print("\n" + summary)
    discord(summary)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        tb = traceback.format_exc()
        print(tb)
        discord(f"❌ **Gas-invariant audit FAILED**\n```\n{tb[-1500:]}\n```")
        sys.exit(1)
