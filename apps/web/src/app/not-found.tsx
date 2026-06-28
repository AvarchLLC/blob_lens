import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, RefreshCw, Radio } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#07090E] text-text-secondary relative overflow-hidden px-4">
      {/* Radial ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      
      {/* Tech grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
      `}} />

      <div className="flex flex-col items-center gap-8 max-w-lg text-center relative z-10">
        
        {/* Animated Wireframe / Pruned Blob Graphic */}
        <div className="relative h-40 w-40 flex items-center justify-center">
          {/* Pulsing glow behind */}
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-[pulse-slow_4s_infinite_ease-in-out]" />
          
          {/* Orbiting ring */}
          <div 
            className="absolute inset-2 border border-dashed border-primary/30 rounded-full"
            style={{ animation: "orbit 20s infinite linear" }}
          />

          {/* Innermost rotating logo frame */}
          <div className="relative z-10 h-16 w-16 opacity-80">
            <Image
              src="/brand/bloblens-logo.svg"
              alt="BlobLens"
              width={64}
              height={64}
              priority
            />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-none">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400">Error 404 · Blob Not Found</span>
          </div>
          
          <h2 className="text-2xl font-mono font-bold text-text-primary tracking-tight">
            Lost In Data Availability Space
          </h2>
          
          <p className="text-xs text-text-secondary/70 max-w-sm mx-auto leading-relaxed">
            The block, transaction, or telemetry route you are looking for has been pruned from the active epoch or never existed.
          </p>
        </div>

        {/* Monospace Code Terminal Block */}
        <div className="w-full bg-[#0C0E14] border border-white/5 p-4 rounded-sm font-mono text-left text-[10px] text-text-tertiary space-y-1">
          <p className="text-primary">$ get-blob --hash latest</p>
          <p className="text-red-400">ERR_BLOB_PRUNED: Target hash not found in ClickHouse index.</p>
          <p>SYSTEM_STATUS: Operational. DA nodes syncing normally.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Link 
            href="/" 
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-primary/95 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Telemetry
          </Link>
          <Link 
            href="/explore" 
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-text-primary font-mono text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
          >
            <Radio className="h-4 w-4" />
            Live Explorer
          </Link>
        </div>

      </div>
    </div>
  );
}
