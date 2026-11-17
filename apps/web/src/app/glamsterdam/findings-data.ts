// Glamsterdam repricing-impact findings (BlobLens gas-audit, Nov 2026).
// Rates from a differential replay of top contracts x 50 recent txs under
// Osaka vs Amsterdam (EIP-8037/8038) against our Reth archive node.
// Inferred candidates confirmed by replay; see the gas-audit tooling.

export type HardBreak = {
  addr: string;
  name: string;
  rate: string; // e.g. "17 / 50"
  pct: number;
  maxDelta: number;
  mechanism: string;
  repro: string[];
};

export const AA_HARD_BREAKS: HardBreak[] = [
  {
    addr: "0x4337084d9e255ff0702461cf8895ce9e3b5ff108",
    name: "ERC-4337 account / module",
    rate: "25 / 50",
    pct: 50,
    maxDelta: 411180,
    mechanism: 'FailedOp "AA26 over verificationGasLimit"',
    repro: [
      "0x6383301073f00b9d216db250359a0257198fa649dd9c5abd109d058bfbf3655f",
      "0xb2b416ce7b226e32d4347f425704897d59b258efd519616e360332beb04a7b76",
    ],
  },
  {
    addr: "0x0000000071727de22e5e9d8baf0edac6f37da032",
    name: "ERC-4337 EntryPoint v0.7",
    rate: "17 / 50",
    pct: 34,
    maxDelta: 145410,
    mechanism: 'FailedOp "AA26 over verificationGasLimit"',
    repro: [
      "0x8a8a90b19eba53ad802f6b1bc1f6097efca6f2a025b5b3c75e1ba905a54edc5b",
      "0xeae6b6d5588ae4fa9c4975bcdd6b202faa10c38b705da64a4fc8b389f051724b",
    ],
  },
  {
    addr: "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
    name: "ERC-4337 EntryPoint v0.6",
    rate: "13 / 50",
    pct: 26,
    maxDelta: 390125,
    mechanism: 'FailedOp "AA40 over verificationGasLimit"',
    repro: [
      "0xc57171cfdba38d595b0ce7a4ec1695b44c6319710dba83704f3fe5bebddd7d48",
      "0xbd582920fb9317b4ec284b31fdbabea33d8a2ce948aaa3c40d6ba027ee642f0c",
    ],
  },
];

export const OOG_HARD_BREAKS: HardBreak[] = [
  {
    addr: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
    name: "Uniswap V3 Position Manager",
    rate: "3 / 50",
    pct: 6,
    maxDelta: 118880,
    mechanism: "out-of-gas on state-creating mint paths",
    repro: ["0x87c1802703797271cc490daed5936446cbd9dd8562f486fc6c7a7c2426729646"],
  },
  { addr: "0x442be06bb5d13711a22ccd3fa382b72a874c5135", name: "Contract 0x442b…5135", rate: "3 / 50", pct: 6, maxDelta: 0, mechanism: "out-of-gas", repro: ["0xad7a2816da106a1ec865e3b0cb503c5959043efa554b92c28247d8317aa26e9b"] },
  { addr: "0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6", name: "Contract 0xbdb3…47b6", rate: "2 / 50", pct: 4, maxDelta: 430640, mechanism: "out-of-gas", repro: [] },
];

export type FixedGas = { addr: string; name: string; flips: string };

export const FIXED_GAS: FixedGas[] = [
  { addr: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", name: "Uniswap Universal Router", flips: "41 / 50" },
  { addr: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", name: "Uniswap V2 Router 02", flips: "37 / 50" },
  { addr: "0x111111125421ca6dc452d289314280a0f8842a65", name: "1inch Aggregation Router V6", flips: "32 / 50" },
  { addr: "0x0fef9e88a7b76bcdbf451780c6774fe32965ee98", name: "Router / settlement 0x0fef…ee98", flips: "48 / 50" },
  { addr: "0x0729e2a4716d9f7dd17858d5d504426d228697f7", name: "Router 0x0729…97f7", flips: "47 / 50" },
  { addr: "0x23617e59a5925b2a4bf75d73ff6711cd0b29de85", name: "Router 0x2361…de85", flips: "42 / 50" },
];

export const AUDIT_COMPARISON = {
  others: [
    { who: "Dedaub", scope: "OP Stack bridge, Snowbridge, Lido CCIP, CoW×Aave flash-loan, Aave oracle, 1inch" },
    { who: "ChainSecurity", scope: "try/catch & out-of-gas invariants, gas-repricing mechanics" },
    { who: "Jango (Juicebox)", scope: "composability component-skip, hardcoded cross-chain gas (OP Stack)" },
  ],
  ours: "ERC-4337 Account Abstraction (EntryPoint v0.6 & v0.7), absent from all of the above.",
};

export const STATS = {
  scanned: 300,
  flagged: 115,
  replayed: 25,
  txsEach: 50,
};

// Chart dataset: hard-break rate and worst-case extra gas per contract.
// kind drives color: aa (danger), oog (secondary break), fixed (user-fixable).
export type ChartRow = { name: string; hardPct: number; maxDelta: number; kind: "aa" | "oog" | "fixed" };

// Per-invariant breakdown: how many of the 115 flagged contracts touch each of
// the 8 Glamsterdam invariants (from the static scan).
export type Invariant = { id: string; plain: string; count: number };
export const INVARIANTS: Invariant[] = [
  { id: "INV-1", plain: "A failed inner call no longer fails the whole transaction", count: 96 },
  { id: "INV-3", plain: "A reverted call now hands gas back to the caller", count: 73 },
  { id: "INV-6", plain: "Leftover gas after an out-of-gas call is now enough to keep going", count: 32 },
  { id: "INV-7", plain: "Fixed gas reserves and stipends are now too small", count: 32 },
  { id: "INV-2", plain: "Clearing a slot refunds gas mid-transaction", count: 28 },
  { id: "INV-4", plain: "Hard-coded gas amounts are now too low", count: 25 },
  { id: "INV-8", plain: "A failed EIP-7702 delegation can be replayed", count: 20 },
  { id: "INV-5", plain: "gasleft() can now go up, breaking gas metering", count: 12 },
];
export const FLAGGED_TOTAL = 115;

// Create-and-self-destruct in one tx (temporary deposit addresses etc.).
export const CREATE_SELFDESTRUCT = {
  perDay: 3456, // our count; EF commenter (milonite) reported ~2,100/day
  costUpTo: "2.8×",
  stateGas: 183600,
  repro: [
    "0x4de12d08fdc7a81fd302839e647c94993ea04a21cd7ddd721ffa29dafa417b24",
    "0x5852256b169191bb0330ea2f60ee947b8ddbdf29f34487c14ad0d913c58b92f6",
    "0x42e67723d63d6399ccc7162a5474dbadfa602d85c511d235897b650df7715853",
  ],
};

export const CONTRACTS: ChartRow[] = [
  { name: "4337 module", hardPct: 50, maxDelta: 411180, kind: "aa" },
  { name: "EntryPoint v0.7", hardPct: 34, maxDelta: 145410, kind: "aa" },
  { name: "EntryPoint v0.6", hardPct: 26, maxDelta: 390125, kind: "aa" },
  { name: "UniV3 Position Mgr", hardPct: 6, maxDelta: 118880, kind: "oog" },
  { name: "0x442b…5135", hardPct: 6, maxDelta: 0, kind: "oog" },
  { name: "0xbdb3…47b6", hardPct: 4, maxDelta: 430640, kind: "oog" },
  { name: "Universal Router", hardPct: 0, maxDelta: 89400, kind: "fixed" },
  { name: "1inch Router V6", hardPct: 0, maxDelta: 97984, kind: "fixed" },
  { name: "V2 Router 02", hardPct: 0, maxDelta: 46300, kind: "fixed" },
  { name: "Router 0x0729…", hardPct: 0, maxDelta: 514020, kind: "fixed" },
];
