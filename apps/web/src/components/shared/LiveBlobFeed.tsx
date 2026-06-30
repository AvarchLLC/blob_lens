"use client";

import React, { useState, useEffect } from "react";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { useEthPrice } from "@/lib/useEthPrice";
import { rollupColor, shortHash, timeAgo } from "@/lib/utils";
import type { BlobTransaction } from "@/types";
import { ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function LiveBlobFeed() {
  const ethUsd = useEthPrice();
  const [blobs, setBlobs] = useState<BlobTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const startStreaming = () => {
      eventSource = new EventSource("/api/blobs/stream");

      eventSource.onopen = () => {
        setIsStreaming(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.data) {
            setBlobs(parsed.data);
          }
          setIsLoading(false);
        } catch (err) {
          console.error("Failed to parse SSE blobs data:", err);
        }
      };

      eventSource.onerror = () => {
        console.warn("SSE blobs stream disconnected. Falling back to HTTP polling...");
        setIsStreaming(false);
        if (eventSource) {
          eventSource.close();
        }
        startPolling();
      };
    };

    const startPolling = () => {
      const fetchBlobs = async () => {
        try {
          const res = await fetch("/api/blobs");
          const json = await res.json();
          if (json.data) {
            setBlobs(json.data);
          }
          setIsLoading(false);
        } catch (err) {
          console.error("Failed to fetch blobs via fallback polling:", err);
        }
      };

      // Fetch immediately, then poll every 12 seconds
      fetchBlobs();
      fallbackInterval = setInterval(fetchBlobs, 12000);
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

  if (isLoading && !blobs.length) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-surface-elevated" />
        ))}
      </div>
    );
  }

  if (!blobs.length) {
    return <p className="py-20 text-center text-xs text-text-secondary opacity-50 italic font-mono">No blob transactions available.</p>;
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
        <div className="col-span-3 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Transaction</div>
        <div className="col-span-3 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary pl-2">Rollup</div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary text-right">Blobs</div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary text-right">Base Fee</div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary text-right">Time</div>
      </div>

      {/* Table Body with Springy Entry Animations */}
      <div className="flex flex-col divide-y divide-border/30">
        <AnimatePresence initial={false} mode="popLayout">
          {blobs.map((b) => (
            <motion.div
              key={b.tx_hash}
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
              {/* Transaction Hash */}
              <div className="col-span-3">
                <a
                  href={`https://etherscan.io/tx/${b.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-text-primary hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  {shortHash(b.tx_hash)}
                  <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                </a>
              </div>

              {/* Rollup Badge */}
              <div className="col-span-3 pl-2">
                <RollupBadge rollup={b.rollup ?? 'UNKNOWN'} />
              </div>

              {/* Number of Blobs */}
              <div className="col-span-2 text-right">
                <span className="inline-flex items-center justify-center font-bold text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 text-[10px] rounded-sm">
                  {b.num_blobs}
                </span>
              </div>

              {/* Base Fee */}
              <div className="col-span-2 text-right font-bold text-text-primary text-xs">
                {ethUsd 
                  ? formatUsd(blobCostUsd(b.blob_base_fee, ethUsd)) 
                  : `${(Number(b.blob_base_fee) / 1e9).toFixed(4)} G`}
              </div>

              {/* Time */}
              <div className="col-span-2 text-right text-xs text-text-secondary/75">
                {timeAgo(b.created_at)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
