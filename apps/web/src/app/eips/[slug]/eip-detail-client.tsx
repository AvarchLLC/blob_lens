"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowLeft, ArrowRight, ExternalLink, CheckCircle2, Clock, Zap, FileCode, ChevronRight } from "lucide-react";
import { DottedCard } from "@/components/ui/dotted-card";
import { EChartWrapper } from "@/components/charts/echart-wrapper";
import { FORK_META, type Eip, type EipChartData } from "@/lib/eip-data";
import { cn } from "@/lib/utils";
import type { EChartsOption } from "echarts";

function pctChange(current: number, post: number) {
  return Math.round(((post - current) / current) * 100);
}

// ── Shared chart style helpers ────────────────────────────────────────────────
function chartColors(dark: boolean) {
  return {
    text: dark ? "#8E8EA8" : "#555566",
    grid: dark ? "#1A1A24" : "#F3F3F7",
    bg: dark ? "#121217" : "#FFFFFF",
    border: dark ? "#3A3275" : "#CBC4FA",
    fg: dark ? "#F4F4F8" : "#1A1A24",
    dimBar: dark ? "#2A2A3E" : "#E5E5F0",
  };
}

function tooltipStyle(dark: boolean) {
  const c = chartColors(dark);
  return {
    backgroundColor: c.bg,
    borderColor: c.border,
    borderWidth: 1,
    padding: [8, 12] as [number, number],
    textStyle: { color: c.fg, fontFamily: "Geist Mono, monospace", fontSize: 11 },
    extraCssText: `background:${c.bg}!important;border:1px solid ${c.border}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.2);`,
    confine: true,
  };
}

// ── Chart builders per kind ───────────────────────────────────────────────────
function buildBeforeAfterOption(cd: EipChartData, dark: boolean): EChartsOption {
  const c = chartColors(dark);
  const labels = cd.bars.map(b => b.label);
  return {
    backgroundColor: "transparent",
    tooltip: {
      ...tooltipStyle(dark),
      trigger: "axis",
      formatter: (params: any) => {
        const bar = cd.bars[params[0]?.dataIndex];
        if (!bar) return "";
        const before = bar.before ?? 0;
        const after  = bar.after  ?? 0;
        const pct    = before > 0 ? pctChange(before, after) : null;
        return `<div style="font-family:Geist Mono,monospace;font-size:11px">
          <strong>${bar.label}</strong><br/>
          Before: <strong>${before.toLocaleString()} ${bar.unit}</strong><br/>
          After: <strong style="color:${bar.color}">${after.toLocaleString()} ${bar.unit}</strong>
          ${pct !== null ? `<br/>Change: <strong style="color:${pct < 0 ? "#22C55E" : "#F59E0B"}">${pct > 0 ? "+" : ""}${pct}%</strong>` : ""}
        </div>`;
      },
    },
    grid: { top: 12, right: 20, bottom: 60, left: 10, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { color: c.text, fontFamily: "var(--font-mono)", fontSize: 9, interval: 0, overflow: "truncate", width: 90 },
      axisLine: { lineStyle: { color: c.dimBar } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: c.text, fontFamily: "var(--font-mono)", fontSize: 9,
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v),
      },
      splitLine: { lineStyle: { color: c.grid, type: "dashed" } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Before",
        type: "bar",
        data: cd.bars.map(b => b.before ?? 0),
        itemStyle: { color: c.dimBar, borderRadius: [3, 3, 0, 0] },
        barGap: "8%",
      },
      {
        name: "After",
        type: "bar",
        data: cd.bars.map(b => ({ value: b.after ?? 0, itemStyle: { color: b.color, opacity: 0.9, borderRadius: [3, 3, 0, 0] } })),
        barGap: "8%",
      },
    ],
    legend: {
      bottom: 0,
      textStyle: { color: c.text, fontFamily: "var(--font-mono)", fontSize: 10 },
      itemWidth: 10, itemHeight: 10,
    },
  } as EChartsOption;
}

function buildMilestonesOption(cd: EipChartData, dark: boolean): EChartsOption {
  const c = chartColors(dark);
  return {
    backgroundColor: "transparent",
    tooltip: {
      ...tooltipStyle(dark),
      trigger: "axis",
      formatter: (params: any) => {
        const bar = cd.bars[params[0]?.dataIndex];
        if (!bar) return "";
        return `<div style="font-family:Geist Mono,monospace;font-size:11px">
          <strong>${bar.label}</strong><br/>
          Value: <strong style="color:${bar.color}">${(bar.value ?? 0).toLocaleString()} ${bar.unit}</strong>
        </div>`;
      },
    },
    grid: { top: 12, right: 20, bottom: 60, left: 10, containLabel: true },
    xAxis: {
      type: "category",
      data: cd.bars.map(b => b.label),
      axisLabel: { color: c.text, fontFamily: "var(--font-mono)", fontSize: 8, rotate: 15, interval: 0 },
      axisLine: { lineStyle: { color: c.dimBar } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: c.text, fontFamily: "var(--font-mono)", fontSize: 9,
        formatter: (v: number) => `${v}M`,
      },
      splitLine: { lineStyle: { color: c.grid, type: "dashed" } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: "bar",
      data: cd.bars.map((b, i) => ({
        value: b.value ?? 0,
        itemStyle: {
          color: b.color,
          opacity: 0.6 + (i / cd.bars.length) * 0.4,
          borderRadius: [3, 3, 0, 0],
        },
      })),
      label: {
        show: true,
        position: "top",
        color: c.text,
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        formatter: (p: any) => `${p.value}M`,
      },
    }],
  } as EChartsOption;
}

function buildDistributionOption(cd: EipChartData, dark: boolean): EChartsOption {
  const c = chartColors(dark);
  const total = cd.bars.reduce((s, b) => s + (b.value ?? 0), 0);
  return {
    backgroundColor: "transparent",
    tooltip: {
      ...tooltipStyle(dark),
      trigger: "item",
      formatter: (params: any) => {
        const bar = cd.bars[params.dataIndex];
        if (!bar) return "";
        return `<div style="font-family:Geist Mono,monospace;font-size:11px">
          <strong>${bar.label}</strong><br/>
          Share: <strong style="color:${bar.color}">${(bar.value ?? 0).toFixed(1)}%</strong>
          ${bar.beforeLabel ? `<br/><span style="color:${c.text}">${bar.beforeLabel}</span>` : ""}
        </div>`;
      },
    },
    series: [{
      type: "pie",
      radius: ["40%", "70%"],
      center: ["50%", "48%"],
      data: cd.bars.map(b => ({
        name: b.label,
        value: b.value ?? 0,
        itemStyle: { color: b.color, borderColor: dark ? "#0C0C10" : "#FFFFFF", borderWidth: 2 },
        label: { show: (b.value ?? 0) > 2 },
      })),
      label: {
        color: c.text, fontFamily: "var(--font-mono)", fontSize: 9,
        formatter: (p: any) => `${p.name.split(" — ")[0]}\n${p.value.toFixed(1)}%`,
      },
      labelLine: { lineStyle: { color: c.text, width: 1 } },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.3)" } },
    }],
  } as EChartsOption;
}

// ── EipChartBlock component ───────────────────────────────────────────────────
function EipChartBlock({ cd, dark, eipId }: { cd: EipChartData; dark: boolean; eipId: string }) {
  const option = useMemo(() => {
    if (cd.kind === "before-after") return buildBeforeAfterOption(cd, dark);
    if (cd.kind === "milestones")   return buildMilestonesOption(cd, dark);
    return buildDistributionOption(cd, dark);
  }, [cd, dark]);

  const isDistribution = cd.kind === "distribution";

  return (
    <DottedCard title={cd.title} subtitle={cd.subtitle} badge={cd.badge} techBracket>
      <EChartWrapper option={option} style={{ height: isDistribution ? "260px" : "240px", width: "100%" }} showFooter={false} />

      {/* Before/after summary table for "before-after" kind */}
      {cd.kind === "before-after" && (
        <div className="overflow-x-auto mt-2 border-t border-dashed border-[var(--border)] pt-3">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="py-1.5 px-2 text-left">Metric</th>
                <th className="py-1.5 px-2 text-right">Before</th>
                <th className="py-1.5 px-2 text-right">After {eipId}</th>
                <th className="py-1.5 px-2 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {cd.bars.filter(b => (b.before ?? 0) > 0 || (b.after ?? 0) > 0).map(b => {
                const before = b.before ?? 0;
                const after  = b.after  ?? 0;
                const pct    = before > 0 ? pctChange(before, after) : null;
                return (
                  <tr key={b.label} className="border-b border-dashed border-[var(--border)] hover:bg-[var(--surface-sunken)] transition-colors">
                    <td className="py-2 px-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: b.color }} />
                      {b.label}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-[var(--text-muted)]">
                      {b.beforeLabel ?? (before > 0 ? before.toLocaleString() : "—")}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums font-bold" style={{ color: b.color }}>
                      {b.afterLabel ?? (after > 0 ? after.toLocaleString() : "—")}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums font-bold">
                      {pct !== null ? (
                        <span className={pct < 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                          {pct > 0 ? "+" : ""}{pct}%
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Distribution legend table */}
      {cd.kind === "distribution" && (
        <div className="overflow-x-auto mt-2 border-t border-dashed border-[var(--border)] pt-3">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="py-1.5 px-2 text-left">Type</th>
                <th className="py-1.5 px-2 text-right">Share</th>
                <th className="py-1.5 px-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {cd.bars.map(b => (
                <tr key={b.label} className="border-b border-dashed border-[var(--border)] hover:bg-[var(--surface-sunken)] transition-colors">
                  <td className="py-2 px-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: b.color }} />
                    {b.label}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums font-bold" style={{ color: b.color }}>
                    {(b.value ?? 0).toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-[var(--text-muted)] text-[10px]">{b.beforeLabel ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cd.note && (
        <p className="mt-2 text-[10px] font-mono text-[var(--text-muted)] italic">{cd.note}</p>
      )}
    </DottedCard>
  );
}

// ── Opcode chart (EIP-7904 specific) ─────────────────────────────────────────
function OpcodeChartBlock({ eip, dark }: { eip: Eip; dark: boolean }) {
  const ops = eip.opcodes!;
  const c = chartColors(dark);

  const option: EChartsOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: {
      ...tooltipStyle(dark),
      trigger: "axis",
      formatter: (params: any) => {
        const op = ops[params[0]?.dataIndex];
        if (!op) return "";
        const pct = pctChange(op.current, op.post);
        return `<div style="font-family:Geist Mono,monospace;font-size:11px">
          <strong>${op.operation}</strong><br/>
          Current: <strong>${op.current.toLocaleString()} gas</strong><br/>
          Post-${eip.id}: <strong style="color:${op.color}">${op.post.toLocaleString()} gas</strong><br/>
          Change: <strong style="color:#22C55E">${pct}%</strong>
        </div>`;
      },
    },
    grid: { top: 12, right: 20, bottom: 80, left: 10, containLabel: true },
    xAxis: {
      type: "category",
      data: ops.map(o => o.operation),
      axisLabel: { color: c.text, fontFamily: "var(--font-mono)", fontSize: 9, rotate: 20, interval: 0 },
      axisLine: { lineStyle: { color: c.dimBar } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: c.text, fontFamily: "var(--font-mono)", fontSize: 9,
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v),
      },
      splitLine: { lineStyle: { color: c.grid, type: "dashed" } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Current",
        type: "bar",
        data: ops.map(o => o.current),
        itemStyle: { color: c.dimBar, borderRadius: [3, 3, 0, 0] },
        barGap: "8%",
      },
      {
        name: `Post-${eip.id}`,
        type: "bar",
        data: ops.map(o => ({ value: o.post, itemStyle: { color: o.color, opacity: 0.9, borderRadius: [3, 3, 0, 0] } })),
        barGap: "8%",
      },
    ],
    legend: {
      bottom: 4,
      textStyle: { color: c.text, fontFamily: "var(--font-mono)", fontSize: 10 },
      itemWidth: 10, itemHeight: 10,
    },
  } as EChartsOption), [eip, dark, ops, c]);

  return (
    <DottedCard
      title="Opcode Gas Cost Comparison"
      subtitle={`Current vs Post-${eip.id} gas costs — benchmark-driven repricing`}
      badge="GAS COSTS"
      techBracket
    >
      <EChartWrapper option={option} style={{ height: "280px", width: "100%" }} showFooter={false} />

      <div className="overflow-x-auto mt-2 border-t border-dashed border-[var(--border)] pt-3">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="py-1.5 px-2 text-left">Operation</th>
              <th className="py-1.5 px-2 text-right">Current</th>
              <th className="py-1.5 px-2 text-right">Post-{eip.id}</th>
              <th className="py-1.5 px-2 text-right">Reduction</th>
            </tr>
          </thead>
          <tbody>
            {ops.map(op => {
              const pct = pctChange(op.current, op.post);
              return (
                <tr key={op.operation} className="border-b border-dashed border-[var(--border)] hover:bg-[var(--surface-sunken)] transition-colors">
                  <td className="py-2 px-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: op.color }} />
                    {op.operation}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-[var(--text-muted)]">{op.current.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right tabular-nums font-bold" style={{ color: op.color }}>{op.post.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right tabular-nums font-bold text-green-600 dark:text-green-400">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DottedCard>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function EipDetailClient({ eip }: { eip: Eip }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const forkMeta = FORK_META[eip.fork];
  const isLive = eip.status === "live";

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-2 font-sans">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--text-muted)]">
        <Link href="/eips" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> EIP Explorer
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[var(--primary-text)] font-bold">{eip.id}</span>
      </nav>

      {/* Hero */}
      <div className="flex flex-col gap-4 pb-5 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="px-2 py-0.5 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
            [ {eip.id} ]
          </span>
          <span className="px-2 py-0.5 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
            {eip.category.toUpperCase()} · {eip.fork.toUpperCase()}
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded-[4px] border text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1",
            isLive
              ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
          )}>
            {isLive ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isLive ? `LIVE · ${eip.activatedAt}` : "UPCOMING"}
          </span>
          {eip.pageLink && (
            <Link
              href={eip.pageLink}
              className="px-2 py-0.5 rounded-[4px] border border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--primary-text)] hover:border-[var(--primary-border)] transition-colors flex items-center gap-1"
            >
              <Zap className="w-2.5 h-2.5" /> Live Data
            </Link>
          )}
          <a
            href={eip.link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-0.5 rounded-[4px] border border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--primary-text)] hover:border-[var(--primary-border)] transition-colors flex items-center gap-1"
          >
            Spec <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
            {eip.id}: {eip.title}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
            {eip.longDesc}
          </p>
        </div>

        <div className="text-[10px] font-mono text-[var(--text-muted)]">
          Authors: {eip.authors.join(" · ")}
        </div>
      </div>

      {/* Impact summary */}
      <DottedCard
        title="Protocol Impact"
        subtitle={eip.impact.headline}
        badge={isLive ? "VERIFIED" : "PROJECTED"}
        badgeType={isLive ? "live" : "warning"}
        techBracket
      >
        <ul className="flex flex-col gap-2 mt-1">
          {eip.impact.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)] leading-relaxed">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--primary-text)] shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </DottedCard>

      {/* Generic chartData block (all EIPs except EIP-7904 which uses opcodes) */}
      {eip.chartData && <EipChartBlock cd={eip.chartData} dark={dark} eipId={eip.id} />}

      {/* Opcode chart — EIP-7904 only */}
      {eip.opcodes && eip.opcodes.length > 0 && <OpcodeChartBlock eip={eip} dark={dark} />}

      {/* Fork context */}
      <DottedCard title={`${eip.fork} Upgrade`} subtitle="Other EIPs activated in the same fork" techBracket>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4" style={{ color: forkMeta.color }} />
          <span className="font-mono font-bold text-sm" style={{ color: forkMeta.color }}>{eip.fork}</span>
          {forkMeta.date && <span className="font-mono text-xs text-[var(--text-muted)]">· {forkMeta.date}</span>}
          <span className={cn("px-1.5 py-0.5 rounded-[3px] border text-[9px] font-mono font-bold uppercase",
            forkMeta.status === "live"
              ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
          )}>
            {forkMeta.status === "live" ? "LIVE" : "UPCOMING"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <SiblingEips currentSlug={eip.slug} fork={eip.fork} />
        </div>
      </DottedCard>

      {/* Back */}
      <div className="flex justify-start pt-2">
        <Link
          href="/eips"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[var(--surface-sunken)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to EIP Explorer
        </Link>
      </div>

    </div>
  );
}

function SiblingEips({ currentSlug, fork }: { currentSlug: string; fork: string }) {
  const { EIPS } = require("@/lib/eip-data");
  const siblings = (EIPS as Eip[]).filter(e => e.fork === fork && e.slug !== currentSlug);
  if (!siblings.length) return <span className="text-xs text-[var(--text-muted)] font-mono">No other tracked EIPs in this fork.</span>;
  return (
    <>
      {siblings.map(s => (
        <Link
          key={s.slug}
          href={`/eips/${s.slug}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[var(--surface-sunken)] border border-[var(--border)] hover:border-[var(--primary-border)] hover:text-[var(--primary-text)] transition-all"
        >
          <FileCode className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <div>
            <div className="font-mono font-bold text-xs text-[var(--primary-text)]">{s.id}</div>
            <div className="text-[10px] text-[var(--text-muted)] max-w-[180px] truncate">{s.title}</div>
          </div>
          <ArrowRight className="w-3 h-3 text-[var(--text-muted)] ml-1" />
        </Link>
      ))}
    </>
  );
}
