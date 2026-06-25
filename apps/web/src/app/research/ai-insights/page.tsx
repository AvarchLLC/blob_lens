import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { getAIInsights } from "@/lib/queries";
import { Brain, Sparkles, Calendar, ArrowRight, Rss, ShieldAlert } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export const revalidate = 3600; // 1 hour

export default async function AIInsightsPage() {
  const insights = await getAIInsights();

  return (
    <div className="animate-page-in space-y-10">
      {/* ── Page Header ── */}
      <PageHeader
        meta="Intelligence"
        title="AI Research Insights"
        summary="Automated synthesis of on-chain blob market dynamics using Claude 3.5 Sonnet. Deep-dive reports on regime shifts, rollup behavior, and cost trends."
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-dashed border-primary/30 rounded-none">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono">Autonomous Analysis Console</span>
        </div>
      </PageHeader>

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Insights Generated"
          value={insights.length.toString()}
          note="Total research reports indexed in database."
          icon="database"
          accentColor="#9060FF"
          glowColor="rgba(144, 96, 255, 0.15)"
        />
        <MetricCard
          label="Avg Confidence"
          value="92%"
          note="Mean analytical model confidence score."
          icon="gauge"
          accentColor="#00df81"
          glowColor="rgba(0, 223, 129, 0.15)"
        />
        <MetricCard
          label="Model Engine"
          value="Claude 3.5"
          note="Anthropic Sonnet-level deep reasoning."
          icon="cpu"
          accentColor="#00A7B5"
          glowColor="rgba(0, 167, 181, 0.15)"
        />
      </div>

      {/* ── Insights Stream ── */}
      <PageSection
        label="Telemetry Reports"
        title="Recent Analytical Publications"
        description="Autonomous synthesis reports compiled directly from L1 and L2 transaction feeds."
      >
        <div className="space-y-8">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="group p-8 border border-dashed border-border/50 bg-surface/10 rounded-none hover:-translate-y-1 hover:border-solid hover:bg-surface/25 transition-all duration-300 relative overflow-hidden"
            >
              {/* Top neon glow bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary group-hover:h-[3px] transition-all duration-300" style={{ boxShadow: "0 0 8px var(--primary)" }} />
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-block rounded-none border border-dashed border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                      {insight.insight_type.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-text-secondary opacity-50 font-mono uppercase tracking-wider font-bold">
                      <Calendar className="h-3.5 w-3.5 opacity-70" />
                      {new Date(insight.generated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors tracking-wide">
                    {insight.title}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface/40 border border-dashed border-border/30 rounded-none shrink-0 font-mono">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Confidence: <span className="text-text-primary">{( (insight.confidence_score || 0) * 100 ).toFixed(0)}%</span>
                  </span>
                </div>
              </div>
              
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-text-secondary leading-relaxed whitespace-pre-wrap font-mono text-xs bg-surface/20 p-5 border border-dashed border-border/20">
                  {insight.body}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-dashed border-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-status-healthy opacity-75"></span>
                    <span className="relative inline-flex rounded-none h-2 w-2 bg-status-healthy"></span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-50 font-mono">
                    Verified by BlobLens Engine
                  </span>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary-hover hover:gap-3 transition-all font-mono">
                  [ Read Full Methodology ] <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Corner tech ticks */}
              <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-primary/20 group-hover:border-solid transition-all" />
            </div>
          ))}

          {insights.length === 0 && (
            <div className="py-20 text-center border border-dashed border-border/50 rounded-none bg-surface/10">
              <Brain className="h-10 w-10 text-text-secondary opacity-30 mx-auto mb-4" />
              <p className="text-xs text-text-secondary opacity-50 italic font-mono uppercase tracking-wider">
                No AI insights generated yet. The first weekly report will appear shortly.
              </p>
            </div>
          )}
        </div>
      </PageSection>

      {/* ── Subscription Console ── */}
      <div className="p-8 border border-dashed border-primary/30 bg-primary/5 rounded-none relative overflow-hidden group hover:bg-primary/10 transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-primary">
              <Rss className="h-4 w-4" />
              <h4 className="text-xs font-bold uppercase tracking-widest font-mono">Subscribe to Protocol Alpha</h4>
            </div>
            <p className="text-xs text-text-secondary font-mono">
              Get real-time anomaly alerts and weekly market synthesis reports directly in your inbox.
            </p>
          </div>
          <div className="flex w-full lg:w-auto gap-3 flex-col sm:flex-row">
            <input
              type="email"
              placeholder="researcher@protocol.com"
              className="flex-1 lg:w-64 bg-background/60 border border-dashed border-border/60 rounded-none px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-solid focus:border-primary transition-all text-text-primary"
            />
            <button className="px-6 py-2.5 bg-primary text-white rounded-none text-xs font-bold uppercase tracking-widest hover:bg-primary-hover hover:shadow-[0_0_10px_rgba(139,92,246,0.4)] transition-all font-mono">
              [ Join Console ]
            </button>
          </div>
        </div>
        {/* Corner tech ticks */}
        <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-primary/40" />
      </div>
    </div>
  );
}
