"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Database, Loader2 } from "lucide-react";

interface BlobMeta {
  index: number;
  versioned_hash: string;
  kzg_commitment: string;
  size_bytes: number;
  non_zero_bytes: number;
  density_pct: number;
  detected_encoding: string;
  hex_preview: string;
}

interface SidecarResponse {
  tx_hash: string;
  block_number: number;
  slot: number;
  blobs: BlobMeta[];
  error?: string;
}

interface Props {
  txHash: string;
  blockNumber: number;
  numBlobs: number;
}

const ENCODING_COLOR: Record<string, string> = {
  "OP-Stack (channel frames)": "#10B981",
  "Arbitrum (compressed batch)": "#3B82F6",
  "zlib compressed": "#8B5CF6",
  "zstd compressed": "#8B5CF6",
  "Sparse (mostly empty)": "#6B7280",
  "Unknown / raw": "#9CA3AF",
};

export function BlobDataViewer({ txHash, blockNumber, numBlobs }: Props) {
  const [open, setOpen]         = React.useState(false);
  const [data, setData]         = React.useState<SidecarResponse | null>(null);
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<number | null>(null);

  async function load() {
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/blob-sidecar?tx_hash=${txHash}&block_number=${blockNumber}`
      );
      const json: SidecarResponse = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? "Failed to load blob data");
      } else {
        setData(json);
      }
    } catch {
      setError("Network error fetching blob sidecars");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (!open) load();
    setOpen((o) => !o);
  }

  return (
    <div className="mt-1">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-[10px] font-medium text-[#10B981] hover:text-[#34D399] transition-colors"
      >
        <Database className="h-3 w-3" />
        {numBlobs} blob{numBlobs !== 1 ? "s" : ""}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-3 text-xs">
          {loading && (
            <div className="flex items-center gap-2 text-[#9CA3AF]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Fetching blob sidecars from Beacon API…
            </div>
          )}

          {error && (
            <p className="text-[#f97316]">{error}</p>
          )}

          {data && data.blobs.length === 0 && (
            <p className="text-[#6B7280]">No matching blob sidecars found for this tx.</p>
          )}

          {data?.blobs.map((blob) => (
            <div key={blob.index} className="rounded border border-border/60 bg-card">
              <button
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                onClick={() => setExpanded(expanded === blob.index ? null : blob.index)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[#6B7280]">blob[{blob.index}]</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                    style={{
                      color: ENCODING_COLOR[blob.detected_encoding] ?? "#9CA3AF",
                      background: (ENCODING_COLOR[blob.detected_encoding] ?? "#9CA3AF") + "18",
                    }}
                  >
                    {blob.detected_encoding}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[#9CA3AF]">
                  <span className="font-mono">{blob.density_pct.toFixed(1)}% data</span>
                  <span className="font-mono">{blob.non_zero_bytes.toLocaleString()} bytes</span>
                  {expanded === blob.index
                    ? <ChevronUp className="h-3 w-3" />
                    : <ChevronDown className="h-3 w-3" />}
                </div>
              </button>

              {expanded === blob.index && (
                <div className="border-t border-border/60 px-3 py-2 space-y-2">
                  {/* Density bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[#6B7280]">Fill ratio</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1E2D45]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${blob.density_pct}%`,
                          backgroundColor: ENCODING_COLOR[blob.detected_encoding] ?? "#9CA3AF",
                        }}
                      />
                    </div>
                    <span className="font-mono text-[#9CA3AF]">{blob.density_pct.toFixed(1)}%</span>
                  </div>

                  {/* Hash info */}
                  <div className="grid grid-cols-1 gap-1">
                    <div className="flex gap-2">
                      <span className="w-24 shrink-0 text-[#6B7280]">Versioned hash</span>
                      <span className="break-all font-mono text-[#9CA3AF]">{blob.versioned_hash}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-24 shrink-0 text-[#6B7280]">KZG commitment</span>
                      <span className="break-all font-mono text-[#4B5563]">
                        {blob.kzg_commitment.slice(0, 34)}…{blob.kzg_commitment.slice(-8)}
                      </span>
                    </div>
                  </div>

                  {/* Hex preview */}
                  <div>
                    <p className="mb-1 text-[#6B7280]">First 256 bytes (hex)</p>
                    <pre className="overflow-x-auto rounded bg-[#0A0E1A] p-2 font-mono text-[9px] leading-relaxed text-[#4B5563]">
                      {blob.hex_preview.match(/.{1,64}/g)?.join("\n")}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}

          {data && (
            <p className="text-[10px] text-[#4B5563]">
              Beacon slot {data.slot} · {data.blobs.length} sidecar{data.blobs.length !== 1 ? "s" : ""} matched
            </p>
          )}
        </div>
      )}
    </div>
  );
}
