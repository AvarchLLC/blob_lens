#!/usr/bin/env python3
"""
Tier-0 gas-repricing invariant scanner (BlobLens gas-audit).

Static pass that mirrors the ethereum/glamsterdam-gas-invariants AGENTS.md
procedure: scan Solidity source for the INV-1..8 red-flag patterns, map each
hit to its invariant, and print a prioritized report. This is the "candidate
search" half of what ChainSecurity/Dedaub/EF did; a hit is a place to look,
not a confirmed bug (that needs the Tier-1 replay).

Usage:
    python3 scan.py <file.sol | dir> [more ...]

Not a confirmation. Every finding is "inferred" until replayed under
Glamsterdam rules (EIP-8037/8038).
"""

import re
import sys
from pathlib import Path

# Osaka -> Amsterdam gas deltas, for the estimate hints (EELS-measured).
GAS_TABLE = {
    "new storage slot (cold)": "22,100 -> 110,020  (+87,920)",
    "existing slot update (warm/cold)": "2,900/5,000 -> 10,100/12,100",
    "new account (value transfer)": "25,000 -> 183,600 + exec",
    "CREATE/CREATE2 to empty addr": "32,000 -> 195,600",
    "code deposit (per byte)": "200 -> 1,530",
    "EIP-7702 auth (empty authority)": "25,000 -> 235,606",
}

# (invariant_id, priority, one-line assumption, [ (regex, note) ... ], fix)
# Priority: 1 = check first (INV-4, INV-7 drove most real findings), 2, 3.
INVARIANTS = [
    ("INV-4", 1, "A fixed gas amount is enough for the job", [
        (r"\{?\s*gas\s*:", "explicit gas forwarded to a call"),
        (r"[Gg]as[Ll]imit", "a gas limit value"),
        (r"\bsafeTxGas\b", "Safe-style signed gas limit"),
        (r"\bcallbackGas\b|\bminDstGas\b", "cross-chain / callback gas limit"),
        (r"\bGAS_[A-Z0-9_]+\b", "hard-coded GAS_* constant"),
    ], "Make gas limits adjustable; estimate under the new prices and add margin."),

    ("INV-7", 1, "Gas reserves and stipends sized for today are enough", [
        (r"\bRESERVE\b|\breserve[A-Z]", "a fixed gas reserve"),
        (r"gasleft\(\)\s*[><]=?", "comparing gasleft() against a threshold"),
        (r"\.transfer\(", ".transfer() (2300 stipend cannot create a slot)"),
        (r"\.send\(", ".send() (2300 stipend cannot create a slot)"),
    ], "Make reserves adjustable or avoid them; don't rely on the 2300 stipend to write state."),

    ("INV-1", 2, "If a call runs out of gas, the whole transaction fails", [
        (r"\.call\{", "low-level call with options"),
        (r"\.call\(", "low-level call"),
        (r"\btry\b", "try/catch around an external call"),
        (r"\bcatch\b", "catch block"),
        (r"\bdelegatecall\b", "delegatecall"),
    ], "Let failed items be retried, or revert when the call got too little gas."),

    ("INV-6", 2, "After an OOG call, the 1/64 left is too little to do anything", [
        (r"\.call\(", "a call with (possibly) no gas check before a permanent write"),
        (r"gasleft\(\)\s*/\s*63", "the 1/63 OOG-detection trick"),
    ], "Check there is enough gas before the call, and let failures be retried."),

    ("INV-3", 2, "Gas used by a call that reverts is gone", [
        (r"reason\.length\s*==\s*0", "guessing OOG from empty revert data"),
        (r"returndatasize\(\)", "inspecting returndatasize to infer failure cause"),
        (r"\bcreate2?\(", "raw CREATE/CREATE2 (check the result!)"),
        (r"\bnew\s+[A-Z]\w*\{.*salt", "CREATE2 via new X{salt:...}"),
    ], "Check the result of CREATE; do not guess why a call failed from the gas."),

    ("INV-5", 3, "gasleft() only goes down, so start-minus-end is the cost", [
        (r"gasleft\(\)", "gasleft() reading (watch for two in one function)"),
        (r"\bgasUsed\b|\bstartGas\b|\bgasStart\b", "metering by gas difference"),
    ], "Do not bill by gasleft() differences; charge an agreed fee or clamp the measurement."),

    ("INV-2", 3, "Clearing a slot set earlier in the same tx gives no gas back until the end", [
        (r"\bdelete\s+", "a storage delete"),
        (r"approve\(.*,\s*0\s*\)", "approve(..., 0) reset"),
    ], "Use transient storage for locks/flags, or keep their resting value non-zero."),

    ("INV-8", 3, "A 7702 delegation in a mined tx was applied and cannot be reused", [
        (r"\binitialize\s*\(", "an initialize() anyone may call"),
        (r"\bsetup\s*\(", "a setup() anyone may call"),
        (r"0xef0100", "a 7702 delegation designator"),
    ], "Tie setup to the signature; check the account's code after the transaction."),
]


def scan_text(text: str):
    findings = []
    lines = text.splitlines()
    for inv_id, prio, assumption, patterns, fix in INVARIANTS:
        for pat, note in patterns:
            rx = re.compile(pat)
            for i, line in enumerate(lines, 1):
                s = line.strip()
                # Skip pure comment lines to cut noise.
                if s.startswith("//") or s.startswith("*") or s.startswith("/*"):
                    continue
                if rx.search(line):
                    findings.append((prio, inv_id, assumption, note, i, s[:110], fix))
    return findings


def gather(paths):
    files = []
    for p in paths:
        pp = Path(p)
        if pp.is_dir():
            files += list(pp.rglob("*.sol"))
        elif pp.suffix == ".sol":
            files.append(pp)
    return files


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    files = gather(sys.argv[1:])
    if not files:
        print("No .sol files found.")
        sys.exit(1)

    total = 0
    per_inv = {}
    for f in files:
        text = f.read_text(errors="ignore")
        findings = scan_text(text)
        if not findings:
            continue
        findings.sort(key=lambda x: (x[0], x[1], x[4]))
        print(f"\n{'='*78}\n  {f}\n{'='*78}")
        cur = None
        for prio, inv_id, assumption, note, ln, src, fix in findings:
            total += 1
            per_inv[inv_id] = per_inv.get(inv_id, 0) + 1
            if inv_id != cur:
                cur = inv_id
                tag = "CHECK FIRST" if prio == 1 else f"priority {prio}"
                print(f"\n  [{inv_id}] ({tag}) old assumption now false: {assumption}")
                print(f"        fix: {fix}")
            print(f"    L{ln:<5} {note}")
            print(f"           | {src}")

    print(f"\n{'='*78}\n  SUMMARY  (inferred red flags, not confirmed bugs)\n{'='*78}")
    for inv_id in sorted(per_inv):
        print(f"    {inv_id}: {per_inv[inv_id]} hit(s)")
    print(f"    TOTAL: {total} red flags across {len(files)} file(s)")
    print("\n  Gas deltas to estimate against (Osaka -> Amsterdam):")
    for k, v in GAS_TABLE.items():
        print(f"    - {k}: {v}")
    print("\n  Next: replay the real txs of the hit contracts under Glamsterdam"
          "\n  rules (Tier 1) to promote 'inferred' hits to 'confirmed'.")


if __name__ == "__main__":
    main()
