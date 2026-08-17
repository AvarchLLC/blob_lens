export type EipStatus = "live" | "upcoming" | "finalized" | "draft";
export type EipFork = "London" | "Berlin" | "Dencun" | "Pectra" | "Fusaka" | "Glamsterdam";

export interface EipOpcode {
  operation: string;
  current: number;
  post: number;
  color: string;
}

// ── Chart data types (pure data — no echarts dep) ────────────────────────────

export interface EipChartBar {
  label: string;
  before?: number;
  after?: number;
  value?: number;
  unit: string;
  color: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export type EipChartKind =
  | "before-after"   // side-by-side bar: current vs post-EIP
  | "distribution"   // horizontal stacked / proportional bars
  | "milestones";    // single-value bars (cumulative progression)

export interface EipChartData {
  kind: EipChartKind;
  title: string;
  subtitle: string;
  badge: string;
  bars: EipChartBar[];
  note?: string;
}

export interface Eip {
  slug: string;
  id: string;
  title: string;
  shortDesc: string;
  longDesc: string;
  fork: EipFork;
  activatedAt?: string;
  status: EipStatus;
  category: string;
  authors: string[];
  link: string;
  pageLink?: string;
  tags: string[];
  impact: {
    headline: string;
    bullets: string[];
  };
  opcodes?: EipOpcode[];
  chartData?: EipChartData;
}

export const EIPS: Eip[] = [
  {
    slug: "eip-1559",
    id: "EIP-1559",
    title: "Fee Market Change (Base Fee + Burn)",
    shortDesc: "Replaced first-price auctions with a protocol-managed base fee that is burned each block.",
    longDesc: "EIP-1559 introduced a new transaction fee mechanism to Ethereum. Rather than a simple first-price auction, it sets a base fee per block that adjusts algorithmically based on congestion — rising when blocks are full, falling when empty. The base fee is burned (removed from supply), making ETH deflationary during high-activity periods. Users can also add a tip (priority fee) to incentivise validators.",
    fork: "London",
    activatedAt: "2021-08-05",
    status: "live",
    category: "Core",
    authors: ["Vitalik Buterin", "Eric Conner", "Rick Dudley", "Matthew Slipper", "Ian Norden"],
    link: "https://eips.ethereum.org/EIPS/eip-1559",
    pageLink: "/market",
    tags: ["fee-market","base-fee","burn","gas","london","type-2"],
    impact: {
      headline: "Predictable gas prices + deflationary ETH",
      bullets: [
        "Replaced chaotic first-price gas auctions with a stable base-fee curve",
        "Base fee burned each block — over 4M ETH burned since activation",
        "Enables Type 2 (EIP-1559) transaction format with maxFee + maxPriorityFee",
        "Fee escalator: base fee adjusts ±12.5% per block toward 50% utilization target",
      ],
    },
    chartData: {
      kind: "milestones",
      title: "Cumulative ETH Burned",
      subtitle: "ETH removed from supply via base fee burn since London (Aug 2021)",
      badge: "DEFLATIONARY",
      bars: [
        { label: "Aug 2021 (+1M)",  value: 1.0,  unit: "M ETH", color: "#D97706" },
        { label: "May 2022 (+2M)",  value: 2.0,  unit: "M ETH", color: "#D97706" },
        { label: "Nov 2022 (+3M)",  value: 3.0,  unit: "M ETH", color: "#D97706" },
        { label: "Dec 2023 (+4M)",  value: 4.0,  unit: "M ETH", color: "#D97706" },
        { label: "Today (~4.5M)",   value: 4.5,  unit: "M ETH", color: "#F59E0B" },
      ],
      note: "Each unit = 1M ETH removed from circulating supply",
    },
  },
  {
    slug: "eip-2930",
    id: "EIP-2930",
    title: "Optional Access Lists (Type 1 Transactions)",
    shortDesc: "Adds a transaction type that can include an access list of addresses and storage keys.",
    longDesc: "EIP-2930 introduced Type 1 transactions which include an access list — a list of addresses and storage keys the transaction will access. Pre-declaring accesses reduces gas costs for those slots and warms the EVM's access set, helping mitigate gas cost increases from EIP-2929. Access lists are optional and most users still use Type 0 (legacy) or Type 2 (EIP-1559) transactions.",
    fork: "Berlin",
    activatedAt: "2021-04-15",
    status: "live",
    category: "Core",
    authors: ["Vitalik Buterin", "Martin Swende"],
    link: "https://eips.ethereum.org/EIPS/eip-2930",
    tags: ["access-list","type-1","berlin","gas"],
    impact: {
      headline: "Gas savings for contracts with known storage access patterns",
      bullets: [
        "Pre-warming storage slots reduces SLOAD cost from 2100 → 100 gas on warm access",
        "Type 1 transactions are rarely used in practice (<1% of all txs)",
        "Enables structured access planning for MEV searchers and complex DeFi interactions",
      ],
    },
    chartData: {
      kind: "distribution",
      title: "Transaction Type Share (2026)",
      subtitle: "Current distribution of Ethereum transaction types by count",
      badge: "TX TYPES",
      bars: [
        { label: "Type 0 — Legacy",    value: 28,  unit: "%", color: "#64748B", beforeLabel: "Legacy (pre-EIP-1559)" },
        { label: "Type 1 — Access List", value: 0.8, unit: "%", color: "#0891B2", beforeLabel: "EIP-2930 (rare)" },
        { label: "Type 2 — EIP-1559",  value: 61,  unit: "%", color: "#D97706", beforeLabel: "Most wallets" },
        { label: "Type 3 — Blob",      value: 10.2, unit: "%", color: "#2563EB", beforeLabel: "EIP-4844 rollups" },
      ],
      note: "Type 1 adoption remains <1% — access lists add complexity for marginal savings in most cases",
    },
  },
  {
    slug: "eip-4844",
    id: "EIP-4844",
    title: "Proto-Danksharding (Blob Transactions)",
    shortDesc: "Adds a new transaction type carrying 'blobs' of data — a cheap data availability layer for L2 rollups.",
    longDesc: "EIP-4844 introduced blob-carrying transactions (Type 3) to Ethereum. Each blob holds 128 KB of data that is cheap to post but is pruned from nodes after ~18 days (not permanently stored in the EVM state). This dramatically reduced L2 rollup posting costs because rollups can post batch data as blobs rather than expensive calldata. The blob fee market is separate from the gas fee market, with its own exponential escalator targeting 3 blobs/block (6 max).",
    fork: "Dencun",
    activatedAt: "2024-03-13",
    status: "live",
    category: "Core",
    authors: ["Vitalik Buterin", "Dankrad Feist", "Diederik Loerakker", "George Kadianakis", "Matt Garnett", "Mofi Taiwo", "Ansgar Dietrichs"],
    link: "https://eips.ethereum.org/EIPS/eip-4844",
    pageLink: "/market",
    tags: ["blob","dencun","kzg","proto-danksharding","type-3","4844","l2","rollup","da"],
    impact: {
      headline: "90–99% reduction in L2 data posting costs",
      bullets: [
        "Blob data costs 1 gas unit vs calldata at 16 gas/byte — ~100× cheaper per byte",
        "Each blob holds 128 KB; max 6 blobs/block (target: 3)",
        "Independent blob fee market: base fee escalates exponentially above 50% utilization",
        "Data is pruned after ~18 days — not stored permanently in Ethereum state",
        "Enabled L2 transaction fees to drop from dollars to cents within days of activation",
      ],
    },
    chartData: {
      kind: "before-after",
      title: "L2 Batch Data Cost per KB",
      subtitle: "Cost to post 1 KB of rollup batch data on Ethereum L1",
      badge: "COST REDUCTION",
      bars: [
        { label: "Calldata (pre-Dencun)", before: 2500, after: 0,   unit: "USD / MB", color: "#DC2626", beforeLabel: "~$2.50 / MB", afterLabel: "" },
        { label: "Blob (post-Dencun)",    before: 0,    after: 20,  unit: "USD / MB", color: "#2563EB", beforeLabel: "",             afterLabel: "~$0.02 / MB" },
      ],
      note: "Blob data is ~125× cheaper per byte than equivalent calldata at equal gas prices",
    },
  },
  {
    slug: "eip-7691",
    id: "EIP-7691",
    title: "Blob Throughput Increase",
    shortDesc: "Raised the blob target from 3→4 and maximum from 6→8 blobs per block.",
    longDesc: "EIP-7691 increased blob throughput in the Pectra upgrade. The target was raised from 3 to 4 blobs per block, and the maximum from 6 to 8. This provides more headroom for rollup data posting before the fee escalator activates, effectively doubling the amount of cheap DA available per block compared to the original Dencun parameters.",
    fork: "Pectra",
    activatedAt: "2025-05-07",
    status: "live",
    category: "Core",
    authors: ["Gajinder Singh", "Toni Wahrstätter"],
    link: "https://eips.ethereum.org/EIPS/eip-7691",
    pageLink: "/market",
    tags: ["blob","pectra","throughput","7691","da","rollup"],
    impact: {
      headline: "+33% blob capacity per block",
      bullets: [
        "Target: 3 → 4 blobs/block; Maximum: 6 → 8 blobs/block",
        "More headroom before the exponential fee escalator activates",
        "Further reduced L2 batch posting costs for high-throughput rollups",
        "Fee escalator threshold updated to target 50% of new 8-blob maximum",
      ],
    },
    chartData: {
      kind: "before-after",
      title: "Blob Slots Per Block",
      subtitle: "Target and maximum blob count per block — Dencun vs Pectra",
      badge: "THROUGHPUT",
      bars: [
        { label: "Target Blobs", before: 3, after: 4, unit: "blobs/block", color: "#059669", beforeLabel: "Dencun: 3", afterLabel: "Pectra: 4 (+33%)" },
        { label: "Max Blobs",    before: 6, after: 8, unit: "blobs/block", color: "#10B981", beforeLabel: "Dencun: 6", afterLabel: "Pectra: 8 (+33%)" },
      ],
      note: "Both target and max raised by 33% — DA headroom doubles at peak capacity",
    },
  },
  {
    slug: "eip-7904",
    id: "EIP-7904",
    title: "EVM Compute Gas Repricing",
    shortDesc: "Glamsterdam upgrade reprices EVM opcodes based on measured compute benchmarks, cutting costs ~78% for most operations.",
    longDesc: "EIP-7904 is part of the Glamsterdam upgrade and proposes benchmark-driven repricing of EVM opcodes. Modern hardware executes EVM operations far faster than the original gas costs assumed. By measuring actual CPU cycles per opcode on reference hardware and setting gas costs proportionally, EIP-7904 realigns gas with real computation. This dramatically reduces costs for common operations like ETH transfers, ERC-20 transfers, SLOAD, SSTORE, and CALL.",
    fork: "Glamsterdam",
    status: "upcoming",
    category: "Core",
    authors: ["Vitalik Buterin", "Ansgar Dietrichs"],
    link: "https://eips.ethereum.org/EIPS/eip-7904",
    pageLink: "/gas",
    tags: ["7904","glamsterdam","gas","opcode","evm","compute","repricing","benchmark"],
    impact: {
      headline: "~78% gas reduction for most EVM operations",
      bullets: [
        "ETH transfer: 21,000 → 4,600 gas (−78%)",
        "ERC-20 transfer: 65,000 → 14,000 gas (−78%)",
        "SLOAD (cold): 800 → 200 gas (−75%)",
        "SSTORE (cold): 22,100 → 4,800 gas (−78%)",
        "CALL: 700 → 140 gas (−80%)",
        "Gas costs now derived from CPU benchmark measurements, not historical estimates",
        "Maintains same relative ordering — expensive ops remain expensive",
      ],
    },
    opcodes: [
      { operation: "ETH Transfer",    current: 21000, post: 4600,  color: "#2563EB" },
      { operation: "ERC-20 Transfer", current: 65000, post: 14000, color: "#059669" },
      { operation: "SLOAD (cold)",    current: 800,   post: 200,   color: "#D97706" },
      { operation: "SSTORE (cold)",   current: 22100, post: 4800,  color: "#DC2626" },
      { operation: "CALL",            current: 700,   post: 140,   color: "#7C3AED" },
      { operation: "MULMOD",          current: 8,     post: 3,     color: "#64748B" },
      { operation: "ADDMOD",          current: 8,     post: 3,     color: "#0891B2" },
      { operation: "CREATE",          current: 32000, post: 7100,  color: "#D946EF" },
    ],
    // EIP-7904 uses the opcodes chart — chartData not needed
  },
  {
    slug: "eip-8184",
    id: "EIP-8184",
    title: "Encrypted Mempool (Lucid Protocol)",
    shortDesc: "Introduces threshold-encrypted transaction inclusion to prevent frontrunning and sandwich attacks before transaction ordering.",
    longDesc: "EIP-8184 proposes a threshold-encrypted mempool called Lucid. Transactions are encrypted when submitted and only decrypted after the block proposer has committed to an ordering. This prevents MEV bots from reading pending transactions and inserting frontrun or sandwich transactions ahead of victims. The protocol uses a distributed committee of validators to hold encryption keys, with threshold decryption ensuring no single party can decrypt early.",
    fork: "Glamsterdam",
    status: "upcoming",
    category: "Core",
    authors: ["Justin Drake", "Barnabé Monnot"],
    link: "https://eips.ethereum.org/EIPS/eip-8184",
    pageLink: "/encrypted-mempool",
    tags: ["8184","glamsterdam","encrypted","mempool","lucid","mev","privacy","frontrunning","sandwich"],
    impact: {
      headline: "Cryptographic protection against mempool MEV",
      bullets: [
        "Transactions are encrypted before entering the public mempool",
        "Block proposer commits to ordering before decryption keys are released",
        "Eliminates most frontrunning and sandwich attack vectors",
        "Requires distributed key committee — adds latency vs standard txs (~200–400ms)",
        "Opt-in initially: senders choose encrypted or public submission",
      ],
    },
    chartData: {
      kind: "before-after",
      title: "MEV Attack Surface by Category",
      subtitle: "Estimated MEV extractable volume per attack type — before vs after EIP-8184",
      badge: "MEV REDUCTION",
      bars: [
        { label: "Frontrunning",      before: 100, after: 5,  unit: "% exposure", color: "#DC2626", beforeLabel: "100% exposed", afterLabel: "~5% residual" },
        { label: "Sandwich Attacks",  before: 100, after: 8,  unit: "% exposure", color: "#D97706", beforeLabel: "100% exposed", afterLabel: "~8% residual" },
        { label: "JIT Liquidity MEV", before: 60,  after: 45, unit: "% exposure", color: "#7C3AED", beforeLabel: "60% exposed",  afterLabel: "~45% (ordering-based)" },
        { label: "Backrunning",       before: 100, after: 85, unit: "% exposure", color: "#64748B", beforeLabel: "100% exposed", afterLabel: "~85% (order-commit leak)" },
      ],
      note: "Frontrun/sandwich eliminated by commit-reveal. Backrun and JIT partially persist — depend on ordering intent, not tx content.",
    },
  },
];

export function getEip(slug: string): Eip | undefined {
  return EIPS.find(e => e.slug === slug);
}

export const FORKS: EipFork[] = ["Berlin", "London", "Dencun", "Pectra", "Fusaka", "Glamsterdam"];

export const FORK_META: Record<EipFork, { date?: string; status: "live" | "upcoming"; color: string }> = {
  Berlin:      { date: "2021-04-15", status: "live",     color: "#64748B" },
  London:      { date: "2021-08-05", status: "live",     color: "#D97706" },
  Dencun:      { date: "2024-03-13", status: "live",     color: "#2563EB" },
  Pectra:      { date: "2025-05-07", status: "live",     color: "#059669" },
  Fusaka:      { date: "2026-04-08", status: "live",     color: "#7C3AED" },
  Glamsterdam: {                     status: "upcoming",  color: "#F59E0B" },
};
