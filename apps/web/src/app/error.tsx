"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertOctagon, RefreshCw, Home, ChevronRight, ChevronDown } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    // Log the error to an analytics or error tracking service
    console.error("Telemetry Error Boundary caught exception:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#07090E] text-text-secondary relative overflow-hidden px-4">
      {/* Red ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[140px] pointer-events-none" />
      
      {/* Tech grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.2; }
          50% { transform: scale(1.05); opacity: 0.5; }
          100% { transform: scale(0.95); opacity: 0.2; }
        }
      `}} />

      <div className="flex flex-col items-center gap-8 max-w-lg text-center relative z-10 w-full">
        
        {/* Warning Icon Container */}
        <div className="relative h-32 w-32 flex items-center justify-center">
          {/* Pulsing red glow */}
          <div className="absolute inset-0 bg-red-500/10 rounded-full blur-2xl animate-[pulse-ring_3s_infinite_ease-in-out]" />
          
          <div className="relative z-10 h-14 w-14 text-red-500 flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-full p-3.5">
            <AlertOctagon className="h-full w-full animate-pulse" />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-none">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400">System Fault · Code 500</span>
          </div>
          
          <h2 className="text-2xl font-mono font-bold text-text-primary tracking-tight">
            Telemetry Stream Disrupted
          </h2>
          
          <p className="text-xs text-text-secondary/70 max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred while parsing the blockchain data stream. The telemetry engine is attempting recovery.
          </p>
        </div>

        {/* Diagnostic Logs Toggle */}
        <div className="w-full bg-[#0C0E14] border border-white/5 rounded-sm overflow-hidden text-left">
          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full px-4 py-3 flex items-center justify-between font-mono text-[10px] text-text-secondary hover:bg-white/2 transition-colors border-b border-white/5"
          >
            <span className="flex items-center gap-1">
              {showDiagnostics ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-primary" />}
              FAULT DIAGNOSTIC LOG
            </span>
            <span className="text-text-tertiary">
              {error.digest ? `ID: ${error.digest}` : "LOCAL_FAULT"}
            </span>
          </button>
          
          {showDiagnostics && (
            <div className="p-4 font-mono text-[10px] text-text-tertiary space-y-2 overflow-x-auto max-h-40 bg-black/20">
              <p className="text-red-400">Exception Caught: {error.message || "Unknown rendering exception"}</p>
              {error.stack && (
                <pre className="text-[9px] text-text-tertiary/60 leading-normal">
                  {error.stack.split("\n").slice(0, 4).join("\n")}
                </pre>
              )}
              <p className="text-text-tertiary/40">Timestamp: {new Date().toISOString()}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button 
            onClick={() => reset()}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-primary/95 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Re-initialize Stream
          </button>
          <Link 
            href="/" 
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-text-primary font-mono text-xs uppercase tracking-wider hover:bg-white/10 transition-colors"
          >
            <Home className="h-4 w-4" />
            Return Home
          </Link>
        </div>

      </div>
    </div>
  );
}
