"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { RefreshCw, Activity, TrendingDown, BarChart3, Clock, Layers, ExternalLink } from "lucide-react";
import { DottedCard } from "@/components/ui/dotted-card";
import { EChartWrapper } from "@/components/charts/echart-wrapper";
import { getL2IconPath } from "@/lib/l2-icons";
import Image from "next/image";
import Link from "next/link";
import type { EChartsOption } from "echarts";

// ── Design tokens ──────────────────────────────────────────────────────────
function axisBase(dark: boolean) {
  return {
    axisLine:  { lineStyle: { color: dark ? "#22222E" : "#E5E5E7" } },
    axisLabel: { color: dark ? "#68687D" : "#9C9CAE", fontFamily: "var(--font-mono)", fontSize: 10 },
    splitLine: { lineStyle: { color: dark ? "#1A1A24" : "#F3F3F7", type: "dashed" as const } },
  };
}
function ttBase(dark: boolean) {
  const bg     = dark ? "#121217" : "#FFFFFF";
  const border = dark ? "#3A3275" : "#CBC4FA";
  return {
    confine: true,
    backgroundColor: bg,
    borderColor: border,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: dark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 11 },
    extraCssText: `background:${bg}!important;border:1px solid ${border}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${dark ? "0.45" : "0.12"});`,
  };
}

function SectionLabel({ label, icon: Icon }: { label: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] px-2 py-0.5 rounded-[3px] uppercase whitespace-nowrap">
        {Icon && <Icon className="w-3 h-3" />}
        [ {label} ]
      </span>
      <div className="flex-1 border-t border-dashed border-[var(--border)]" />
    </div>
  );
}

function ScoreBar({ label, value, peerAvg }: { label: string; value: number; peerAvg: number }) {
  const pct   = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? "#059669" : pct >= 60 ? "#D97706" : "#DC2626";
  return (
    <div className="space-y-1 font-mono">
      <div className="flex items-center justify-between text-[10px]">
        <span className="uppercase font-bold tracking-wider text-[var(--text-secondary)]">{label}</span>
        <span className="flex items-center gap-1.5 font-bold" style={{ color }}>
          {pct.toFixed(0)}
          <span className="text-[var(--text-muted)] opacity-60 font-normal">/ {peerAvg.toFixed(0)} avg</span>
        </span>
      </div>
      <div className="relative h-1.5 w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-none overflow-hidden">
        {peerAvg > 0 && (
          <div className="absolute top-0 h-full w-px bg-[var(--border)] z-10" style={{ left: `${Math.min(100, peerAvg)}%` }} />
        )}
        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── RollupIcon ────────────────────────────────────────────────────────────
function RollupIcon({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  const src = getL2IconPath(name);
  if (src) return (
    <Image src={src} alt={name} width={size} height={size}
      className="rounded-[4px] shrink-0"
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
  return (
    <div className="rounded-[4px] shrink-0 flex items-center justify-center font-mono font-bold text-[10px] text-white"
      style={{ width: size, height: size, backgroundColor: color }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

type Tab = "activity" | "fees" | "blobs";

// ── Main component ────────────────────────────────────────────────────────
export function RollupClient({ id }: { id: string }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("activity");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rollup/${encodeURIComponent(id)}`);
      if (res.status === 404) { setNotFound(true); return; }
      setData(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const ax = axisBase(dark);
  const tt = ttBase(dark);

  // ── Activity heatmap (day × hour) ────────────────────────────────────────
  const activityOption: EChartsOption = useMemo(() => {
    if (!data?.activity_heatmap) return {} as EChartsOption;
    const hm = data.activity_heatmap;
    const maxVal = Math.max(...hm.map((c: any) => c.value));
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2,"0")}:00`);
    const echData = hm.map((c: any) => [c.hour, c.day, c.value]);
    const color = data.meta?.color ?? "#8B7BFF";
    return {
      backgroundColor: "transparent",
      tooltip: { ...tt, formatter: (params: any) => {
        const [h, d, v] = params.value;
        return `<div style="font-family:var(--font-mono);font-size:11px">${DAYS[d]} ${HOURS[h]}<br/><strong style="color:${color}">${Number(v).toLocaleString()} blobs</strong></div>`;
      }},
      grid: { top: 16, right: 70, bottom: 24, left: 42 },
      xAxis: { type: "category", data: HOURS, ...ax, axisLabel: { ...ax.axisLabel, interval: 3, formatter: (v: string) => v.slice(0,2) } },
      yAxis: { type: "category", data: DAYS, ...ax },
      visualMap: {
        min: 0, max: maxVal, calculable: true, orient: "vertical", right: 0, top: "center",
        inRange: { color: dark ? ["#0D0D14", color] : ["#F0F0FF", color] },
        textStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9, fontFamily: "var(--font-mono)" },
        text: ["High","Low"],
      },
      series: [{ type: "heatmap", data: echData, itemStyle: { borderColor: dark ? "#0D0D14" : "#F8F8FC", borderWidth: 1 } }],
    };
  }, [data, dark]);

  // ── Fee trend vs network avg ──────────────────────────────────────────────
  const feeOption: EChartsOption = useMemo(() => {
    if (!data?.fee_trend) return {} as EChartsOption;
    const pts = data.fee_trend;
    const color = data.meta?.color ?? "#8B7BFF";
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const rollup = params.find((p: any) => p.seriesName === data.meta.name)?.value[1];
        const net    = params.find((p: any) => p.seriesName === "Network Avg")?.value[1];
        const d = new Date(params[0]?.value[0]).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit" });
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${d}</strong><br/>
          <span style="color:${color}">${data.meta.name}: <strong>${Number(rollup).toFixed(4)} Gwei</strong></span><br/>
          Network: <strong style="opacity:0.7">${Number(net).toFixed(4)} Gwei</strong>
        </div>`;
      }},
      legend: { data: [data.meta?.name, "Network Avg"], top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      dataZoom: [{ type: "inside" }, { type: "slider", show: true, height: 18, bottom: 4, borderColor: "transparent", textStyle: { color: ax.axisLabel.color, fontSize: 9 } }],
      grid: { top: 32, right: 12, bottom: 54, left: 10, containLabel: true },
      xAxis: { type: "time", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => new Date(v).toLocaleString("en",{month:"short",day:"numeric",hour:"2-digit"}).replace(",","") } },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v.toFixed(2)}G` } },
      series: [
        { name: data.meta?.name, type: "line", smooth: 0.3, symbol: "none",
          data: pts.map((p: any) => [new Date(p.ts).getTime(), p.rollup_gwei]),
          lineStyle: { color, width: 2 }, itemStyle: { color }, areaStyle: { color, opacity: 0.15 } },
        { name: "Network Avg", type: "line", smooth: 0.3, symbol: "none",
          data: pts.map((p: any) => [new Date(p.ts).getTime(), p.network_avg_gwei]),
          lineStyle: { color: dark ? "#68687D" : "#9C9CAE", width: 1.5, type: "dashed" }, itemStyle: { color: dark ? "#68687D" : "#9C9CAE" } },
      ],
    };
  }, [data, dark]);

  // ── Blob volume trend 30d ────────────────────────────────────────────────
  const blobOption: EChartsOption = useMemo(() => {
    if (!data?.blob_trend) return {} as EChartsOption;
    const pts = data.blob_trend;
    const color = data.meta?.color ?? "#8B7BFF";
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, axisPointer: { type: "shadow" as const }, formatter: (params: any) => {
        const blobs = params[0]?.value; const txns = pts[params[0]?.dataIndex]?.txns ?? 0;
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${params[0]?.axisValue}</strong><br/>
          <span style="color:${color}">Blobs: <strong>${Number(blobs).toLocaleString()}</strong></span><br/>
          Txns: <strong style="opacity:0.7">${Number(txns).toLocaleString()}</strong>
        </div>`;
      }},
      grid: { top: 12, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: pts.map((p: any) => p.date.slice(5)), ...ax, axisLabel: { ...ax.axisLabel, interval: 4 } },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v) } },
      series: [{ type: "bar", data: pts.map((p: any) => p.blobs), barMaxWidth: 20,
        itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color }, { offset: 1, color: `${color}30` }] },
          borderRadius: [3, 3, 0, 0] } }],
    };
  }, [data, dark]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 font-mono text-center">
      <span className="text-4xl">⚠</span>
      <h2 className="text-lg font-bold text-[var(--text-primary)]">Rollup not found</h2>
      <p className="text-sm text-[var(--text-muted)]">"{id}" is not tracked in the BlobLens registry.</p>
      <Link href="/leaderboard" className="text-xs px-3 py-1.5 border border-[var(--primary-border)] text-[var(--primary-text)] rounded-[4px] hover:bg-[var(--primary-bg)] transition-colors">
        ← Back to Leaderboard
      </Link>
    </div>
  );

  const r = data;
  const color = r?.meta?.color ?? "#8B7BFF";
  const eff = r?.efficiency?.efficiency_score ?? 0;
  const effColor = eff >= 80 ? "#059669" : eff >= 60 ? "#D97706" : "#DC2626";
  const effLabel = eff >= 80 ? "Institutional Grade" : eff >= 60 ? "Optimal Efficiency" : "Needs Optimization";

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {r?.meta && <RollupIcon name={r.meta.name} color={color} size={36} />}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {r?.meta?.name ?? id}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">{r?.meta?.category}</span>
                <span className="text-[10px] font-mono px-1.5 py-0 border border-[var(--border)] rounded-[3px] text-[var(--text-secondary)]">{r?.meta?.da_layer}</span>
                {r?.meta?.badge && <span className="text-[10px] font-mono">{r.meta.badge}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/leaderboard" className="text-[10px] font-mono px-2.5 py-1.5 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Leaderboard
            </Link>
            <button onClick={loadData} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--primary-border)] transition-all uppercase tracking-wider">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--primary-text)]" : ""}`} />
              [ SYNC ]
            </button>
          </div>
        </div>
        <p className="max-w-2xl text-xs text-[var(--text-secondary)] leading-relaxed">
          Detailed DA performance for {r?.meta?.name ?? id} — blob throughput, fee benchmarking vs the network average, packing efficiency, and timing behaviour across the last 7 days.
        </p>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Blobs",     val: r?.kpi?.total_blobs?.toLocaleString() ?? "—",     sub: `${r?.kpi?.network_share_pct}% network share`,   icon: Layers },
          { label: "Transactions",    val: r?.kpi?.total_txns?.toLocaleString() ?? "—",      sub: `avg ${r?.kpi?.avg_blobs_per_tx} blobs/tx`,        icon: BarChart3 },
          { label: "Cost / Blob",     val: `${r?.kpi?.cost_per_blob_gwei} Gwei`,             sub: `${r?.kpi?.blob_fullness_pct}% blob fullness`,     icon: TrendingDown },
          { label: "Last Active",     val: r?.kpi?.last_active_ago ?? "—",                   sub: `tracking since ${r?.kpi?.first_seen ?? "—"}`,     icon: Clock },
        ].map(({ label, val, sub, icon: Icon }) => (
          <DottedCard key={label} title={label} badge="" badgeType="default" techBracket>
            <div className="flex flex-col gap-0.5 py-0.5 font-mono">
              <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{val}</span>
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><Icon className="w-3 h-3" />{sub}</span>
            </div>
          </DottedCard>
        ))}
      </div>

      {/* ── DA Efficiency ── */}
      <SectionLabel label="DA EFFICIENCY ANALYSIS" icon={Activity} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score card */}
        <DottedCard title="Composite Efficiency Score" subtitle="70% packing · 30% timing" badge="Score" badgeType="iris" techBracket>
          <div className="flex items-center gap-6 py-2">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[6px] border-2 text-3xl font-bold font-mono bg-[var(--surface-sunken)] shadow-inner"
              style={{ color: effColor, borderColor: effColor }}>
              {eff.toFixed(0)}
            </div>
            <div>
              <h4 className="text-base font-bold" style={{ color: effColor }}>{effLabel}</h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Peer Average: <span className="font-mono font-bold text-[var(--text-primary)]">{r?.efficiency?.peer_avg_eff?.toFixed(0)}</span>
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-widest font-mono">
                Compression: {r?.kpi?.compression_ratio}x · {r?.meta?.category}
              </p>
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t border-dashed border-[var(--border)]">
            <ScoreBar label="Packing Score"      value={r?.efficiency?.packing_score ?? 0}      peerAvg={r?.efficiency?.peer_avg_pack ?? 77} />
            <ScoreBar label="Timing Score"       value={r?.efficiency?.timing_score ?? 0}       peerAvg={r?.efficiency?.peer_avg_timing ?? 70} />
            <ScoreBar label="Coordination"       value={r?.efficiency?.coordination_score ?? 0} peerAvg={86} />
          </div>
        </DottedCard>

        {/* Cost breakdown */}
        <DottedCard title="Cost Breakdown" subtitle="Per-blob and per-byte DA costs vs peers" badge="Cost" badgeType="default" techBracket>
          <div className="space-y-4 py-2 font-mono">
            {[
              { label: "Avg Cost / Blob",     val: `${r?.kpi?.cost_per_blob_gwei} Gwei`,                 sub: `vs ${r?.efficiency?.peer_avg_cost_gwei?.toFixed(4)} peer avg` },
              { label: "Blob Fullness",       val: `${r?.kpi?.blob_fullness_pct}%`,                      sub: "bytes used per 128 KB blob" },
              { label: "Blobs / Transaction", val: `${r?.kpi?.avg_blobs_per_tx}`,                        sub: "max 6 per block · higher = better packing" },
              { label: "Network Share",       val: `${r?.kpi?.network_share_pct}%`,                      sub: "% of total Ethereum blob volume" },
              { label: "First Seen",          val: r?.kpi?.first_seen ?? "—",                            sub: "indexing start date" },
            ].map(({ label, val, sub }) => (
              <div key={label} className="flex items-start justify-between text-xs border-b border-dashed border-[var(--border)] pb-2 last:border-none last:pb-0">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
                <div className="text-right">
                  <div className="font-bold text-[var(--text-primary)]">{val}</div>
                  <div className="text-[9px] text-[var(--text-muted)] opacity-70">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </DottedCard>
      </div>

      {/* ── Behaviour tabs ── */}
      <SectionLabel label="BEHAVIOUR & RHYTHM" icon={BarChart3} />

      {/* Tab selector */}
      <div className="flex items-center gap-1 font-mono text-[10px] border-b border-[var(--border)]">
        {([
          { key: "activity" as Tab, label: "7D ACTIVITY HEATMAP" },
          { key: "fees" as Tab,     label: "FEE BENCHMARKING" },
          { key: "blobs" as Tab,    label: "BLOB VOLUME 30D" },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-2 font-bold uppercase tracking-wider border-b-2 transition-colors ${tab === key ? "border-[var(--primary)] text-[var(--primary-text)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-[280px]">
        {tab === "activity" && (
          <DottedCard title="Submission Intensity — Hour × Day of Week" subtitle="Each cell = total blobs submitted. Brighter = more active. Shows sequencer batching rhythm" badge="7D" badgeType="iris" techBracket>
            <EChartWrapper option={activityOption} style={{ height: "260px", width: "100%" }} loading={loading} showFooter={false} />
            <div className="pt-2 text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1.5 border-t border-dashed border-[var(--border)]">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: `linear-gradient(90deg, ${dark?"#0D0D14":"#F0F0FF"}, ${color})` }} />
              Low → High submission intensity
            </div>
          </DottedCard>
        )}
        {tab === "fees" && (
          <DottedCard title="Blob Fee Paid vs Network Average (72h)" subtitle="When the rollup line sits below the network dashed line, the sequencer is successfully avoiding congestion" badge="72H" badgeType="iris" techBracket>
            <EChartWrapper option={feeOption} style={{ height: "280px", width: "100%" }} loading={loading} />
          </DottedCard>
        )}
        {tab === "blobs" && (
          <DottedCard title="Daily Blob Volume — Last 30 Days" subtitle="Hover for transaction count. Consistent volume = stable sequencer operation" badge="30D" badgeType="iris" techBracket>
            <EChartWrapper option={blobOption} style={{ height: "260px", width: "100%" }} loading={loading} />
          </DottedCard>
        )}
      </div>

      {/* ── Sequencer identity ── */}
      <SectionLabel label="SEQUENCER IDENTITY" icon={Clock} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard title="Registry" techBracket>
          <div className="space-y-3 py-1 font-mono text-xs">
            <Row label="Name"     val={r?.meta?.name} />
            <Row label="Category" val={r?.meta?.category} />
            <Row label="Batcher"  val={r?.meta?.batcher} mono />
            <Row label="DA Layer" val={r?.meta?.da_layer} />
            <Row label="Status"   val={<span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />Tracking Active</span>} />
          </div>
        </DottedCard>

        <DottedCard title="Governance Impact" badge="Network" badgeType="iris" techBracket className="lg:col-span-2">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1">
            {r?.meta?.name}&apos;s batching strategy accounts for roughly{" "}
            <strong className="text-[var(--text-primary)] font-mono">{r?.kpi?.network_share_pct}%</strong> of total Ethereum blob volume.
            At <strong className="text-[var(--text-primary)] font-mono">{r?.kpi?.blob_fullness_pct}%</strong> blob fullness, each submitted blob uses {r?.kpi?.blob_fullness_pct}% of the available 128 KB.
            Improving fullness by even 5% reduces L1 state growth and blob fee pressure for all rollups sharing the blob market.
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-3">
            Coordination score of <strong className="font-mono" style={{ color: effColor }}>{r?.efficiency?.coordination_score}</strong> measures how often {r?.meta?.name} co-submits in the same blocks as peers — high coordination reduces block slot waste.
          </p>
        </DottedCard>
      </div>
    </div>
  );
}

function Row({ label, val, mono }: { label: string; val: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between border-b border-dashed border-[var(--border)] pb-2 last:border-none last:pb-0 text-xs">
      <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{label}</span>
      <span className={`text-right text-[var(--text-primary)] font-bold ${mono ? "font-mono text-[10px]" : ""}`}>{val ?? "—"}</span>
    </div>
  );
}
