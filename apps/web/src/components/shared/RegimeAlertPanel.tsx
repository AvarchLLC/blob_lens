"use client";

import { InfoTooltip } from "@/components/shared/InfoTooltip";
import type { AlertRegimeThreshold, RegimeAlert } from "@/types";
import { Bell, BellOff, ChevronDown, ChevronRight, Loader2, Plus, Trash2, Webhook } from "lucide-react";
import * as React from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const REGIME_OPTIONS: { value: AlertRegimeThreshold; label: string; color: string }[] = [
  { value: "healthy",   label: "Healthy+",   color: "var(--status-healthy)" },
  { value: "congested", label: "Congested+", color: "var(--status-warning)" },
  { value: "spike",     label: "Spike only", color: "var(--status-critical)" },
];

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "var(--status-neutral)",
  healthy:        "var(--status-healthy)",
  congested:      "var(--status-warning)",
  spike:          "var(--status-critical)",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)  return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export function RegimeAlertPanel() {
  const [open, setOpen] = React.useState(false);
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [minRegime, setMinRegime] = React.useState<AlertRegimeThreshold>("congested");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { data, mutate } = useSWR<{ data: RegimeAlert[] }>("/api/alerts", fetcher, {
    refreshInterval: open ? 30_000 : 0,
  });

  const alerts = data?.data ?? [];

  // Trigger regime check on each render cycle when the panel is open (piggybacks on SWR)
  React.useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      fetch("/api/alerts/check", { method: "POST" }).catch(() => null);
    }, 30_000);
    // fire once immediately
    fetch("/api/alerts/check", { method: "POST" }).catch(() => null);
    return () => clearInterval(id);
  }, [open]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!webhookUrl.trim()) { setError("URL is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhookUrl.trim(), label: label.trim(), min_regime: minRegime }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save"); return; }
      setWebhookUrl("");
      setLabel("");
      mutate();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    mutate();
  }

  async function handleToggle(alert: RegimeAlert) {
    await fetch(`/api/alerts?id=${alert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !alert.enabled }),
    });
    mutate();
  }

  return (
    <div className="surface border border-border overflow-hidden">
      {/* Header row — always visible */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-6 py-5 text-left hover:bg-surface-elevated transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-60">
            Regime Notifications
          </span>
          {alerts.length > 0 && (
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
              {alerts.filter((a) => a.enabled).length} Active
            </span>
          )}
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-text-secondary opacity-40" />
          : <ChevronRight className="h-4 w-4 text-text-secondary opacity-40" />}
      </button>

      {open && (
        <div className="border-t border-border px-6 pb-8 pt-6 space-y-8 animate-fade-down">
          <div className="flex gap-4 p-4 bg-primary/5 border border-primary/10 rounded-md">
             <Webhook className="h-5 w-5 text-primary shrink-0 mt-0.5" />
             <p className="text-xs text-text-secondary leading-relaxed">
               Register webhook URLs to receive a <code className="font-mono bg-surface-elevated px-1 rounded border border-border">POST</code> JSON payload when the market crosses a regime threshold. Ideal for automated rollup batching strategies.
             </p>
          </div>

          {/* Existing alerts */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[9px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Managed Webhooks</h4>
              {alerts.map((alert) => {
                const regimeColor = REGIME_OPTIONS.find((o) => o.value === alert.min_regime)?.color ?? "var(--status-neutral)";
                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-4 p-4 surface-elevated border border-border rounded-md group"
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(alert)}
                      className="shrink-0 transition-all hover:scale-110"
                    >
                      {alert.enabled
                        ? <Bell className="h-4 w-4 text-status-healthy" />
                        : <BellOff className="h-4 w-4 text-text-secondary opacity-30" />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                         <p className="text-xs font-mono font-bold text-text-primary truncate">{alert.webhook_url}</p>
                         {alert.label && (
                           <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-background border border-border rounded text-text-secondary">{alert.label}</span>
                         )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{ color: regimeColor, backgroundColor: `color-mix(in srgb, ${regimeColor} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${regimeColor} 20%, transparent)` }}
                        >
                          {REGIME_OPTIONS.find((o) => o.value === alert.min_regime)?.label ?? alert.min_regime}
                        </span>
                        {alert.last_fired_regime ? (
                          <span className="text-[10px] text-text-secondary opacity-60">
                            Last fired: <span className="font-bold uppercase tracking-tighter" style={{ color: REGIME_COLOR[alert.last_fired_regime] }}>{alert.last_fired_regime}</span> · {timeAgo(alert.last_fired_at)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-secondary opacity-40 italic">Never triggered</span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(alert.id)}
                      className="shrink-0 text-text-secondary opacity-20 hover:text-status-critical hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="space-y-4 pt-4 border-t border-border">
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Register New Webhook</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <span className="text-[9px] font-bold uppercase text-text-secondary opacity-60">Endpoint URL</span>
                 <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://api.rollups.io/webhooks/blobs"
                    className="w-full rounded border border-border bg-background px-3 py-2.5 text-xs text-text-primary placeholder:text-text-secondary placeholder:opacity-30 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    required
                 />
              </div>
              <div className="space-y-1.5">
                 <span className="text-[9px] font-bold uppercase text-text-secondary opacity-60">Metadata Label</span>
                 <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Production Monitor"
                    maxLength={80}
                    className="w-full rounded border border-border bg-background px-3 py-2.5 text-xs text-text-primary placeholder:text-text-secondary placeholder:opacity-30 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                 />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-end">
               <div className="flex-1 w-full space-y-1.5">
                  <span className="text-[9px] font-bold uppercase text-text-secondary opacity-60">Trigger Threshold</span>
                  <div className="flex gap-2 p-1 bg-surface-elevated rounded border border-border">
                     {REGIME_OPTIONS.map((o) => (
                       <button
                         key={o.value}
                         type="button"
                         onClick={() => setMinRegime(o.value)}
                         className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
                            minRegime === o.value 
                              ? 'bg-surface border border-border text-text-primary shadow-sm' 
                              : 'text-text-secondary opacity-40 hover:opacity-70'
                         }`}
                       >
                         {o.label}
                       </button>
                     ))}
                  </div>
               </div>
               
               <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-32 py-2.5 bg-primary text-background font-bold text-[10px] uppercase tracking-widest rounded hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
               >
                  {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Register
               </button>
            </div>
            {error && <p className="text-[10px] font-bold text-status-critical uppercase tracking-widest">{error}</p>}
          </form>

          {/* Payload preview */}
          <div className="pt-6 border-t border-border">
             <details className="group">
                <summary className="cursor-pointer text-[9px] uppercase tracking-[0.2em] text-text-secondary opacity-40 hover:opacity-100 list-none flex items-center gap-2 transition-all">
                  <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  Technical Specification (Payload)
                </summary>
                <pre className="mt-4 rounded border border-border bg-background p-4 text-[10px] text-text-secondary font-mono leading-relaxed overflow-x-auto whitespace-pre">
                  {JSON.stringify({
                    event: "regime_change",
                    regime: "congested",
                    fee_gwei: 0.142,
                    avg_blobs_per_block: 7.2,
                    timestamp: new Date().toISOString(),
                    source: "BlobLens Protocol Intelligence",
                    alert_label: "production-sequencer",
                  }, null, 2)}
                </pre>
             </details>
          </div>
        </div>
      )}
    </div>
  );
}
