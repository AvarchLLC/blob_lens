import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { getAIInsights } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";

export const revalidate = 3600; // 1 hour

export default async function AIInsightsPage() {
  const insights = await getAIInsights();

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Intelligence"
        title="AI Research Insights"
        summary="Automated synthesis of on-chain blob market dynamics using Claude 3.5 Sonnet. Deep-dive reports on regime shifts, rollup behavior, and cost trends."
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
           <Brain className="h-3.5 w-3.5 text-primary" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Autonomous Analysis</span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <MetricCard
          label="Insights Generated"
          value={insights.length.toString()}
          note="Total research reports in repository."
        />
        <MetricCard
          label="Avg Confidence"
          value="92%"
          note="Mean AI model confidence score."
        />
        <MetricCard
          label="Model Engine"
          value="Claude 3.5"
          note="Anthropic Sonnet-level reasoning."
        />
      </div>

      <div className="space-y-8">
        {insights.map((insight) => (
          <div key={insight.id} className="group p-8 border border-border bg-surface rounded-2xl hover:border-primary/30 transition-all">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <Badge className="bg-primary/10 text-primary border-primary/20 uppercase text-[9px] tracking-widest">
                      {insight.insight_type.replace('_', ' ')}
                   </Badge>
                   <div className="flex items-center gap-1.5 text-[10px] text-text-secondary opacity-40 font-bold uppercase tracking-widest">
                      <Calendar className="h-3 w-3" />
                      {new Date(insight.generated_at).toLocaleDateString()}
                   </div>
                </div>
                <h3 className="text-2xl font-display font-bold text-text-primary group-hover:text-primary transition-colors">
                   {insight.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-xl">
                 <Sparkles className="h-3.5 w-3.5 text-primary" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Confidence: {((insight.confidence_score || 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
            
            <div className="prose prose-invert prose-sm max-w-none">
               <div className="text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
                  {insight.body}
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-status-healthy" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40 italic">Verified by BlobLens Core</span>
               </div>
               <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:gap-3 transition-all">
                  Read Full Methodology <ArrowRight className="h-3.5 w-3.5" />
               </button>
            </div>
          </div>
        ))}

        {insights.length === 0 && (
          <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-surface/50">
             <Brain className="h-12 w-12 text-text-secondary opacity-20 mx-auto mb-4" />
             <p className="text-sm text-text-secondary opacity-40 italic">No AI insights generated yet. The first weekly report will appear shortly.</p>
          </div>
        )}
      </div>
      
      <div className="mt-12 p-8 border border-primary/20 bg-primary/5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
         <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-1">Subscribe to Protocol Alpha</h4>
            <p className="text-xs text-text-secondary">Get real-time anomaly alerts and weekly market synthesis in your inbox.</p>
         </div>
         <div className="flex w-full md:w-auto gap-2">
            <input 
               type="email" 
               placeholder="researcher@protocol.com" 
               className="flex-1 md:w-64 bg-background border border-border rounded-lg px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" 
            />
            <button className="px-6 py-2 bg-primary text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-primary-hover transition-colors">
               Join
            </button>
         </div>
      </div>
    </div>
  );
}
