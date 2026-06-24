"use client";

import { useEffect, useState } from "react";

export function ChartCardFooter() {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    setTimeStr(new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }));
  }, []);

  return (
    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30 w-full shrink-0">
      <span className="text-[10px] font-bold text-text-secondary/40 tracking-wider uppercase">bloblens.com</span>
      <span className="text-[10px] font-mono text-text-secondary/40">
        Updated {timeStr || "—"}
      </span>
    </div>
  );
}
