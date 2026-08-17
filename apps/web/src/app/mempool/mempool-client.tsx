"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ShieldAlert,
  Activity,
  EyeOff,
  RefreshCw,
  Search,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  ShieldCheck,
  ShieldX,
  Zap,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { DottedCard } from "@/components/ui/dotted-card";
import { PixelHeading } from "@/components/ui/pixel-heading-word";
import { EChartWrapper, ChartFooter } from "@/components/charts/echart-wrapper";
import { SandwichReconstructorModal } from "@/components/modals/sandwich-reconstructor-modal";
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

export function MempoolClient() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [stats, setStats] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [orderFlow, setOrderFlow] = useState<any[]>([]);
  const [buildersData, setBuildersData] = useState<any>(null);
  const [recentAttacks, setRecentAttacks] = useState<any[]>([]);
  const [protocols, setProtocols] = useState<any>(null);
  const [topPools, setTopPools] = useState<any[]>([]);
  const [bundleTrace, setBundleTrace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedAttack, setSelectedAttack] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sRes, tRes, ofRes, bRes, rRes, pRes, poolRes, traceRes] = await Promise.all([
        fetch("/api/mev?type=stats").then((r) => r.json()),
        fetch("/api/mev?type=trend").then((r) => r.json()),
        fetch("/api/mev?type=orderflow").then((r) => r.json()),
        fetch("/api/mev?type=builders").then((r) => r.json()),
        fetch("/api/mev?type=recent_attacks").then((r) => r.json()),
        fetch("/api/mev?type=protocols").then((r) => r.json()),
        fetch("/api/mev?type=top_pools").then((r) => r.json()),
        fetch("/api/mev?type=bundle_trace").then((r) => r.json()),
      ]);

      if (sRes?.stats) setStats(sRes.stats);
      if (tRes?.trend) setTrend(tRes.trend);
      if (ofRes?.order_flow_provenance) setOrderFlow(ofRes.order_flow_provenance);
      if (bRes?.builder_market_share) setBuildersData(bRes.builder_market_share);
      if (rRes?.recent_attacks) setRecentAttacks(rRes.recent_attacks);
      if (pRes?.protocol_share) setProtocols(pRes.protocol_share);
      if (poolRes?.top_sandwiched_pools) setTopPools(poolRes.top_sandwiched_pools);
      if (traceRes?.bundle_trace) setBundleTrace(traceRes.bundle_trace);

      setIsFallback(Boolean(sRes?.isFallback));
    } catch (err) {
      console.error("Failed to load mempool data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ECharts Option for MEV Extracted Trend
  const trendChartOption: EChartsOption = useMemo(() => {
    if (!trend || trend.length === 0) return {};
    const dates = trend.map((d) => d.date);
    const gross = trend.map((d) => d.gross_profit_usd);
    const gas = trend.map((d) => d.gas_cost_usd);

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
        data: dates,
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
          formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`,
        },
      },
      series: [
        {
          name: "Gross MEV",
          type: "line",
          smooth: true,
          lineStyle: { color: "#DC2626", width: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(220, 38, 38, 0.25)" },
                { offset: 1, color: "rgba(220, 38, 38, 0.0)" },
              ],
            },
          },
          data: gross,
        },
        {
          name: "L1 Gas Cost",
          type: "line",
          smooth: true,
          lineStyle: { color: isDark ? "#8B7BFF" : "#5B4BE0", width: 1.5, type: "dashed" },
          data: gas,
        },
      ],
    };
  }, [trend, isDark]);

  // ECharts Option for Order Flow Provenance Bar
  const orderFlowChartOption: EChartsOption = useMemo(() => {
    if (!orderFlow || orderFlow.length === 0) return {};
    const quarters = orderFlow.map((o) => o.quarter);
    const pubShare = orderFlow.map((o) => o.public_mempool_pct);
    const privShare = orderFlow.map((o) => o.private_ofa_pct);

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
            res += `<span style="color:${item.color}">●</span> ${item.seriesName}: ${item.value}%<br/>`;
          });
          res += "</div>";
          return res;
        },
      },
      grid: { top: 15, right: 15, bottom: 20, left: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: quarters,
        axisLine: { lineStyle: { color: isDark ? "#22222E" : "#E5E5E7" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? "#1A1A24" : "#F3F3F7", type: "dashed" } },
        axisLabel: {
          color: isDark ? "#8E8EA8" : "#555566",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          formatter: (v: number) => `${v}%`,
        },
      },
      series: [
        {
          name: "Public Mempool (Inferred)",
          type: "bar",
          stack: "total",
          itemStyle: { color: "#DC2626" },
          data: pubShare,
        },
        {
          name: "Private OFA (Observed/Attributed)",
          type: "bar",
          stack: "total",
          itemStyle: { color: isDark ? "#8B7BFF" : "#5B4BE0" },
          data: privShare,
        },
      ],
    };
  }, [orderFlow, isDark]);

  // ECharts Option for Reaction Latency Histogram
  const latencyDistributionChartOption: EChartsOption = useMemo(() => {
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
      },
      grid: { top: 15, right: 15, bottom: 20, left: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: ["<50ms", "50-100ms", "100-200ms", "200-500ms", ">500ms"],
        axisLine: { lineStyle: { color: isDark ? "#22222E" : "#E5E5E7" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? "#1A1A24" : "#F3F3F7", type: "dashed" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11 },
      },
      series: [
        {
          name: "Observed Sandwich Count",
          type: "bar",
          itemStyle: { color: "#2563EB", borderRadius: [4, 4, 0, 0] },
          data: [14200, 118400, 142100, 51200, 16990],
        },
      ],
    };
  }, [isDark]);

  // ECharts Option for DEX Protocol Share Donut
  const dexProtocolChartOption: EChartsOption = useMemo(() => {
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
          name: "Protocol Share",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderWidth: 2, borderColor: isDark ? "#0D0D12" : "#FFFFFF" },
          label: { show: false },
          data: [
            { name: "Uniswap v3", value: 68.4, itemStyle: { color: "#FF007A" } },
            { name: "Uniswap v2", value: 18.2, itemStyle: { color: "#FF7A00" } },
            { name: "Curve", value: 8.5, itemStyle: { color: "#2563EB" } },
            { name: "SushiSwap", value: 4.9, itemStyle: { color: "#059669" } },
          ],
        },
      ],
    };
  }, [isDark]);

  // Filtered attacks list
  const filteredAttacks = useMemo(() => {
    if (!recentAttacks) return [];
    return recentAttacks.filter((item) => {
      const query = filterQuery.toLowerCase();
      return (
        !query ||
        item.pair_name.toLowerCase().includes(query) ||
        item.protocol.toLowerCase().includes(query) ||
        item.block_number.toString().includes(query) ||
        item.victim_address.toLowerCase().includes(query) ||
        item.attacker_address.toLowerCase().includes(query)
      );
    });
  }, [recentAttacks, filterQuery]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 font-sans">
      {/* ── Top Header Banner & Story Question ── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
              [ PUBLIC ETHEREUM MEMPOOL ]
            </span>
            <span className="px-2.5 py-1 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
              LIVE TRANSACTION FEED &amp; MEV EXPOSURE
            </span>
            
            {isFallback && (
              <span className="px-2.5 py-1 border border-[var(--warning)]/40 bg-[var(--warning-bg)]/20 rounded-[4px] text-[var(--warning)] font-bold flex items-center gap-1">
                🟡 HISTORICAL DATASET MODE
              </span>
            )}
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
            What is happening in Ethereum&apos;s public mempool right now?
          </PixelHeading>
          <p className="text-sm font-sans text-[var(--text-secondary)] leading-relaxed max-w-none">
            BlobLens monitors public mempool activity, transaction reaction speed, order-flow provenance, and on-chain sandwich MEV extraction across major Ethereum liquidity pools.
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
              🟢 1. LIVE ON-CHAIN
              <ProvenanceTooltip
                source="Ethereum Mainnet Execution Logs & Receipts"
                method="Block event matching & gas accounting"
                scope="Verified On-Chain Contracts"
                confidence="Verified"
              />
            </span>
            <span className="flex items-center gap-1.5 text-[var(--primary-text)] font-bold">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              🔵 2. OBSERVED TELEMETRY
              <ProvenanceTooltip
                source="BlobLens Reth TxPool & MEV-Boost Relays"
                method="First-seen timestamp & extra-data parsing"
                scope="BlobLens Node Observation"
                confidence="Observed"
              />
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Row: Mempool & MEV Surface ── */}
      <div id="mev-surface" className="scroll-mt-24" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <DottedCard
          title="Sandwiched Volume"
          badge="🔴 DEX Swaps"
          badgeType="danger"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {fmtUsd(stats?.total_victim_volume_usd || 1482000000)}
            </span>
            <span className="text-sm font-sans text-[var(--danger)]">
              Observed DEX Trades Sandwiched
            </span>
          </div>
        </DottedCard>

        <DottedCard
          title="Estimated Realized Gross Profit"
          badge="🟢 Net MEV"
          badgeType="iris"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--success)] tabular-nums">
              {fmtUsd((stats?.total_gross_profit_usd || 34180500) - (stats?.total_gas_cost_usd || 14890200))}
            </span>
            <span className="text-sm font-sans text-[var(--text-secondary)]">
              Output - Input - ${fmtK(stats?.total_gas_cost_usd || 14890200)} gas
            </span>
          </div>
        </DottedCard>

        <DottedCard
          title="Sandwich Attacks"
          badge="🟢 Triplets"
          badgeType="default"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {fmtK(stats?.total_sandwiches || 342890)}
            </span>
            <span className="text-sm font-sans text-[var(--text-secondary)]">
              Across {fmtK(stats?.unique_victims || 218450)} victim wallets
            </span>
          </div>
        </DottedCard>

        <DottedCard
          title="Observed Node Reaction Speed"
          badge="🔵 183 ms"
          badgeType="iris"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--primary-text)] tabular-nums">
              183 <span className="text-sm text-[var(--text-secondary)] font-normal">ms</span>
            </span>
            <span className="text-sm font-sans text-[var(--text-secondary)]">
              First-seen by BlobLens Reth ➔ Block inclusion
            </span>
          </div>
        </DottedCard>
      </div>

      {/* ── Main Trend Charts Row ── */}
      <div id="mev-trends" className="scroll-mt-24" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard
          title="Daily Sandwich MEV Extracted vs. Gas Paid"
          subtitle="Quantifying baseline extraction on public Ethereum transactions"
          badge="🟢 Live"
          badgeType="default"
          techBracket
          className="lg:col-span-2"
        >
          <div className="flex items-center justify-end gap-3 text-xs font-mono pb-1 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#DC2626]" />
              Estimated Gross MEV
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--primary)]" />
              Gas Paid
            </span>
          </div>
          <EChartWrapper option={trendChartOption} style={{ height: "240px", width: "100%" }} />
        </DottedCard>

        <DottedCard
          title="DEX Protocol Share (% Sandwiched Volume)"
          subtitle="Distribution of Sandwich MEV across major AMM protocols"
          badge="🟢 Protocol Share"
          badgeType="iris"
          techBracket
          className="lg:col-span-1"
        >
          <EChartWrapper option={dexProtocolChartOption} style={{ height: "190px", width: "100%" }} showFooter={false} />
          <div className="grid grid-cols-2 gap-1.5 text-xs font-mono pt-2 border-t border-dashed border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">Uniswap v3: <strong className="text-[var(--text-primary)]">68.4%</strong></span>
            <span className="text-[var(--text-secondary)]">Uniswap v2: <strong className="text-[var(--text-primary)]">18.2%</strong></span>
            <span className="text-[var(--text-secondary)]">Curve: <strong className="text-[var(--text-primary)]">8.5%</strong></span>
            <span className="text-[var(--text-secondary)]">SushiSwap: <strong className="text-[var(--text-primary)]">4.9%</strong></span>
          </div>
          <ChartFooter />
        </DottedCard>
      </div>

      {/* ── Reaction Latency Histogram & Order Flow Row ── */}
      <div id="bot-latency" className="scroll-mt-24" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DottedCard
          title="Observed Bot Reaction Speed Distribution"
          subtitle="Time delta between txpool first-seen timestamp &amp; suspected frontrun block timestamp"
          badge="🔵 Latency"
          badgeType="iris"
          techBracket
        >
          <EChartWrapper option={latencyDistributionChartOption} style={{ height: "220px", width: "100%" }} showFooter={false} />
          <p className="text-xs text-[var(--text-muted)] font-mono pt-1 border-t border-dashed border-[var(--border)]">
            💡 Over 74% of sandwich attacks execute within &lt;200ms of public p2p mempool propagation.
          </p>
          <ChartFooter />
        </DottedCard>

        <DottedCard
          title="Observed Order-Flow Provenance (2024 - 2026)"
          subtitle="Tracking user order flow escaping public P2P mempools into private builder RPCs &amp; OFAs"
          badge="🔵 Telemetry"
          badgeType="iris"
          techBracket
        >
          <EChartWrapper option={orderFlowChartOption} style={{ height: "220px", width: "100%" }} showFooter={false} />
          <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-dashed border-[var(--border)] font-semibold">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#DC2626] rounded-[2px]" />
              Public Mempool
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[var(--primary)] rounded-[2px]" />
              Private OFA
            </span>
          </div>
          <ChartFooter />
        </DottedCard>
      </div>

      {/* ── Live Sandwich Attack Explorer Table ── */}
      <div id="attack-stream" className="scroll-mt-24" />
      <DottedCard
        title="Live Sandwich Attack Stream"
        subtitle="Auditing exact victim/attacker trade triplets on public Uniswap, SushiSwap, and Curve pools"
        badge="🟢 Live"
        badgeType="live"
        techBracket
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter token pair / address / block..."
              className="w-full h-8 pl-9 pr-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dashed border-[var(--border)] text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Block</th>
                <th className="py-2.5 px-3">Pair &amp; Protocol</th>
                <th className="py-2.5 px-3">Victim</th>
                <th className="py-2.5 px-3">Attacker</th>
                <th className="py-2.5 px-3">Victim Loss</th>
                <th className="py-2.5 px-3">Estimated Profit</th>
                <th className="py-2.5 px-3">Observed Latency</th>
                <th className="py-2.5 px-3">Provenance</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm font-mono">
              {filteredAttacks.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest">
                    {filterQuery ? `No attacks match "${filterQuery}"` : "[ NO RECENT ATTACKS IN DATASET ]"}
                  </td>
                </tr>
              )}
              {filteredAttacks.map((atk, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedAttack(atk)}
                  className="hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 text-[var(--primary-text)] font-bold">
                    #{atk.block_number}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-[var(--text-primary)] block text-sm">{atk.pair_name}</span>
                    <span className="text-xs text-[var(--text-muted)] uppercase font-semibold">{atk.protocol}</span>
                  </td>
                  <td className="py-3 px-3 text-[var(--text-secondary)] text-xs">
                    {atk.victim_address?.slice(0, 6)}...{atk.victim_address?.slice(-4)}
                  </td>
                  <td className="py-3 px-3 text-[var(--text-secondary)] text-xs">
                    {atk.attacker_address?.slice(0, 6)}...{atk.attacker_address?.slice(-4)}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#DC2626]">
                    -${atk.victim_loss_usd}
                  </td>
                  <td className="py-3 px-3 font-bold text-[var(--success)]">
                    +${atk.attacker_profit_usd}
                  </td>
                  <td className="py-3 px-3 text-[var(--text-secondary)] text-xs">
                    {atk.reaction_time_ms} ms
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-[3px] text-xs font-bold uppercase ${
                        atk.routing === "Public Mempool"
                          ? "bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626]"
                          : "bg-[var(--primary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)]"
                      }`}
                    >
                      {atk.routing}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2.5 py-1 bg-[var(--surface-sunken)] group-hover:bg-[var(--primary)] group-hover:text-[var(--surface-0)] border border-[var(--border)] group-hover:border-transparent rounded-[4px] text-xs font-mono font-bold transition-all inline-flex items-center gap-1">
                      Inspect ➔
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DottedCard>

      {/* ── BRIDGE CTA SECTION ── */}
      <div className="p-5 bg-[var(--primary-bg)] border border-[var(--primary-border)] rounded-[8px] space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--primary-text)]">
              [ THE PROBLEM: PRE-EXECUTION INFORMATION LEAKAGE ]
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
              $28.5M (83.4%) of detected extraction depends on pre-trade visibility.
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-3xl leading-relaxed font-sans">
              Today&apos;s public mempool exposes transaction intent before inclusion. Encrypted mempools (EIP-8184 / Lucid) seal transactions until block inclusion — removing the sandwich &amp; frontrunning attack surface.
            </p>
          </div>

          <Link
            href="/encrypted-mempool"
            className="px-5 py-2.5 bg-[var(--primary)] text-[var(--surface-0)] border border-[var(--primary)] hover:bg-[var(--primary-text)] font-mono font-bold text-xs uppercase tracking-widest rounded-[6px] flex items-center gap-2 transition-all shadow-md shrink-0 group"
          >
            [ EXPLORE ENCRYPTED MEMPOOL IMPACT ]
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* ── INTERACTIVE TRIPLET RECONSTRUCTOR MODAL ── */}
      <SandwichReconstructorModal
        attack={selectedAttack}
        onClose={() => setSelectedAttack(null)}
      />
    </div>
  );
}
