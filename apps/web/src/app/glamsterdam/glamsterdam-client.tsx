"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  AlertTriangle, ShieldAlert, Wrench, ChevronRight,
  FlaskConical, ExternalLink, Cpu, ArrowRight, BarChart3, Fuel, ShieldCheck,
  Layers, Trash2, Info as InfoIcon,
} from "lucide-react";
import type { EChartsOption } from "echarts";
import { DottedCard } from "@/components/ui/dotted-card";
import { EChartWrapper } from "@/components/charts/echart-wrapper";
import {
  AA_HARD_BREAKS, OOG_HARD_BREAKS, FIXED_GAS, STATS, CONTRACTS,
  INVARIANTS, FLAGGED_TOTAL, CREATE_SELFDESTRUCT,
  type HardBreak,
} from "./findings-data";

const txUrl = (h: string) => `https://etherscan.io/tx/${h}`;
const addrUrl = (a: string) => `https://etherscan.io/address/${a}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const KIND = { aa: "#E5484D", oog: "#F2A33C", fixed: "#9B9BAE" } as const;

/* ── Section header (mono badge + dashed rule) ── */
function SectionHeader({ icon: Icon, title, hint }: { icon: React.ComponentType<{ className?: string }>; title: string; hint?: string }) {
  return (
    <div className="mt-8 mb-3 flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] border border-[var(--primary-border)] bg-[var(--primary-bg)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--primary-text)]">
        <Icon className="h-3 w-3" /> {title}
      </span>
      {hint && <span className="hidden truncate text-[11px] text-[var(--text-muted)] sm:block">{hint}</span>}
      <div className="flex-1 border-t border-dashed border-[var(--border)]" />
    </div>
  );
}

/* ── Collapsible inline info note (keeps the default view light) ── */
function Info({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group/info mt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--primary-text)]">
        <InfoIcon className="h-3 w-3" /> {summary}
        <ChevronRight className="h-3 w-3 transition-transform group-open/info:rotate-90" />
      </summary>
      <div className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">{children}</div>
    </details>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-3xl font-bold text-[var(--accent-text)]">{value}</span>
      <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

function BreakRow({ b }: { b: HardBreak }) {
  return (
    <details className="group border-t border-[var(--border)] py-2.5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{b.name}</span>
          <a href={addrUrl(b.addr)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
             className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--primary-text)]">{short(b.addr)}</a>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-sm font-bold text-[var(--accent-text)]">{b.rate}</span>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <div className="mt-2 space-y-1.5 pl-1 text-xs text-[var(--text-secondary)]">
        <p>Reverts with <span className="font-mono text-[var(--accent-text)]">{b.mechanism}</span>{b.maxDelta ? `, up to +${b.maxDelta.toLocaleString()} gas.` : "."}</p>
        {b.repro.length > 0 && (
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--text-muted)]">verify on-chain:</span>
            {b.repro.map((h) => (
              <a key={h} href={txUrl(h)} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--primary-text)] hover:border-[var(--primary-border)]">
                {short(h)}<ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
          </p>
        )}
      </div>
    </details>
  );
}

export function GlamsterdamClient() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const axisColor = isDark ? "#8E8EA8" : "#555566";
  const split = isDark ? "#1A1A24" : "#F0F0F4";

  const baseTooltip = {
    trigger: "axis" as const, confine: true,
    backgroundColor: isDark ? "#121217" : "#FFFFFF",
    borderColor: isDark ? "#3A3275" : "#CBC4FA", borderWidth: 1, padding: [8, 12] as [number, number],
    textStyle: { color: isDark ? "#F4F4F8" : "#1A1A24", fontFamily: "var(--font-mono)", fontSize: 12 },
  };

  // Chart 1: hard-break rate per contract (sorted asc so highest is on top).
  const rateOption: EChartsOption = useMemo(() => {
    const rows = [...CONTRACTS].sort((a, b) => a.hardPct - b.hardPct);
    return {
      backgroundColor: "transparent",
      grid: { top: 8, right: 44, bottom: 20, left: 10, containLabel: true },
      tooltip: { ...baseTooltip, formatter: (p: any) => `${p[0].name}<br/><b>${p[0].value}%</b> of userOps hard-break` },
      xAxis: { type: "value", max: 55, axisLine: { show: false }, splitLine: { lineStyle: { color: split, type: "dashed" } }, axisLabel: { color: axisColor, fontFamily: "var(--font-mono)", fontSize: 10, formatter: (v: number) => `${v}%` } },
      yAxis: { type: "category", data: rows.map((r) => r.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: axisColor, fontFamily: "var(--font-mono)", fontSize: 11 } },
      series: [{
        type: "bar", barWidth: 13,
        data: rows.map((r) => ({ value: r.hardPct, itemStyle: { color: KIND[r.kind], borderRadius: [0, 3, 3, 0] } })),
        label: { show: true, position: "right", color: axisColor, fontFamily: "var(--font-mono)", fontSize: 10, formatter: (p: any) => (p.value ? `${p.value}%` : "0") },
      }],
    };
  }, [isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart 2: worst-case extra gas per contract.
  const gasOption: EChartsOption = useMemo(() => {
    const rows = [...CONTRACTS].filter((r) => r.maxDelta > 0).sort((a, b) => a.maxDelta - b.maxDelta);
    return {
      backgroundColor: "transparent",
      grid: { top: 8, right: 54, bottom: 20, left: 10, containLabel: true },
      tooltip: { ...baseTooltip, formatter: (p: any) => `${p[0].name}<br/>+<b>${Number(p[0].value).toLocaleString()}</b> gas under Glamsterdam` },
      xAxis: { type: "value", axisLine: { show: false }, splitLine: { lineStyle: { color: split, type: "dashed" } }, axisLabel: { color: axisColor, fontFamily: "var(--font-mono)", fontSize: 10, formatter: (v: number) => `${Math.round(v / 1000)}k` } },
      yAxis: { type: "category", data: rows.map((r) => r.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: axisColor, fontFamily: "var(--font-mono)", fontSize: 11 } },
      series: [{
        type: "bar", barWidth: 13,
        data: rows.map((r) => ({ value: r.maxDelta, itemStyle: { color: KIND[r.kind], borderRadius: [0, 3, 3, 0] } })),
        label: { show: true, position: "right", color: axisColor, fontFamily: "var(--font-mono)", fontSize: 10, formatter: (p: any) => `+${Math.round(Number(p.value) / 1000)}k` },
      }],
    };
  }, [isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart 3: per-invariant breakdown (which assumptions break, how widely).
  const invOption: EChartsOption = useMemo(() => {
    const rows = [...INVARIANTS].sort((a, b) => a.count - b.count);
    const drove = new Set(["INV-4", "INV-7"]); // the ones behind the real hard-breaks
    return {
      backgroundColor: "transparent",
      grid: { top: 8, right: 40, bottom: 20, left: 10, containLabel: true },
      tooltip: { ...baseTooltip, formatter: (p: any) => `${p[0].name}<br/>${rows.find(r => r.id === p[0].name)?.plain ?? ""}<br/><b>${p[0].value}</b> of ${FLAGGED_TOTAL} flagged contracts` },
      xAxis: { type: "value", axisLine: { show: false }, splitLine: { lineStyle: { color: split, type: "dashed" } }, axisLabel: { color: axisColor, fontFamily: "var(--font-mono)", fontSize: 10 } },
      yAxis: { type: "category", data: rows.map((r) => r.id), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: axisColor, fontFamily: "var(--font-mono)", fontSize: 11 } },
      series: [{
        type: "bar", barWidth: 12,
        data: rows.map((r) => ({ value: r.count, itemStyle: { color: drove.has(r.id) ? "#E5484D" : (isDark ? "#6E62C8" : "#8B7FE8"), borderRadius: [0, 3, 3, 0] } })),
        label: { show: true, position: "right", color: axisColor, fontFamily: "var(--font-mono)", fontSize: 10 },
      }],
    };
  }, [isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto w-full max-w-7xl py-6">
      {/* Hero */}
      <div className="space-y-2.5">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-[2rem]">What Glamsterdam breaks</h1>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Ethereum&apos;s next upgrade makes on-chain storage cost more gas. We re-ran real,
          recent transactions under both today&apos;s rules and the new rules. Most apps just
          need to send a bit more gas, but <span className="font-semibold text-[var(--text-primary)]">smart-contract wallets (Account Abstraction)
          genuinely break</span>, which the professional audits didn&apos;t cover.
        </p>
        <div className="flex items-center gap-2 rounded-[4px] border border-dashed border-[var(--primary-border)] bg-[var(--primary-bg)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--primary-text)]" />
          Every number here is a real transaction you can open on Etherscan. It succeeds today and reverts under the new rules.
        </div>
      </div>

      {/* Plain-English explainer */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[6px] border border-dashed border-[var(--border)] bg-[var(--surface-sunken)] p-3.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--primary-text)]">What&apos;s changing</p>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
            <Link href="https://eips.ethereum.org/EIPS/eip-8037" target="_blank" className="text-[var(--primary-text)] hover:underline">EIP-8037</Link> and{" "}
            <Link href="https://eips.ethereum.org/EIPS/eip-8038" target="_blank" className="text-[var(--primary-text)] hover:underline">EIP-8038</Link>{" "}
            rework how much gas Ethereum charges for creating and touching storage. Apps built
            on the old costs can behave differently, or fail, without changing a line of code.
          </p>
        </div>
        <div className="rounded-[6px] border border-dashed border-[var(--border)] bg-[var(--surface-sunken)] p-3.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--primary-text)]">Two kinds of impact</p>
          <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-secondary)]">
            <li><span className="text-[var(--accent-text)]">●</span> <b className="text-[var(--text-primary)]">Hard-break:</b> fails outright, can&apos;t just add gas (Account Abstraction).</li>
            <li><span className="text-amber-500">●</span> <b className="text-[var(--text-primary)]">Fixable:</b> works, just costs more or needs a higher gas limit (routers).</li>
          </ul>
        </div>
      </div>

      {/* The finding: stats + rate chart side by side */}
      <SectionHeader icon={ShieldAlert} title="The finding" hint="Account Abstraction wallets revert under Glamsterdam" />
      <div className="grid gap-4 lg:grid-cols-5">
        <DottedCard className="lg:col-span-2" title="Why AA breaks" badge="signed limit" badgeType="danger">
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                An ERC-4337 <em>UserOperation</em> carries a <span className="font-semibold text-[var(--text-primary)]">signed</span> gas budget for
                verification. The new rules make verification cost more, so it blows that budget
                and the whole op reverts.
              </p>
              <Info summary="Why can't it just send more?">
                The budget is signed into the request, so raising it means re-signing. In-flight
                and pre-signed userOps can&apos;t be fixed at all.
              </Info>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="v0.7 fail" value="34%" />
              <Stat label="v0.6 fail" value="26%" />
              <Stat label="module fail" value="50%" />
            </div>
          </div>
        </DottedCard>
        <DottedCard className="lg:col-span-3" title="Hard-break rate" subtitle="% of 50 recent txs that fail, by contract" badge="verified by replay" badgeType="iris">
          <EChartWrapper option={rateOption} style={{ height: "230px", width: "100%" }} showFooter={false} />
        </DottedCard>
      </div>

      {/* Verifiable AA list */}
      <div className="mt-4">
        <DottedCard title="The three AA contracts" subtitle="expand to verify on-chain">
          {AA_HARD_BREAKS.map((b) => <BreakRow key={b.addr} b={b} />)}
        </DottedCard>
      </div>

      {/* Contrast */}
      <SectionHeader icon={BarChart3} title="Breaks vs fixable" hint="the whole story in two buckets" />
      <div className="grid gap-4 md:grid-cols-2">
        <DottedCard title="Genuinely breaks" badge="hard" badgeType="danger">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-text)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Account Abstraction wallets.</span> Even with 3× the gas they still fail,
              because the limit is signed inside the request.
            </p>
          </div>
        </DottedCard>
        <DottedCard title="Just needs more gas" badge="fixable" badgeType="warning">
          <div className="flex items-start gap-2">
            <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Swap routers &amp; aggregators</span> (Uniswap, 1inch, …). They
              &quot;fail&quot; only because the user&apos;s gas limit is now too low. Raising it
              makes them pass again. Not a contract bug.
            </p>
          </div>
        </DottedCard>
      </div>

      {/* Second finding: create + self-destruct */}
      <SectionHeader icon={Trash2} title="Also affected" hint="temporary deposit addresses" />
      <DottedCard title="Create-and-throw-away contracts" badge={`~${CREATE_SELFDESTRUCT.perDay.toLocaleString()}/day`} badgeType="warning">
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Lots of flows (payment processors, bridge aggregators) spin up a throwaway
            contract, a one-time deposit address, sweep the funds, and destroy it in the same
            transaction. Today that&apos;s cheap; under Glamsterdam the cost jumps
            up to <span className="font-semibold text-[var(--accent-text)]">{CREATE_SELFDESTRUCT.costUpTo}</span>.
          </p>
          <Info summary="Why it costs more">
            It&apos;s charged the <span className="font-semibold text-[var(--text-primary)]">full {CREATE_SELFDESTRUCT.stateGas.toLocaleString()} gas</span> for
            creating an account <em>even though nothing is left behind</em>. Flows with a fixed
            gas limit simply fail.
          </Info>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Stat label="run per day (mainnet)" value={`~${(CREATE_SELFDESTRUCT.perDay / 1000).toFixed(1)}k`} />
            <Stat label="more gas, up to" value={CREATE_SELFDESTRUCT.costUpTo} />
          </div>
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)]">verify on-chain:</span>
            {CREATE_SELFDESTRUCT.repro.map((h) => (
              <a key={h} href={txUrl(h)} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--primary-text)] hover:border-[var(--primary-border)]">
                {short(h)}<ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
          </p>
        </div>
      </DottedCard>

      {/* Gas magnitude chart */}
      <SectionHeader icon={Fuel} title="How much more gas" hint="worst-case extra gas per contract under Glamsterdam" />
      <DottedCard title="Extra gas (worst case)" subtitle="red = breaks · grey = fixable, just costs more" badge="per contract" badgeType="default">
        <EChartWrapper option={gasOption} style={{ height: "250px", width: "100%" }} showFooter={false} />
      </DottedCard>

      {/* Per-invariant breakdown */}
      <SectionHeader icon={Layers} title="Which assumptions break" hint="the 8 Glamsterdam invariants, by how many contracts rely on each" />
      <div className="grid gap-4 lg:grid-cols-5">
        <DottedCard className="lg:col-span-3" title="Invariants relied on" subtitle={`of ${FLAGGED_TOTAL} flagged contracts · red = caused the outright breaks`} badge="8 invariants" badgeType="default">
          <EChartWrapper option={invOption} style={{ height: "230px", width: "100%" }} showFooter={false} />
        </DottedCard>
        <DottedCard className="lg:col-span-2" title="In plain words" subtitle="what each one means">
          <ul className="space-y-1.5 text-[11px] text-[var(--text-secondary)]">
            {INVARIANTS.map((i) => (
              <li key={i.id} className="flex gap-2">
                <span className={`shrink-0 font-mono font-bold ${i.id === "INV-4" || i.id === "INV-7" ? "text-[var(--accent-text)]" : "text-[var(--primary-text)]"}`}>{i.id}</span>
                <span>{i.plain}</span>
              </li>
            ))}
          </ul>
        </DottedCard>
      </div>

      {/* How we checked */}
      <SectionHeader icon={FlaskConical} title="How we checked" hint="plain version" />
      <DottedCard>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { n: "1", t: `Scanned the ${STATS.scanned} busiest contracts`, d: `flagged ${STATS.flagged} with risky gas patterns` },
            { n: "2", t: "Took their real recent transactions", d: `${STATS.txsEach} each, from our archive node` },
            { n: "3", t: "Re-ran each under old vs new rules", d: "same state, only the gas rules change" },
            { n: "4", t: "Kept only the real breaks", d: "succeeds today, fails under Glamsterdam" },
          ].map((s) => (
            <div key={s.n} className="flex flex-col gap-1 border-l-2 border-[var(--primary-border)] pl-2.5">
              <span className="font-mono text-xs text-[var(--primary-text)]">STEP {s.n}</span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">{s.t}</span>
              <span className="text-[11px] text-[var(--text-muted)]">{s.d}</span>
            </div>
          ))}
        </div>
      </DottedCard>

      {/* Technical details */}
      <details className="dotted-card mt-4 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Cpu className="h-4 w-4 text-[var(--primary-text)]" /> Technical details
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-4 space-y-4 text-xs text-[var(--text-secondary)]">
          <div>
            <p className="mb-1 font-semibold text-[var(--text-primary)]">Mechanism</p>
            <p>
              The EntryPoint calls <span className="font-mono">account.validateUserOp&#123;gas: verificationGasLimit&#125;</span>.
              Validation reads/writes storage (nonce, deposit, account state), repriced upward by
              EIP-8037/8038, so it exceeds the signed <span className="font-mono">verificationGasLimit</span> and the EntryPoint reverts with
              <span className="font-mono text-[var(--accent-text)]"> FailedOp(…, &quot;AA26/AA40 over verificationGasLimit&quot;)</span>, the
              INV-4 / INV-7 class from
              <Link href="https://github.com/ethereum/glamsterdam-gas-invariants" target="_blank" className="text-[var(--primary-text)] hover:underline"> glamsterdam-gas-invariants</Link>.
            </p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-[var(--text-primary)]">Method</p>
            <p>
              Differential replay with <span className="font-mono">revm@glamsterdam-devnet-8</span> against a Reth archive
              node: each tx forked at its parent block and executed under <span className="font-mono">OSAKA</span> vs
              <span className="font-mono"> AMSTERDAM</span>. A flip (osaka ok → amsterdam revert) is repricing-attributable,
              and each is gas-swept at 3× to split <em>fixed-gas</em> from <em>hard-break</em>.
            </p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-[var(--text-primary)]">Secondary: out-of-gas breaks (non-AA)</p>
            <div>{OOG_HARD_BREAKS.map((b) => <BreakRow key={b.addr} b={b} />)}</div>
          </div>
          <div>
            <p className="mb-1 font-semibold text-[var(--text-primary)]">Fixed-gas (user-fixable) contracts</p>
            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {FIXED_GAS.map((f) => (
                <div key={f.addr} className="flex items-center justify-between gap-2">
                  <a href={addrUrl(f.addr)} target="_blank" rel="noopener noreferrer" className="truncate text-[var(--text-secondary)] hover:text-[var(--primary-text)]">{f.name}</a>
                  <span className="shrink-0 font-mono text-amber-500">{f.flips}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[4px] border border-[var(--border)] bg-[var(--surface-sunken)] p-2.5">
            <p className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>
                Candidates confirmed by replay, not a full audit. Replay forks parent-block state and runs the
                tx first-in-block, so exact gas margins can differ; the osaka-success flip controls for replay
                error. 8037/8038 are still in flux, re-measured per spec change. Affected teams disclosed privately first.
              </span>
            </p>
          </div>
        </div>
      </details>

      <div className="mt-5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <span>BlobLens gas-audit pipeline: scanner → differential replay → confirmed breaks.</span>
        <Link href="/gas" className="inline-flex items-center gap-1 text-[var(--primary-text)] hover:underline">Gas Observatory <ArrowRight className="h-3 w-3" /></Link>
      </div>
    </div>
  );
}
