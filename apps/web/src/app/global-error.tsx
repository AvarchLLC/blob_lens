"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Global error: replaces root layout — must include <html> and <body>.
// No access to CSS variables or ThemeProvider, so we use hardcoded dark tokens.
const D = {
  bg:        "#0B0B0E",
  surface:   "#121217",
  sunken:    "#0E0E13",
  border:    "#22222E",
  text:      "#F4F4F8",
  muted:     "#68687D",
  secondary: "#A0A0B2",
  primary:   "#8B7BFF",
  primaryFg: "#0B0B0E",
  danger:    "#EF4444",
  dangerBg:  "#3A1414",
  warning:   "#F59E0B",
  warningBg: "#33230A",
} as const;

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[BlobLens] Global error:", error);
  }, [error]);

  const digest  = error.digest ?? "ERR_CRITICAL";
  const message = error.message?.slice(0, 100) || "Critical failure in root layout.";

  return (
    <html lang="en">
      <body style={{ margin: 0, background: D.bg, color: D.text, fontFamily: "ui-monospace, 'Geist Mono', 'Cascadia Code', monospace", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem" }}>

        {/* Card */}
        <div style={{ width: "100%", maxWidth: 520, border: `1px solid ${D.border}`, borderRadius: 8, background: D.surface, overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.6)" }}>

          {/* Title bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${D.border}`, background: D.sunken }}>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57", display: "block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E", display: "block" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840", display: "block" }} />
            </div>
            <span style={{ fontSize: 10, color: D.muted, textTransform: "uppercase", letterSpacing: "0.15em" }}>
              bloblens — global/error
            </span>
            <span style={{ fontSize: 10, color: D.danger }}>⬛</span>
          </div>

          {/* Body */}
          <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Code */}
            <div>
              <p style={{ fontSize: 10, color: D.muted, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 4 }}>
                // ethereum.blob_node.critical_fault
              </p>
              <p style={{ fontSize: 80, fontWeight: 700, lineHeight: 1, margin: 0, color: D.text, letterSpacing: "-0.04em" }}>
                503
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", background: D.dangerBg, border: `1px solid ${D.danger}`, color: D.danger, fontSize: 10, fontWeight: 700, borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  ROOT_FAULT
                </span>
                <span style={{ fontSize: 10, color: D.muted }}>{digest}</span>
              </div>
            </div>

            {/* Diagnostics */}
            <div style={{ border: `1px solid ${D.border}`, borderRadius: 4, overflow: "hidden", fontSize: 11 }}>
              {([
                ["TYPE",    "CriticalError"],
                ["SCOPE",   "Root Layout"],
                ["CHAIN",   "Ethereum Mainnet"],
                ["STATUS",  "SERVICE_UNAVAILABLE"],
              ] as [string, string][]).map(([k, v], i) => (
                <div key={k} style={{ display: "flex", gap: 16, padding: "8px 12px", background: i % 2 === 0 ? D.sunken : D.surface }}>
                  <span style={{ width: 80, flexShrink: 0, color: D.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>{k}</span>
                  <span style={{ color: D.secondary }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 16, padding: "8px 12px", background: D.dangerBg, borderTop: `1px solid ${D.border}` }}>
                <span style={{ width: 80, flexShrink: 0, color: D.danger, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>MESSAGE</span>
                <span style={{ color: D.danger, wordBreak: "break-all" }}>{message}</span>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: 12, color: D.muted, lineHeight: 1.6, margin: 0 }}>
              A critical fault was detected in the root node. The pipeline
              has been halted to prevent data corruption. Reset to attempt
              recovery, or reload the page.
            </p>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={reset}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: D.primary, color: D.primaryFg, fontSize: 12, fontWeight: 700, borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                ↺ Reset Node
              </button>
              <button onClick={() => { window.location.href = "/"; }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: D.sunken, color: D.secondary, fontSize: 12, fontWeight: 400, borderRadius: 4, border: `1px solid ${D.border}`, cursor: "pointer", fontFamily: "inherit" }}>
                ⌂ Return to Dashboard
              </button>
            </div>
          </div>
        </div>

        <p style={{ marginTop: 24, fontSize: 10, color: D.muted, letterSpacing: "0.1em" }}>
          BlobLens · Ethereum EIP-4844 Observatory
        </p>
      </body>
    </html>
  );
}
