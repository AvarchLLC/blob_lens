"use client";

import { InfoTooltip } from "@/components/shared/InfoTooltip";
import type { AlertRegimeThreshold, RegimeAlert } from "@/types";
import { Bell, BellOff, ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const REGIME_OPTIONS: { value: AlertRegimeThreshold; label: string; color: string }[] = [
  { value: "healthy",   label: "Healthy+",   color: "#00df81" },
  { value: "congested", label: "Congested+", color: "#fcbb00" },
  { value: "spike",     label: "Spike only", color: "#fb2c36" },
];

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#71717a",
  healthy:        "#00df81",
  congested:      "#fcbb00",
  spike:          "#fb2c36",
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
    <div className="rounded-xl border border-[#27272a] bg-[#111117]">
      {/* Header row — always visible */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Regime Alerts</span>
          {alerts.length > 0 && (
            <span className="rounded-full bg-[#1E2D45] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {alerts.filter((a) => a.enabled).length} active
            </span>
          )}
          <InfoTooltip
            content="Register webhook URLs that will receive a POST request whenever the blob fee market regime crosses your chosen threshold. Useful for rollup operators who want to automate batching decisions based on market conditions."
            side="right"
          />
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-[#27272a] px-5 pb-5 pt-4 space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Each registered webhook receives a <code className="font-mono bg-[#1E2D45] px-1 rounded">POST</code> with a JSON payload when the market enters your threshold regime and the regime has changed since the last fire. Requests timeout after 5 seconds. Min 1-minute cooldown between fires.
          </p>

          {/* Existing alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const regimeColor = REGIME_OPTIONS.find((o) => o.value === alert.min_regime)?.color ?? "#71717a";
                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-3 rounded-lg border border-[#27272a] px-3 py-2.5"
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(alert)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      title={alert.enabled ? "Disable" : "Enable"}
                    >
                      {alert.enabled
                        ? <Bell className="h-3.5 w-3.5 text-[#00df81]" />
                        : <BellOff className="h-3.5 w-3.5" />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-mono text-foreground truncate">{alert.webhook_url}</p>
                      <div className="flex items-center gap-2">
                        {alert.label && (
                          <span className="text-[10px] text-muted-foreground">{alert.label}</span>
                        )}
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{ color: regimeColor, background: `${regimeColor}18`, border: `1px solid ${regimeColor}30` }}
                        >
                          {REGIME_OPTIONS.find((o) => o.value === alert.min_regime)?.label ?? alert.min_regime}
                        </span>
                        {alert.last_fired_regime && (
                          <span className="text-[10px] text-muted-foreground">
                            last fired:{" "}
                            <span style={{ color: REGIME_COLOR[alert.last_fired_regime] ?? "#71717a" }}>
                              {alert.last_fired_regime}
                            </span>
                            {" "}· {timeAgo(alert.last_fired_at)}
                          </span>
                        )}
                        {!alert.last_fired_regime && (
                          <span className="text-[10px] text-muted-foreground">never fired</span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(alert.id)}
                      className="shrink-0 text-muted-foreground/40 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add form */}
          <form onSubmit={handleAdd} className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
              Add webhook
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.example.com/blob-alerts"
                className="flex-1 min-w-0 rounded-lg border border-[#27272a] bg-[#0a0a0e] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-[#3f3f46] focus:outline-none"
                required
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (optional)"
                maxLength={80}
                className="flex-1 min-w-0 rounded-lg border border-[#27272a] bg-[#0a0a0e] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-[#3f3f46] focus:outline-none"
              />
              <select
                value={minRegime}
                onChange={(e) => setMinRegime(e.target.value as AlertRegimeThreshold)}
                className="rounded-lg border border-[#27272a] bg-[#0a0a0e] px-3 py-2 text-xs text-foreground focus:border-[#3f3f46] focus:outline-none"
              >
                {REGIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg border border-[#00df81]/30 bg-[#00df81]/10 px-3 py-2 text-xs font-medium text-[#00df81] hover:bg-[#00df81]/20 transition-colors disabled:opacity-50"
              >
                {submitting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Plus className="h-3.5 w-3.5" />}
                Add
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </form>

          {/* Payload preview */}
          <details className="group">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.08em] text-muted-foreground/60 hover:text-muted-foreground list-none flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
              Example webhook payload
            </summary>
            <pre className="mt-2 rounded-lg bg-[#0a0a0e] border border-[#1E2D45] p-3 text-[10px] text-muted-foreground leading-relaxed overflow-x-auto">{JSON.stringify({
              event: "regime_change",
              regime: "congested",
              fee_gwei: 0.0045,
              avg_blobs_per_block: 7.2,
              timestamp: "2025-01-01T12:00:00.000Z",
              source: "BlobLens",
              alert_label: "my-operator",
            }, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
