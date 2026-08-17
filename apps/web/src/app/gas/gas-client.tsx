"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { RefreshCw, Zap, Activity, BarChart3, TrendingDown, Info } from "lucide-react";
import { TimeRangePicker, type DateRangeState } from "@/components/shared/time-range-picker";
import { DottedCard } from "@/components/ui/dotted-card";
import { EChartWrapper, ChartFooter } from "@/components/charts/echart-wrapper";
import { fmtUsd, fmtK } from "@/lib/tokens";
import type { EChartsOption } from "echarts";

// ── Design tokens ─────────────────────────────────────────────────────────
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

const TX_COLORS = { type0: "#64748B", type1: "#D97706", type2: "#2563EB", type3: "#8B7BFF" };
const TX_LABELS: Record<string, string> = {
  type0: "Type 0 · Legacy",
  type1: "Type 1 · Access List (EIP-2930)",
  type2: "Type 2 · EIP-1559 Fee Market",
  type3: "Type 3 · Blob (EIP-4844)",
};

const EPOCHS = [
  { name: "Dencun",      start: "2024-03-13", end: "2025-05-06", color: "rgba(37,99,235,0.06)",   lc: "rgba(96,165,250,0.5)" },
  { name: "Pectra",      start: "2025-05-07", end: "2026-04-07", color: "rgba(5,150,105,0.06)",   lc: "rgba(52,211,153,0.5)" },
  { name: "Fusaka",      start: "2026-04-08", end: "2026-12-31", color: "rgba(124,58,237,0.06)",  lc: "rgba(167,139,250,0.5)" },
  { name: "Glamsterdam", start: "2027-01-01", end: "2099-01-01", color: "rgba(220,38,38,0.04)",   lc: "rgba(252,165,165,0.5)" },
];

function epochMarkAreas() {
  return EPOCHS.map((e) => [{
    name: e.name,
    xAxis: new Date(e.start).getTime(),
    itemStyle: { color: e.color },
    label: { position: "insideTopLeft" as const, offset: [4, 6], fontSize: 9, fontWeight: "bold", color: e.lc, formatter: e.name },
  }, { xAxis: new Date(e.end).getTime() }]);
}

// ── Section label ──────────────────────────────────────────────────────────
function SectionLabel({ label, icon: Icon, id }: { label: string; icon?: React.ElementType; id?: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mt-3 scroll-mt-24">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] px-2 py-0.5 rounded-[3px] uppercase whitespace-nowrap">
        {Icon && <Icon className="w-3 h-3" />}
        [ {label} ]
      </span>
      <div className="flex-1 border-t border-dashed border-[var(--border)]" />
    </div>
  );
}

// ── EIP-7904 info callout ──────────────────────────────────────────────────
function Eip7904Banner() {
  return (
    <div className="p-3.5 rounded-[6px] border border-dashed border-[var(--primary-border)] bg-[var(--primary-bg)] font-mono">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--primary-text)]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          EIP-7904 // GLAMSTERDAM GAS REPRICING
        </div>
        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-[3px] border border-[var(--primary-border)] text-[var(--primary-text)] uppercase tracking-wider">
          UNDER CONSIDERATION
        </span>
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed max-w-3xl">
        EIP-7904 reprices EVM opcodes and precompiles to align gas costs with actual computational complexity on modern hardware.
        Target: <strong className="text-[var(--primary-text)]">60 Mgas/s</strong> (3× current throughput).
        Expected impact: <strong className="text-[var(--accent)]">~78.6% reduction</strong> in gas costs for ETH transfers and contract interactions.
        Part of the upcoming <strong className="text-[var(--primary-text)]">Glamsterdam</strong> hard fork.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-3 text-[10px]">
        {[
          { label: "ETH Transfer",    from: "21,000", to: "4,600",  pct: "78%" },
          { label: "ERC-20 Transfer", from: "65,000", to: "14,000", pct: "78%" },
          { label: "SLOAD (cold)",    from: "800",    to: "200",    pct: "75%" },
          { label: "CALL",            from: "700",    to: "140",    pct: "80%" },
        ].map(({ label, from, to, pct }) => (
          <div key={label} className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] bg-[var(--surface-1)] border border-[var(--border)]">
            <span className="text-[var(--text-muted)]">{label}</span>
            <span className="text-[var(--text-secondary)] line-through">{from}</span>
            <span className="text-[var(--primary-text)] font-bold">→ {to}</span>
            <span className="text-[var(--accent)] font-bold">↓{pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function GasClient() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeState>({ preset: "30d" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/gas?range=${dateRange.preset}${dateRange.preset === "custom" ? `&from=${dateRange.startDate}&to=${dateRange.endDate}` : ""}`;
      setData(await (await fetch(url)).json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const ax = axisBase(dark);
  const tt = ttBase(dark);

  // ── 1. Gas price trend (base fee + priority fee stacked area) ─────────────
  const gasPriceOption: EChartsOption = useMemo(() => {
    if (!data?.gas_price_trend) return {} as EChartsOption;
    const labels = data.gas_price_trend.map((d: any) => d.label);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const bf = params.find((p: any) => p.seriesName === "Base Fee")?.value ?? 0;
        const pf = params.find((p: any) => p.seriesName === "Priority Fee")?.value ?? 0;
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${params[0]?.axisValue}</strong><br/>
          Base Fee: <strong style="color:#2563EB">${Number(bf).toFixed(4)} Gwei</strong><br/>
          Priority: <strong style="color:#059669">${Number(pf).toFixed(4)} Gwei</strong><br/>
          Total: <strong>${(Number(bf) + Number(pf)).toFixed(4)} Gwei</strong>
        </div>`;
      }},
      legend: { data: ["Base Fee", "Priority Fee"], top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      grid: { top: 32, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: labels, ...ax },
      yAxis: { type: "value", ...ax, name: "Gwei", nameTextStyle: { color: ax.axisLabel.color, fontSize: 10 }, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v.toFixed(2) } },
      series: [
        { name: "Base Fee",     type: "line", smooth: true, symbol: "none", stack: "gas", areaStyle: { color: dark ? "rgba(37,99,235,0.35)" : "rgba(37,99,235,0.20)" }, lineStyle: { color: "#2563EB", width: 2 }, itemStyle: { color: "#2563EB" }, data: data.gas_price_trend.map((d: any) => d.base_fee_gwei) },
        { name: "Priority Fee", type: "line", smooth: true, symbol: "none", stack: "gas", areaStyle: { color: dark ? "rgba(5,150,105,0.30)" : "rgba(5,150,105,0.18)" }, lineStyle: { color: "#059669", width: 1.5 }, itemStyle: { color: "#059669" }, data: data.gas_price_trend.map((d: any) => d.priority_fee_gwei) },
      ],
    };
  }, [data, dark]);

  // ── 2. Gas consumed trend (ETH bar + USD tooltip) ─────────────────────────
  const gasConsumedOption: EChartsOption = useMemo(() => {
    if (!data?.gas_consumed_trend) return {} as EChartsOption;
    const labels = data.gas_consumed_trend.map((d: any) => d.label);
    const primary = dark ? "#8B7BFF" : "#5B4BE0";
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const eth = params[0]?.value ?? 0;
        const usd = data.gas_consumed_trend[params[0]?.dataIndex]?.gas_usd ?? 0;
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${params[0]?.axisValue}</strong><br/>
          Gas Consumed: <strong style="color:${primary}">${Number(eth).toFixed(6)} ETH</strong><br/>
          USD Value: <strong style="color:#059669">$${Number(usd).toLocaleString()}</strong>
        </div>`;
      }},
      grid: { top: 12, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: labels, ...ax },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v.toFixed(3)} ETH` } },
      series: [{
        type: "bar", barMaxWidth: 32,
        data: data.gas_consumed_trend.map((d: any) => d.gas_eth),
        itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: dark ? "rgba(139,123,255,0.85)" : "rgba(91,75,224,0.80)" }, { offset: 1, color: dark ? "rgba(139,123,255,0.25)" : "rgba(91,75,224,0.25)" }] }, borderRadius: [3, 3, 0, 0] },
      }],
    };
  }, [data, dark]);

  // ── 3. Block utilization trend ────────────────────────────────────────────
  const blockUtilOption: EChartsOption = useMemo(() => {
    if (!data?.block_utilization_trend) return {} as EChartsOption;
    const labels = data.block_utilization_trend.map((d: any) => d.label);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const util = params[0]?.value ?? 0;
        const row  = data.block_utilization_trend[params[0]?.dataIndex];
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${params[0]?.axisValue}</strong><br/>
          Utilization: <strong style="color:#D97706">${Number(util).toFixed(1)}%</strong><br/>
          Gas Used: <strong>${Number(row?.gas_used ?? 0).toLocaleString()}</strong><br/>
          Gas Limit: <strong style="opacity:0.6">${Number(row?.gas_limit ?? 0).toLocaleString()}</strong>
        </div>`;
      }},
      grid: { top: 12, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: labels, ...ax },
      yAxis: { type: "value", min: 0, max: 100, ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v}%` } },
      series: [
        { type: "line", smooth: true, symbol: "none",
          data: data.block_utilization_trend.map((d: any) => d.utilization_pct),
          lineStyle: { color: "#D97706", width: 2 },
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(217,119,6,0.35)" }, { offset: 1, color: "rgba(217,119,6,0.04)" }] } },
          itemStyle: { color: "#D97706" },
          markLine: { silent: true, symbol: "none",
            lineStyle: { color: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", type: "dashed" },
            data: [{ yAxis: 50, label: { formatter: "50% target", position: "end", color: ax.axisLabel.color, fontSize: 9, fontFamily: "var(--font-mono)" } }],
          },
        },
      ],
    };
  }, [data, dark]);

  // ── 4. Tx type stacked bar (absolute counts) ───────────────────────────────
  const txTypeBarOption: EChartsOption = useMemo(() => {
    if (!data?.tx_type_trend) return {} as EChartsOption;
    const labels = data.tx_type_trend.map((d: any) => d.label);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, axisPointer: { type: "shadow" as const }, formatter: (params: any) => {
        const total = params.reduce((s: number, p: any) => s + (p.value || 0), 0);
        let s = `<div style="font-family:var(--font-mono);font-size:11px;min-width:220px"><strong>${params[0]?.axisValue}</strong><br/>`;
        params.forEach((p: any) => {
          const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0;
          s += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>${Number(p.value).toLocaleString()}</strong> <span style="opacity:0.6">(${pct}%)</span><br/>`;
        });
        return s + `Total: <strong>${Number(total).toLocaleString()}</strong></div>`;
      }},
      legend: { top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      grid: { top: 32, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: labels, ...ax },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => fmtK(v) } },
      series: (["type0","type1","type2","type3"] as const).map((t) => ({
        name: TX_LABELS[t], type: "bar", stack: "total",
        itemStyle: { color: TX_COLORS[t] },
        emphasis: { focus: "series" as const },
        data: data.tx_type_trend.map((d: any) => d[t]),
      })),
    };
  }, [data, dark]);

  // ── 5. Tx type donut ──────────────────────────────────────────────────────
  const txTypeDonutOption: EChartsOption = useMemo(() => {
    if (!data?.tx_type_totals) return {} as EChartsOption;
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item", ...tt, formatter: "{b}: {c}% ({d}%)" },
      series: [{
        type: "pie", radius: ["45%", "72%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: dark ? "#121217" : "#FFFFFF", borderWidth: 2 },
        label: { show: false },
        data: data.tx_type_totals.map((t: any) => ({ name: t.label, value: t.share_pct, itemStyle: { color: t.color } })),
      }],
    };
  }, [data, dark]);

  // ── 6. Historical gas price line (all-time, epoch bands) ──────────────────
  const histGasPriceOption: EChartsOption = useMemo(() => {
    if (!data?.historical_gas_price) return {} as EChartsOption;
    const points = data.historical_gas_price.map((d: any) => [new Date(d.day).getTime(), d.base_fee]);
    const pfPoints = data.historical_gas_price.map((d: any) => [new Date(d.day).getTime(), d.priority_fee]);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const ts = params[0]?.value[0]; const bf = params[0]?.value[1]; const pf = params[1]?.value[1];
        const d = new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" });
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${d}</strong><br/>
          Base Fee: <strong style="color:#2563EB">${Number(bf).toFixed(3)} Gwei</strong><br/>
          Priority: <strong style="color:#059669">${Number(pf).toFixed(4)} Gwei</strong>
        </div>`;
      }},
      legend: { data: ["Base Fee", "Priority Fee"], top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", show: true, start: 0, end: 100, height: 18, bottom: 4, borderColor: "transparent", fillerColor: dark ? "rgba(37,99,235,0.08)" : "rgba(37,99,235,0.08)", handleStyle: { color: "rgba(37,99,235,0.4)" }, textStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9 } },
      ],
      grid: { top: 32, right: 12, bottom: 56, left: 10, containLabel: true },
      xAxis: { type: "time", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => { const d = new Date(v); return `${d.toLocaleString("en", { month: "short" })} '${String(d.getFullYear()).slice(2)}`; } } },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v}G` } },
      series: [
        { name: "Base Fee",     type: "line", smooth: 0.3, symbol: "none", data: points,   lineStyle: { color: "#2563EB", width: 1.5 }, areaStyle: { color: dark ? "rgba(37,99,235,0.22)" : "rgba(37,99,235,0.12)" }, itemStyle: { color: "#2563EB" }, markArea: { silent: true, data: epochMarkAreas() } },
        { name: "Priority Fee", type: "line", smooth: 0.3, symbol: "none", data: pfPoints, lineStyle: { color: "#059669", width: 1, type: "dashed" }, itemStyle: { color: "#059669" } },
      ],
    } as EChartsOption;
  }, [data, dark]);

  // ── 7. Historical gas consumed (bar, epoch bands) ─────────────────────────
  const histGasConsumedOption: EChartsOption = useMemo(() => {
    if (!data?.historical_gas_consumed) return {} as EChartsOption;
    const points = data.historical_gas_consumed.map((d: any) => [new Date(d.day).getTime(), d.gas_eth]);
    const primary = dark ? "#8B7BFF" : "#5B4BE0";
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const [ts, eth] = params[0].value;
        const usd = data.historical_gas_consumed[params[0]?.dataIndex]?.gas_usd ?? 0;
        const d = new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" });
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${d}</strong><br/>
          <span style="color:${primary}">${Number(eth).toFixed(5)} ETH</span><br/>
          <span style="color:#059669">$${Number(usd).toLocaleString()}</span>
        </div>`;
      }},
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", show: true, start: 0, end: 100, height: 18, bottom: 4, borderColor: "transparent", fillerColor: dark ? "rgba(139,123,255,0.08)" : "rgba(91,75,224,0.08)", handleStyle: { color: dark ? "rgba(139,123,255,0.4)" : "rgba(91,75,224,0.3)" }, textStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9 } },
      ],
      grid: { top: 12, right: 12, bottom: 56, left: 10, containLabel: true },
      xAxis: { type: "time", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => { const d = new Date(v); return `${d.toLocaleString("en", { month: "short" })} '${String(d.getFullYear()).slice(2)}`; } } },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v.toFixed(2)}Ξ` } },
      series: [{ type: "bar", data: points, barMaxWidth: 6, itemStyle: { color: dark ? "rgba(139,123,255,0.55)" : "rgba(91,75,224,0.50)", borderRadius: 0 }, markArea: { silent: true, data: epochMarkAreas() } }],
    } as EChartsOption;
  }, [data, dark]);

  // ── 8. Historical tx types stacked area (all-time) ────────────────────────
  const histTxTypesOption: EChartsOption = useMemo(() => {
    if (!data?.historical_tx_types) return {} as EChartsOption;
    const xData = data.historical_tx_types.map((d: any) => new Date(d.day).getTime());
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const ts = xData[params[0]?.dataIndex];
        const d = new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" });
        const total = params.reduce((s: number, p: any) => s + (p.value || 0), 0);
        let s = `<div style="font-family:var(--font-mono);font-size:11px;min-width:220px"><strong>${d}</strong><br/>`;
        params.forEach((p: any) => {
          const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0;
          s += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>${fmtK(p.value)}</strong> <span style="opacity:0.6">(${pct}%)</span><br/>`;
        });
        return s + "</div>";
      }},
      legend: { type: "scroll", top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", show: true, start: 0, end: 100, height: 18, bottom: 4, borderColor: "transparent", fillerColor: dark ? "rgba(37,99,235,0.08)" : "rgba(37,99,235,0.08)", handleStyle: { color: "rgba(37,99,235,0.4)" }, textStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9 } },
      ],
      grid: { top: 32, right: 12, bottom: 56, left: 10, containLabel: true },
      xAxis: { type: "time", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => { const d = new Date(v); return `${d.toLocaleString("en", { month: "short" })} '${String(d.getFullYear()).slice(2)}`; } } },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => fmtK(v) } },
      series: (["type0","type1","type2","type3"] as const).map((t) => ({
        name: TX_LABELS[t], type: "line", stack: "total", smooth: 0.3, symbol: "none",
        lineStyle: { color: TX_COLORS[t], width: 1 },
        areaStyle: { color: TX_COLORS[t], opacity: dark ? 0.55 : 0.45 },
        itemStyle: { color: TX_COLORS[t] },
        data: data.historical_tx_types.map((d: any) => [new Date(d.day).getTime(), d[t]]),
        markArea: t === "type2" ? { silent: true, data: epochMarkAreas() } : undefined,
      })),
    } as EChartsOption;
  }, [data, dark]);

  // ── 9. EIP-7904 operation comparison (grouped bar) ────────────────────────
  const eip7904Option: EChartsOption = useMemo(() => {
    if (!data?.eip7904_ops) return {} as EChartsOption;
    const ops = data.eip7904_ops;
    const names = ops.map((o: any) => o.operation);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, axisPointer: { type: "shadow" as const }, formatter: (params: any) => {
        const cur = params.find((p: any) => p.seriesName === "Current Gas")?.value ?? 0;
        const post = params.find((p: any) => p.seriesName === "Post EIP-7904")?.value ?? 0;
        const pct = cur > 0 ? (((cur - post) / cur) * 100).toFixed(0) : 0;
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${params[0]?.axisValue}</strong><br/>
          Current: <strong style="color:#DC2626">${Number(cur).toLocaleString()} gas</strong><br/>
          Post-7904: <strong style="color:#059669">${Number(post).toLocaleString()} gas</strong><br/>
          Reduction: <strong style="color:#D97706">↓${pct}%</strong>
        </div>`;
      }},
      legend: { data: ["Current Gas", "Post EIP-7904"], top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      grid: { top: 32, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: names, ...ax, axisLabel: { ...ax.axisLabel, interval: 0, rotate: 15 } },
      yAxis: { type: "log", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v) } },
      series: [
        { name: "Current Gas",    type: "bar", data: ops.map((o: any) => o.current),  itemStyle: { color: dark ? "rgba(220,38,38,0.65)" : "rgba(220,38,38,0.55)", borderRadius: [3,3,0,0] } },
        { name: "Post EIP-7904",  type: "bar", data: ops.map((o: any) => o.post7904), itemStyle: { color: dark ? "rgba(5,150,105,0.70)" : "rgba(5,150,105,0.60)", borderRadius: [3,3,0,0] } },
      ],
    };
  }, [data, dark]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
            <span className="px-2 py-0.5 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
              [ GAS &amp; COMPUTE OBSERVATORY ]
            </span>
            <span className="px-2 py-0.5 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
              HISTORICAL GAS · TRANSACTION TYPES · EIP-7904
            </span>
          </div>
          <button onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--primary-border)] transition-all uppercase tracking-wider">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--primary-text)]" : ""}`} />
            [ SYNC GAS DATA ]
          </button>
        </div>
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Gas Consumption, Transaction Activity &amp; EIP-7904 Impact
          </h1>
          <p className="max-w-3xl text-xs text-[var(--text-secondary)] leading-relaxed">
            Historical gas tracking in ETH &amp; USD, block utilization trends, transaction type distribution across all Ethereum epochs — and the upcoming EIP-7904 Glamsterdam repricing that cuts gas costs by ~78%.
          </p>
        </div>

        {/* Epoch legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
          {[
            { label: "Dencun",      color: "rgba(37,99,235,0.5)",   sub: "Mar 2024 · EIP-4844" },
            { label: "Pectra",      color: "rgba(5,150,105,0.5)",   sub: "May 2025 · EIP-7691" },
            { label: "Fusaka",      color: "rgba(124,58,237,0.5)",  sub: "Apr 2026 · BPO2" },
            { label: "Glamsterdam", color: "rgba(220,38,38,0.45)",  sub: "Upcoming · EIP-7904" },
          ].map(({ label, color, sub }) => (
            <span key={label} className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <strong className="text-[var(--text-secondary)]">{label}</strong>
              <span className="opacity-60">{sub}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[8px]">
        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider shrink-0">Timeframe</span>
        <TimeRangePicker value={dateRange} onChange={setDateRange} presets={["7d", "30d", "90d", "custom"]} />
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DottedCard title="Total Gas Consumed" badge="🟢 Gas" badgeType="default" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{data?.kpi_summary?.total_gas_consumed_eth ?? "—"} ETH</span>
            <span className="text-xs text-[var(--success)] font-sans">{fmtUsd(data?.kpi_summary?.total_gas_consumed_usd)}</span>
          </div>
        </DottedCard>
        <DottedCard title="Avg Gas Price" badge="🟢 Price" badgeType="iris" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--primary-text)] tabular-nums">{data?.kpi_summary?.avg_gas_price_gwei ?? "—"} Gwei</span>
            <span className="text-xs text-[var(--text-secondary)] font-sans">${data?.kpi_summary?.avg_gas_price_usd ?? "—"} per transfer</span>
          </div>
        </DottedCard>
        <DottedCard title="Avg Gas / Block" badge="🟢 Block" badgeType="default" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{fmtK(data?.kpi_summary?.avg_gas_per_block)}</span>
            <span className="text-xs text-[var(--text-secondary)] font-sans">out of {fmtK(data?.kpi_summary?.avg_gas_limit ?? 36_000_000)} gas limit</span>
          </div>
        </DottedCard>
        <DottedCard title="Block Utilization" badge="🟢 Util" badgeType="default" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--success)] tabular-nums">{data?.kpi_summary?.block_utilization_pct ?? "—"}%</span>
            <span className="text-xs text-[var(--text-secondary)] font-sans">Type 2: {data?.kpi_summary?.type2_share_pct}% · Blob: {data?.kpi_summary?.type3_share_pct}%</span>
          </div>
        </DottedCard>
      </div>

      {/* ── SECTION: Gas Market ── */}
      <SectionLabel label="GAS MARKET" icon={Zap} id="gas-market" />

      <DottedCard title="Gas Price — Base Fee + Priority Fee" subtitle="Stacked Gwei values per period. Base fee reflects network demand; priority fee is the tip to validators" badge="🟢 Gas Price" badgeType="iris" techBracket>
        <EChartWrapper option={gasPriceOption} style={{ height: "220px", width: "100%" }} loading={loading} />
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-dashed border-[var(--border)] text-[10px] font-mono">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block" style={{ background: "rgba(37,99,235,0.7)" }} /> Base Fee (EIP-1559)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{ background: "rgba(5,150,105,0.7)" }} /> Priority Fee (Tip)</span>
          <span className="ml-auto text-[var(--text-muted)]">Post-Fusaka fees are dramatically lower</span>
        </div>
      </DottedCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DottedCard title="Gas Consumed per Period (ETH)" subtitle="Total gas burned in ETH — hover for USD equivalent" badge="🟢 Consumed" badgeType="default" techBracket>
          <EChartWrapper option={gasConsumedOption} style={{ height: "220px", width: "100%" }} loading={loading} />
        </DottedCard>
        <DottedCard title="Block Gas Utilization (%)" subtitle="% of block gas limit actually used. 50% dashed line = target. Post-Fusaka headroom visible" badge="🟢 Utilization" badgeType="iris" techBracket>
          <EChartWrapper option={blockUtilOption} style={{ height: "220px", width: "100%" }} loading={loading} />
        </DottedCard>
      </div>

      {/* ── SECTION: Transaction Types ── */}
      <SectionLabel label="TRANSACTION TYPES" icon={BarChart3} id="tx-types" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard title="Transaction Type Distribution" subtitle="Share of each tx type for the selected period" badge="🟢 Type Split" badgeType="iris" techBracket className="lg:col-span-1">
          <EChartWrapper option={txTypeDonutOption} style={{ height: "180px", width: "100%" }} loading={loading} showFooter={false} />
          <div className="grid grid-cols-1 gap-1 pt-2 border-t border-dashed border-[var(--border)]">
            {data?.tx_type_totals?.map((t: any) => (
              <div key={t.type} className="flex items-center justify-between text-[10px] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-[var(--text-secondary)]">{t.type}</span>
                </span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">{t.share_pct}%</span>
              </div>
            ))}
          </div>
          <ChartFooter />
        </DottedCard>

        <DottedCard title="Transaction Count by Type per Period" subtitle="Absolute counts showing which tx types are growing vs fading" badge="🟢 Tx Volume" badgeType="default" techBracket className="lg:col-span-2">
          <EChartWrapper option={txTypeBarOption} style={{ height: "260px", width: "100%" }} loading={loading} />
        </DottedCard>
      </div>

      {/* ── SECTION: EIP-7904 Glamsterdam Impact ── */}
      <SectionLabel label="EIP-7904 // GLAMSTERDAM GAS REPRICING" icon={TrendingDown} id="eip-7904-impact" />

      <Eip7904Banner />

      <DottedCard title="Gas Cost Before vs After EIP-7904 (Log Scale)" subtitle="Grouped comparison for key EVM operations — log scale shows the magnitude of reduction" badge="⚡ EIP-7904" badgeType="iris" techBracket>
        <EChartWrapper option={eip7904Option} style={{ height: "260px", width: "100%" }} loading={loading} />
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-dashed border-[var(--border)] text-[10px] font-mono">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm inline-block bg-[rgba(220,38,38,0.6)]" /> Current gas cost</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm inline-block bg-[rgba(5,150,105,0.65)]" /> Post EIP-7904 cost</span>
          <span className="ml-auto text-[var(--accent)] font-bold">~78.6% avg reduction across all operations</span>
        </div>
      </DottedCard>

      {/* ── SECTION: Long-Term History ── */}
      <SectionLabel label="LONG-TERM HISTORY // DENCUN → NOW" icon={Activity} id="history" />

      <DottedCard title="Historical Gas Price — Base Fee (All-Time)" subtitle="Gwei base fee from Dencun launch to now. Epoch bands show protocol upgrades and their fee impact" badge="🟢 Historical Price" badgeType="default" techBracket>
        <EChartWrapper option={histGasPriceOption} style={{ height: "280px", width: "100%" }} loading={loading} />
      </DottedCard>

      <DottedCard title="Historical Gas Consumed — Daily ETH (All-Time)" subtitle="Daily ETH burned on gas. Hover for USD equivalent. Drag to zoom" badge="🟢 Historical Gas" badgeType="iris" techBracket>
        <EChartWrapper option={histGasConsumedOption} style={{ height: "280px", width: "100%" }} loading={loading} />
      </DottedCard>

      <DottedCard title="Transaction Type Activity — All-Time (Dencun → Now)" subtitle="How Type 0 phased out, Type 2 became dominant, and Type 3 blobs emerged post-EIP-4844" badge="🟢 Historical Tx Types" badgeType="default" techBracket>
        <EChartWrapper option={histTxTypesOption} style={{ height: "300px", width: "100%" }} loading={loading} />
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-dashed border-[var(--border)] text-[10px] font-mono">
          {(["type0","type1","type2","type3"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TX_COLORS[t] }} />
              {TX_LABELS[t]}
            </span>
          ))}
        </div>
      </DottedCard>

    </div>
  );
}
