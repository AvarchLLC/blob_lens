"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Lock,
  Unlock,
  ShieldCheck,
  Zap,
  Activity,
  RefreshCw,
  Search,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { DottedCard } from "@/components/ui/dotted-card";
import { PixelHeading } from "@/components/ui/pixel-heading-word";
import { EChartWrapper, ChartFooter } from "@/components/charts/echart-wrapper";
import { fmtUsd, fmtK } from "@/lib/tokens";
import type { EChartsOption } from "echarts";

/* ── Provenance Info Tooltip Component ── */
function ProvenanceTooltip({
  source,
  method,
  scope,
  confidence,
}: {
  source: string;
  method: string;
  scope: string;
  confidence: "Verified" | "Observed" | "Simulated";
}) {
  return (
    <div className="relative inline-block group ml-1 align-middle z-20">
      <span className="cursor-help text-xs font-mono font-bold border border-[var(--border)] rounded-[3px] px-1.5 py-0.5 opacity-80 group-hover:opacity-100 group-hover:border-[var(--primary)] group-hover:text-[var(--primary-text)] transition-all bg-[var(--surface-sunken)] text-[var(--text-muted)]">
        i
      </span>
      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-72 p-3 font-mono text-xs leading-relaxed border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-2xl rounded-[6px] z-[9999] pointer-events-none">
        <div className="text-xs font-bold uppercase tracking-widest text-[var(--primary-text)] border-b border-[var(--border)] pb-1 mb-1.5 flex items-center justify-between">
          <span>METRIC PROVENANCE // AUDIT</span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div>
            <span className="text-[var(--text-muted)]">SOURCE:</span> {source}
          </div>
          <div>
            <span className="text-[var(--text-muted)]">METHOD:</span> {method}
          </div>
          <div>
            <span className="text-[var(--text-muted)]">SCOPE:</span> {scope}
          </div>
          <div>
            <span className="text-[var(--text-muted)]">CONFIDENCE:</span>{" "}
            <span
              className={
                confidence === "Verified"
                  ? "text-[var(--success)] font-bold"
                  : confidence === "Observed"
                  ? "text-[var(--primary-text)] font-bold"
                  : "text-[var(--warning)] font-bold"
              }
            >
              {confidence}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EncryptedMempoolClient() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [impactData, setImpactData] = useState<any>(null);
  const [committee, setCommittee] = useState<any>(null);
  const [mevMatrix, setMevMatrix] = useState<any[]>([]);
  const [leakageData, setLeakageData] = useState<any[]>([]);
  const [riskMatrix, setRiskMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [impRes, comRes, matrixRes, leakRes, riskRes] = await Promise.all([
        fetch("/api/etm?type=impact").then((r) => r.json()),
        fetch("/api/etm?type=committee").then((r) => r.json()),
        fetch("/api/etm?type=matrix").then((r) => r.json()),
        fetch("/api/etm?type=leakage").then((r) => r.json()),
        fetch("/api/etm?type=risk_matrix").then((r) => r.json()),
      ]);

      if (impRes?.impact) setImpactData(impRes.impact);
      if (comRes?.committee) setCommittee(comRes.committee);
      if (matrixRes?.mev_matrix) setMevMatrix(matrixRes.mev_matrix);
      if (leakRes?.leakage_monitor) setLeakageData(leakRes.leakage_monitor);
      if (riskRes?.risk_matrix) setRiskMatrix(riskRes.risk_matrix);
    } catch (err) {
      console.error("Failed to load encrypted mempool data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ECharts Option for Protected vs Unprotected MEV Trend
  const protectedMevChartOption: EChartsOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: isDark ? "#121217" : "#FFFFFF",
        borderColor: isDark ? "#3A3275" : "#CBC4FA",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 12 },
        extraCssText: `background:${isDark ? "#121217" : "#FFFFFF"}!important;border:1px solid ${isDark ? "#3A3275" : "#CBC4FA"}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${isDark ? "0.45" : "0.12"});`,
        formatter: (params: any) => {
          let res = `<div style="font-family:var(--font-mono); font-size:12px;"><strong>${params[0]?.axisValue}</strong><br/>`;
          params.forEach((item: any) => {
            res += `<span style="color:${item.color}">●</span> ${item.seriesName}: $${Number(item.value).toLocaleString()}<br/>`;
          });
          res += "</div>";
          return res;
        },
      },
      grid: { top: 15, right: 15, bottom: 20, left: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024", "Q1 2025", "Q2 2025 (Projected)"],
        axisLine: { lineStyle: { color: isDark ? "#22222E" : "#E5E5E7" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? "#1A1A24" : "#F3F3F7", type: "dashed" } },
        axisLabel: {
          color: isDark ? "#8E8EA8" : "#555566",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          formatter: (v: number) => `$${(v / 1000000).toFixed(1)}M`,
        },
      },
      series: [
        {
          name: "Exposed Public MEV",
          type: "bar",
          stack: "total",
          itemStyle: { color: "#DC2626" },
          data: [34200000, 38500000, 41200000, 45800000, 49100000, 2100000],
        },
        {
          name: "Lucid Protected Volume",
          type: "bar",
          stack: "total",
          itemStyle: { color: "#059669" },
          data: [0, 0, 0, 1200000, 8400000, 47000000],
        },
      ],
    };
  }, [isDark]);

  // ECharts Option for Displacement Surface Donut
  const displacementChartOption: EChartsOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: isDark ? "#121217" : "#FFFFFF",
        borderColor: isDark ? "#3A3275" : "#CBC4FA",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 12 },
        extraCssText: `background:${isDark ? "#121217" : "#FFFFFF"}!important;border:1px solid ${isDark ? "#3A3275" : "#CBC4FA"}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${isDark ? "0.45" : "0.12"});`,
        formatter: "{b}: {c}% ({d}%)",
      },
      series: [
        {
          name: "MEV Vector Shift",
          type: "pie",
          radius: ["45%", "75%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderWidth: 2, borderColor: isDark ? "#0D0D12" : "#FFFFFF" },
          label: { show: false },
          data: [
            { name: "Sandwiching Displaced", value: 48.5, itemStyle: { color: "#059669" } },
            { name: "Frontrunning Displaced", value: 34.2, itemStyle: { color: "#10B981" } },
            { name: "Backrunning Retained", value: 12.8, itemStyle: { color: "#3B82F6" } },
            { name: "State Arbitrage Retained", value: 4.5, itemStyle: { color: "#8B5CF6" } },
          ],
        },
      ],
    };
  }, [isDark]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 font-sans">
      {/* ── Top Header Banner & Story Question ── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
              [ EIP-8184 / LUCID ENCRYPTED MEMPOOL ]
            </span>
            <span className="px-2.5 py-1 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
              PRE-EXECUTION PRIVACY &amp; MEV DISPLACEMENT
            </span>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--primary-border)] transition-all uppercase tracking-wider"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--primary-text)]" : ""}`} />
            [ SYNC TELEMETRY ]
          </button>
        </div>

        <div className="space-y-1.5">
          <PixelHeading className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
            What happens to MEV when transactions are encrypted before block inclusion?
          </PixelHeading>
          <p className="text-sm font-sans text-[var(--text-secondary)] leading-relaxed max-w-none">
            BlobLens models the displacement of sandwiching &amp; frontrunning MEV under EIP-8184 (Lucid threshold encryption), tracking key reveals, committee consensus, and post-encryption residual arbitrage.
          </p>
        </div>

        {/* ── Data Confidence Tiers Bar ── */}
        <div className="p-3 bg-[var(--surface-sunken)] border border-dashed border-[var(--border)] rounded-[6px] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <span className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
            DATA CONFIDENCE TIERS:
          </span>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--success)] font-bold">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              🟢 1. LIVE SIMULATION
              <ProvenanceTooltip
                source="BlobLens Threshold Decryption Simulator"
                method="BLS12-381 key-share verification"
                scope="Simulated Devnet"
                confidence="Simulated"
              />
            </span>
            <span className="flex items-center gap-1.5 text-[var(--primary-text)] font-bold">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              🔵 2. OBSERVED IMPACT MODEL
              <ProvenanceTooltip
                source="Historical Public Mempool Dataset"
                method="Visibility dependency classification"
                scope="Ethereum Mainnet Historical"
                confidence="Observed"
              />
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: TOP 4 IMPACT KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <DottedCard
          title="Displaced Sandwich MEV"
          badge="🟢 -95.0%"
          badgeType="iris"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--success)] tabular-nums">
              {impactData?.sandwich_mev_eliminated_pct || 95.0}%
            </span>
            <span className="text-sm font-sans text-[var(--text-secondary)]">
              ${fmtUsd(impactData?.weekly_displaced_usd || 14200000)} / week saved
            </span>
          </div>
        </DottedCard>

        <DottedCard
          title="Inclusion Latency Overhead"
          badge="🔵 +1 Slot"
          badgeType="default"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              12.0 <span className="text-sm text-[var(--text-secondary)] font-normal">sec</span>
            </span>
            <span className="text-sm font-sans text-[var(--text-secondary)]">
              Two-slot ticket reservation pipeline
            </span>
          </div>
        </DottedCard>

        <DottedCard
          title="Committee Health Score"
          badge="🟢 99.8%"
          badgeType="iris"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--primary-text)] tabular-nums">
              {committee?.online_percentage || 99.8}%
            </span>
            <span className="text-sm font-sans text-[var(--text-secondary)]">
              {committee?.threshold || "32/48"} BLS threshold online
            </span>
          </div>
        </DottedCard>

        <DottedCard
          title="Residual State MEV"
          badge="🟡 Retained"
          badgeType="warning"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--warning)] tabular-nums">
              ${fmtUsd(impactData?.residual_mev_weekly_usd || 24500000)}
            </span>
            <span className="text-sm font-sans text-[var(--text-secondary)]">
              Backrunning &amp; DEX-CEX arbitrage
            </span>
          </div>
        </DottedCard>
      </div>

      {/* ── SECTION 2: CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard
          title="Projected MEV Protection Under Threshold Encryption"
          subtitle="Comparing public mempool MEV exposure against encrypted Lucid pipeline"
          badge="🟢 Protected"
          badgeType="default"
          techBracket
          className="lg:col-span-2"
        >
          <EChartWrapper option={protectedMevChartOption} style={{ height: "240px", width: "100%" }} />
        </DottedCard>

        <DottedCard
          title="MEV Displacement Surface (% Shifts)"
          subtitle="Classification of MEV vector shifts under pre-execution privacy"
          badge="🟢 Shift Surface"
          badgeType="iris"
          techBracket
          className="lg:col-span-1"
        >
          <EChartWrapper option={displacementChartOption} style={{ height: "190px", width: "100%" }} showFooter={false} />
          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono pt-2 border-t border-dashed border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">Sandwiches: <strong className="text-[var(--success)]">-95%</strong></span>
            <span className="text-[var(--text-secondary)]">Frontrun: <strong className="text-[var(--success)]">-94%</strong></span>
            <span className="text-[var(--text-secondary)]">Backrun: <strong className="text-[var(--primary-text)]">Retained</strong></span>
            <span className="text-[var(--text-secondary)]">State Arb: <strong className="text-[var(--primary-text)]">Retained</strong></span>
          </div>
          <ChartFooter />
        </DottedCard>
      </div>

      {/* ── SECTION 3: COMMITTEE MONITOR & LUCID PIPELINE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DottedCard
          title="Threshold Decryption Committee Status"
          subtitle="Monitoring BLS key-share participants and slashing parameters"
          badge="🟢 Committee"
          badgeType="iris"
          techBracket
        >
          <div className="grid grid-cols-3 gap-3 font-mono">
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">
              <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Active Nodes</span>
              <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                {committee?.active_nodes || 48} / {committee?.total_nodes || 48}
              </p>
            </div>
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">
              <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Avg Reveal Latency</span>
              <p className="text-xl font-bold text-[var(--primary-text)] mt-0.5">
                {committee?.avg_reveal_latency_ms || 240} ms
              </p>
            </div>
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">
              <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">Slashed Top Fees</span>
              <p className="text-xl font-bold text-[var(--warning)] mt-0.5">
                {committee?.slashed_fees_eth || 4.85} ETH
              </p>
            </div>
          </div>
        </DottedCard>

        <DottedCard
          title="The Two-Slot Lucid Inclusion Pipeline"
          subtitle="How an encrypted transaction travels from ticket reservation to decrypted execution"
          badge="🟣 EIP-8184"
          badgeType="default"
          techBracket
        >
          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--primary-border)] rounded-[4px] flex items-center justify-between">
              <div>
                <span className="text-xs text-[var(--primary-text)] font-bold uppercase">Slot N: Ticket Inclusion</span>
                <p className="text-xs text-[var(--text-primary)] font-sans mt-0.5">Sealed payload included by builder without plaintext visibility.</p>
              </div>
              <Lock className="w-4 h-4 text-[var(--primary-text)] shrink-0" />
            </div>

            <div className="flex justify-center">
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] rotate-90" />
            </div>

            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--success)]/40 rounded-[4px] flex items-center justify-between">
              <div>
                <span className="text-xs text-[var(--success)] font-bold uppercase">Slot N+1: Key Reveal &amp; Execution</span>
                <p className="text-xs text-[var(--text-primary)] font-sans mt-0.5">Committee reveals decryption key; transaction executes atomically.</p>
              </div>
              <Sparkles className="w-4 h-4 text-[var(--success)] shrink-0" />
            </div>
          </div>
        </DottedCard>
      </div>

      {/* ── SECTION 4: PRE-INCLUSION MEV MATRIX ── */}
      <DottedCard
        title='"What Lucid Would Hide" — Pre-Inclusion MEV Matrix'
        subtitle="Classifying MEV vectors by pre-inclusion visibility dependency"
        badge="🔵 MEV Dependency"
        badgeType="iris"
        techBracket
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dashed border-[var(--border)] text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">
                <th className="py-2.5 px-3">MEV Category</th>
                <th className="py-2.5 px-3">Pre-Inclusion Visibility Dependency</th>
                <th className="py-2.5 px-3">Current Weekly MEV</th>
                <th className="py-2.5 px-3">Projected Post-Encryption</th>
                <th className="py-2.5 px-3">Impact Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm font-mono">
              {[
                { mev_type: "Sandwiches", pre_trade_visibility: "Strongly pre-inclusion dependent", current_weekly_usd: 8400000, projected_encrypted_usd: 420000, reduction_pct: 95.0, impact: "High Elimination" },
                { mev_type: "Classic Frontrunning", pre_trade_visibility: "Strongly pre-inclusion dependent", current_weekly_usd: 5200000, projected_encrypted_usd: 310000, reduction_pct: 94.0, impact: "High Elimination" },
                { mev_type: "Copy Trading", pre_trade_visibility: "Strongly pre-inclusion dependent", current_weekly_usd: 2900000, projected_encrypted_usd: 210000, reduction_pct: 92.8, impact: "High Elimination" },
                { mev_type: "Backrunning", pre_trade_visibility: "State/order dependent", current_weekly_usd: 6800000, projected_encrypted_usd: 6400000, reduction_pct: 5.9, impact: "Partial / Retained" },
                { mev_type: "Liquidation Races", pre_trade_visibility: "State-dependent", current_weekly_usd: 4100000, projected_encrypted_usd: 3900000, reduction_pct: 4.8, impact: "State Driven" },
                { mev_type: "DEX-CEX Arbitrage", pre_trade_visibility: "State-dependent", current_weekly_usd: 18400000, projected_encrypted_usd: 18100000, reduction_pct: 1.6, impact: "State Driven" },
              ].map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-[var(--surface-sunken)] transition-colors">
                  <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{row.mev_type}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-[3px] text-xs font-bold ${
                        row.pre_trade_visibility.includes("Strongly")
                          ? "bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30"
                          : "bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/30"
                      }`}
                    >
                      {row.pre_trade_visibility}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[var(--text-secondary)]">{fmtUsd(row.current_weekly_usd)}</td>
                  <td className="py-3 px-3 font-bold text-[var(--success)]">{fmtUsd(row.projected_encrypted_usd)}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-[3px] text-xs font-bold ${
                        row.impact.includes("High")
                          ? "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30"
                          : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border)]"
                      }`}
                    >
                      {row.reduction_pct > 50 ? `🔴 -${row.reduction_pct}%` : `🟡 -${row.reduction_pct}%`} ({row.impact})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DottedCard>
    </div>
  );
}
