"use client";

import React, { useState, useEffect } from "react";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { useEthPrice } from "@/lib/useEthPrice";
import { timeAgo } from "@/lib/utils";
import type { BlockRow } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const activeBlocks = Math.round((clamped / 100) * 5);
  const color =
    clamped >= 90 
      ? "text-status-critical bg-status-critical" 
      : clamped >= 60 
        ? "text-status-warning bg-status-warning" 
        : clamped >= 30 
          ? "text-status-healthy bg-status-healthy" 
          : "text-text-secondary bg-text-secondary";
  
  return (
    <div className="flex items-center gap-2 font-mono">
      <div className="flex gap-0.5 select-none">
        {Array.from({ length: 5 }).map((_, idx) => {
          const isActive = idx < activeBlocks;
          return (
            <div
              key={idx}
              className={`h-2 w-2.5 rounded-none border-t border-b border-black/25 transition-all duration-300 ${
                isActive ? `${color} shadow-[0_0_2px_currentColor]` : "bg-text-secondary/15"
              }`}
            />
          );
        })}
      </div>
      <span 
        className="w-8 text-right text-[10px] font-bold transition-colors duration-300" 
        style={{ 
          color: clamped >= 90 
            ? "var(--status-critical)" 
            : clamped >= 60 
              ? "var(--status-warning)" 
              : clamped >= 30 
                ? "var(--status-healthy)" 
                : "var(--text-secondary)" 
        }}
      >
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}

export function BlockFeed() {
  const ethUsd = useEthPrice();
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const startStreaming = () => {
      eventSource = new EventSource("/api/blocks/stream");

      eventSource.onopen = () => {
        setIsStreaming(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.data) {
            setBlocks(parsed.data);
          }
          setIsLoading(false);
        } catch (err) {
          console.error("Failed to parse SSE blocks data:", err);
        }
      };

      eventSource.onerror = () => {
        console.warn("SSE blocks stream disconnected. Falling back to HTTP polling...");
        setIsStreaming(false);
        if (eventSource) {
          eventSource.close();
        }
        startPolling();
      };
    };

    const startPolling = () => {
      const fetchBlocks = async () => {
        try {
          const res = await fetch("/api/blocks");
          const json = await res.json();
          if (json.data) {
            setBlocks(json.data);
          }
          setIsLoading(false);
        } catch (err) {
          console.error("Failed to fetch blocks via fallback polling:", err);
        }
      };

      // Fetch immediately, then poll every 12 seconds
      fetchBlocks();
      fallbackInterval = setInterval(fetchBlocks, 12000);
    };

    // Attempt streaming first, otherwise fall back to polling
    if (typeof window !== "undefined" && "EventSource" in window) {
      startStreaming();
    } else {
      startPolling();
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, []);

  if (isLoading && !blocks.length) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-surface-elevated" />
        ))}
      </div>
    );
  }

  if (!blocks.length) {
    return <p className="py-20 text-center text-xs text-text-secondary opacity-50 italic font-mono">No block data available.</p>;
  }

  return (
    <div className="w-full min-w-[768px] flex flex-col text-sm font-mono">
      {/* Streaming Indicator */}
      <div className="flex items-center justify-end px-6 py-1 text-[8px] text-text-secondary/40 gap-1.5 uppercase tracking-widest bg-sidebar/20 select-none">
        <span className={`h-1 w-1 rounded-full ${isStreaming ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
        {isStreaming ? "Real-time stream active" : "HTTP Polling Mode"}
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-sidebar/50 border-b border-border/40 select-none">
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Block</div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Age</div>
        <div className="col-span-1 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary text-right">Blobs</div>
        <div className="col-span-3 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary pl-2">Utilization</div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary text-right">Cost / Blob</div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary pl-4">Rollups</div>
      </div>

      {/* Table Body with Springy Entry Animations */}
      <div className="flex flex-col divide-y divide-border/30">
        <AnimatePresence initial={false} mode="popLayout">
          {blocks.map((b) => (
            <motion.div
              key={b.block_number}
              layout="position"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 450, 
                damping: 32,
                opacity: { duration: 0.2 }
              }}
              className="grid grid-cols-12 gap-4 px-6 py-4 items-center bg-background/50 hover:bg-surface-elevated/45 transition-colors duration-200 group"
            >
              {/* Block number */}
              <div className="col-span-2">
                <a
                  href={`https://etherscan.io/block/${b.block_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-text-primary hover:text-primary transition-colors underline underline-offset-4 decoration-border/40"
                >
                  #{b.block_number.toLocaleString()}
                </a>
              </div>

              {/* Age */}
              <div className="col-span-2 text-xs text-text-secondary/75">
                {timeAgo(b.created_at)}
              </div>

              {/* Blob count */}
              <div className="col-span-1 text-right font-bold text-text-primary text-xs">
                {b.blob_count}
              </div>

              {/* Utilization */}
              <div className="col-span-3 pl-2">
                <UtilizationBar pct={b.utilization} />
              </div>

              {/* Cost per blob */}
              <div className="col-span-2 text-right font-bold text-text-primary text-xs">
                {Number(b.blob_base_fee) === 0
                  ? <span className="text-text-secondary opacity-40">—</span>
                  : ethUsd != null
                    ? formatUsd(blobCostUsd(b.blob_base_fee, ethUsd))
                    : `${(Number(b.blob_base_fee) / 1e9).toFixed(4)} G`}
              </div>

              {/* Rollup Badges */}
              <div className="col-span-2 pl-4">
                <div className="flex -space-x-1.5 overflow-hidden group-hover:space-x-1 transition-all duration-300">
                  {b.rollups?.slice(0, 5).map((r, i) => (
                    <div key={i} className="transition-all duration-200 hover:scale-110 hover:z-10 shrink-0">
                      <RollupBadge rollup={r} />
                    </div>
                  ))}
                  {b.rollups?.length > 5 && (
                    <div className="flex items-center justify-center h-5 px-1.5 bg-surface-elevated border border-border/40 text-[8px] font-bold text-text-secondary rounded-sm select-none shrink-0">
                      +{b.rollups.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
