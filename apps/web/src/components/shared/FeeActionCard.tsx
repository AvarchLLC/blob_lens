import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { ForecastData, MarketHour } from "@/types";

type Regime = "undersaturated" | "healthy" | "congested" | "spike";
type Action = "submit" | "wait" | "watch" | "avoid" | "neutral";

interface Props {
  regime: Regime;
  currentFeeWei: number;
  avgFeeWei24h: number;
  forecast: ForecastData | null;
}

function getAdvice(
  regime: Regime,
  currentFeeWei: number,
  avgFeeWei24h: number,
  excessTrend: number
): { action: Action; text: string } {
  const pct     = avgFeeWei24h > 0 ? ((currentFeeWei - avgFeeWei24h) / avgFeeWei24h) * 100 : 0;
  const rising  = excessTrend > 0;

  if (regime === "spike")
    return { action: "avoid", text: "Active fee spike — avoid posting, cost is 10–100× normal" };
  if (regime === "congested" && rising)
    return { action: "wait",  text: "Congestion building — fee pressure rising, consider waiting" };
  if (regime === "congested" && !rising)
    return { action: "watch", text: "Congested but easing — monitor, wait for healthy regime" };
  if (regime === "undersaturated")
    return { action: "submit", text: "Market is undersaturated — submit anytime" };
  if (pct < -10 && !rising)
    return { action: "submit", text: `Fee ${Math.abs(pct).toFixed(0)}% below 24h avg and easing — optimal window` };
  if (pct < 10 && !rising)
    return { action: "submit", text: "Near 24h average with pressure easing — reasonable conditions" };
  if (pct > 20 && rising)
    return { action: "wait",  text: `Fee ${pct.toFixed(0)}% above average and rising — consider waiting` };
  if (!rising)
    return { action: "submit", text: "Pressure easing — conditions improving" };
  return { action: "neutral", text: "Normal conditions — no strong signal either way" };
}

const ACTION_STYLES: Record<Action, { border: string; bg: string; icon: string; label: string }> = {
  submit:  { border: "border-emerald-500/30", bg: "bg-emerald-500/5",  icon: "text-emerald-400", label: "✓ Post now" },
  wait:    { border: "border-orange-500/30",  bg: "bg-orange-500/5",   icon: "text-orange-400",  label: "⏳ Wait" },
  watch:   { border: "border-amber-500/30",   bg: "bg-amber-500/5",    icon: "text-amber-400",   label: "👁 Monitor" },
  avoid:   { border: "border-red-500/30",     bg: "bg-red-500/5",      icon: "text-red-400",     label: "✗ Avoid" },
  neutral: { border: "border-border/40",      bg: "bg-surface/50",     icon: "text-text-secondary", label: "— Neutral" },
};

const ActionIcon = ({ action }: { action: Action }) => {
  const cls = `h-4 w-4 ${ACTION_STYLES[action].icon}`;
  if (action === "submit")  return <CheckCircle2  className={cls} />;
  if (action === "wait")    return <XCircle        className={cls} />;
  if (action === "watch")   return <AlertTriangle  className={cls} />;
  if (action === "avoid")   return <XCircle        className={cls} />;
  return <MinusCircle className={cls} />;
};

export function FeeActionCard({ regime, currentFeeWei, avgFeeWei24h, forecast }: Props) {
  const excessTrend  = forecast?.excess_trend ?? 0;
  const { action, text } = getAdvice(regime, currentFeeWei, avgFeeWei24h, excessTrend);
  const s = ACTION_STYLES[action];

  const currentGwei = currentFeeWei / 1e9;
  const avgGwei     = avgFeeWei24h  / 1e9;
  const pct         = avgGwei > 0 ? ((currentGwei - avgGwei) / avgGwei) * 100 : 0;
  const rising      = excessTrend > 0;

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-5 flex flex-col sm:flex-row sm:items-center gap-4`}>
      {/* Left: action badge */}
      <div className="flex items-center gap-3 shrink-0">
        <ActionIcon action={action} />
        <span className={`text-xs font-bold uppercase tracking-widest ${s.icon}`}>{s.label}</span>
      </div>

      <div className="hidden sm:block w-px h-8 bg-border/30 shrink-0" />

      {/* Middle: fee metrics */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 flex-1">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-50 mb-0.5">Current Fee</p>
          <p className="font-mono text-sm font-bold text-text-primary">
            {currentGwei < 0.001 ? currentGwei.toFixed(6) : currentGwei.toFixed(4)} gwei
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-50 mb-0.5">24h Avg</p>
          <p className="font-mono text-sm text-text-secondary">
            {avgGwei < 0.001 ? avgGwei.toFixed(6) : avgGwei.toFixed(4)} gwei
          </p>
        </div>
        {avgGwei > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-50 mb-0.5">vs Avg</p>
            <p className={`font-mono text-sm font-bold ${pct < -5 ? "text-emerald-400" : pct > 5 ? "text-orange-400" : "text-text-secondary"}`}>
              {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
            </p>
          </div>
        )}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-50 mb-0.5">Pressure</p>
          <p className={`text-sm font-bold flex items-center gap-1 ${rising ? "text-orange-400" : "text-emerald-400"}`}>
            {rising ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {rising ? "Rising" : "Easing"}
          </p>
        </div>
      </div>

      {/* Right: recommendation text */}
      <div className="sm:max-w-[240px] shrink-0">
        <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
