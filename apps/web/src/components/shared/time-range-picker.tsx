"use client";

import React, { useState } from "react";
import { Calendar, Clock, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PresetRange = "24h" | "7d" | "30d" | "90d" | "custom";

export interface DateRangeState {
  preset: PresetRange;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

interface TimeRangePickerProps {
  value: DateRangeState;
  onChange: (value: DateRangeState) => void;
  className?: string;
  presets?: PresetRange[]; // optional filter — defaults to showing all
}

const PRESETS: { id: PresetRange; label: string; hours: number }[] = [
  { id: "24h", label: "24H", hours: 24 },
  { id: "7d", label: "7D", hours: 168 },
  { id: "30d", label: "30D", hours: 720 },
  { id: "90d", label: "90D", hours: 2160 },
  { id: "custom", label: "Custom Date", hours: 0 },
];

export function TimeRangePicker({ value, onChange, className, presets: allowedPresets }: TimeRangePickerProps) {
  const visiblePresets = allowedPresets ? PRESETS.filter(p => allowedPresets.includes(p.id)) : PRESETS;
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [tempStart, setTempStart] = useState(
    value.startDate || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  );
  const [tempEnd, setTempEnd] = useState(
    value.endDate || new Date().toISOString().split("T")[0]
  );

  function handleSelectPreset(preset: PresetRange) {
    if (preset === "custom") {
      setShowCustomModal(!showCustomModal);
      return;
    }

    setShowCustomModal(false);
    onChange({
      preset,
    });
  }

  function handleApplyCustom() {
    if (!tempStart || !tempEnd) return;
    setShowCustomModal(false);
    onChange({
      preset: "custom",
      startDate: tempStart,
      endDate: tempEnd,
    });
  }

  return (
    <div className={cn("relative flex items-center gap-1.5", className)}>
      {/* Preset Pill Bar */}
      <div className="flex items-center gap-1 p-1 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[8px] shadow-xs">
        <Clock className="w-3.5 h-3.5 ml-1.5 text-[var(--text-muted)] shrink-0" />
        {visiblePresets.map((p) => {
          const isActive = value.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className={cn(
                "px-2.5 py-1 rounded-[6px] text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1",
                isActive
                  ? "bg-[var(--primary)] text-[var(--primary-fg)] font-semibold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              )}
            >
              <span>{p.label}</span>
              {p.id === "custom" && <ChevronDown className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Selected Custom Range Badge (if custom active) */}
      {value.preset === "custom" && value.startDate && value.endDate && (
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] rounded-[6px]">
          <Calendar className="w-3 h-3 text-[var(--primary-text)]" />
          {value.startDate} to {value.endDate}
        </span>
      )}

      {/* Custom Date Range Popover */}
      {showCustomModal && (
        <div className="absolute top-12 right-0 z-50 w-72 p-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-[8px] shadow-xl animate-in fade-in-50 zoom-in-95">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border)]">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Historical Date Range
            </span>
            <Calendar className="w-4 h-4 text-[var(--primary)]" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono text-[var(--text-secondary)]">Start Date</label>
              <input
                type="date"
                value={tempStart}
                onChange={(e) => setTempStart(e.target.value)}
                className="w-full h-8 px-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono text-[var(--text-secondary)]">End Date</label>
              <input
                type="date"
                value={tempEnd}
                onChange={(e) => setTempEnd(e.target.value)}
                className="w-full h-8 px-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[6px]"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustom}
                className="btn-primary text-xs flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
