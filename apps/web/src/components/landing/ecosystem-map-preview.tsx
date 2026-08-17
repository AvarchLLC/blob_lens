"use client";

import React from "react";
import { motion } from "motion/react";

const ROLLUPS = [
  { name: "Base", x: 120, y: 80, r: 18, color: "#0052FF" },
  { name: "Arbitrum", x: 380, y: 70, r: 16, color: "#28A0F0" },
  { name: "Optimism", x: 80, y: 220, r: 15, color: "#FF0420" },
  { name: "zkSync", x: 420, y: 200, r: 13, color: "#8C8DFC" },
  { name: "Linea", x: 200, y: 320, r: 14, color: "#61DFFF" },
  { name: "Starknet", x: 350, y: 310, r: 12, color: "#EC796B" },
  { name: "Mantle", x: 460, y: 310, r: 11, color: "#65B391" },
  { name: "Scroll", x: 60, y: 140, r: 10, color: "#EDCF72" },
  { name: "Taiko", x: 440, y: 130, r: 10, color: "#E81899" },
  { name: "Blast", x: 160, y: 160, r: 9, color: "#FCFF52" },
  { name: "Mode", x: 340, y: 160, r: 8, color: "#DFFE00" },
  { name: "Zora", x: 300, y: 330, r: 8, color: "#5B5BD6" },
];

const CENTER = { x: 250, y: 200 };

export function EcosystemMapPreview() {
  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[5/3] rounded-xl overflow-hidden border border-[var(--border)] bg-gradient-to-br from-[var(--surface-1)] via-[var(--surface-0)] to-[var(--surface-1)] shadow-inner">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, var(--text-secondary) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Center glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[var(--primary)]/10 blur-[80px] pointer-events-none" />

      <svg viewBox="0 0 500 400" className="w-full h-full relative z-10">
        {/* Connections */}
        {ROLLUPS.map((r, i) => (
          <motion.line
            key={`e-${i}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={r.x}
            y2={r.y}
            stroke="var(--primary)"
            strokeWidth="1"
            strokeDasharray="4 2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.25 }}
            transition={{ duration: 1.2, delay: 0.2 + i * 0.05 }}
          />
        ))}

        {/* Central Ethereum node */}
        <motion.circle
          cx={CENTER.x}
          cy={CENTER.y}
          r="22"
          fill="var(--primary)"
          fillOpacity="0.15"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.circle
          cx={CENTER.x}
          cy={CENTER.y}
          r="10"
          fill="var(--primary)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
        <text
          x={CENTER.x}
          y={CENTER.y + 34}
          textAnchor="middle"
          className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] fill-[var(--primary-text)] select-none"
        >
          ETH L1
        </text>

        {/* Rollup nodes */}
        {ROLLUPS.map((r, i) => (
          <motion.g
            key={r.name}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring" as const, stiffness: 90, damping: 14, delay: 0.4 + i * 0.05 }}
          >
            <circle cx={r.x} cy={r.y} r={r.r + 5} fill={r.color} fillOpacity="0.1" />
            <motion.circle
              cx={r.x}
              cy={r.y}
              r={r.r}
              fill={r.color}
              fillOpacity="0.8"
              animate={{ r: [r.r, r.r + 2, r.r] }}
              transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
            />
            <text
              x={r.x}
              y={r.y + r.r + 14}
              textAnchor="middle"
              className="text-[8px] font-mono font-semibold uppercase tracking-wider fill-[var(--text-secondary)] opacity-80 select-none"
            >
              {r.name}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
