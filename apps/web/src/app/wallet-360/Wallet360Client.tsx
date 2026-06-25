"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Search, Copy, Check, Key, Zap, ArrowRight, ChevronDown, ChevronUp,
  ExternalLink, ShieldAlert, Loader2, RefreshCw, Wallet, Image as ImageIcon,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(a: string) { return `${a.slice(0, 8)}…${a.slice(-6)}`; }

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="p-1 rounded-none hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors" title="Copy">
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// Custom StatBox with glowing top border and sharp corners
function StatBox({ label, value, accentColor = "var(--primary)" }: { label: string; value: string | number; accentColor?: string }) {
  return (
    <div className="relative overflow-hidden border border-dashed border-border/50 bg-surface/20 rounded-none p-5 group hover:-translate-y-0.5 hover:border-solid hover:bg-surface/30 transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-300" style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-50 mb-2 font-mono group-hover:text-text-primary transition-colors">{label}</p>
      <p className="text-sm font-bold text-text-primary font-mono tabular-nums truncate">{value ?? "—"}</p>
      <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-border/20 group-hover:border-solid transition-all" style={{ borderColor: accentColor }} />
    </div>
  );
}

function LoadingState() {
  return <div className="flex items-center justify-center py-16 gap-3 text-text-secondary font-mono text-xs"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span>LOADING TELEMETRY…</span></div>;
}

function ErrorState({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 font-mono text-xs">
      <p className="text-destructive font-bold">{msg}</p>
      {onRetry && <button onClick={onRetry} className="flex items-center gap-2 px-3 py-1.5 rounded-none border border-border bg-surface/30 text-text-secondary hover:text-text-primary transition-colors"><RefreshCw className="h-3.5 w-3.5" />RETRY</button>}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="flex items-center justify-center py-16 text-xs font-mono text-text-secondary opacity-50 uppercase tracking-wider">{msg}</div>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  address: string; eth_balance: string; tx_total: number; tx_sent: number;
  tx_received: number; gas_spent_eth: string; erc20_tokens_interacted: number;
  blob_tx_count: number; top_rollup: string | null;
  ofac_flagged: boolean; whale_flagged: boolean;
}
interface EsTx { blockNumber: string; timeStamp: string; hash: string; from: string; to: string; value: string; gasUsed: string; gasPrice: string; isError: string; txType: string; rollup: string; }
interface EsErc20 { blockNumber: string; timeStamp: string; hash: string; from: string; to: string; contractAddress: string; value: string; tokenSymbol: string; }
interface EsNft { blockNumber: string; timeStamp: string; hash: string; from: string; to: string; contractAddress: string; tokenID: string; tokenSymbol: string; }

// ── Summary tab ───────────────────────────────────────────────────────────────

function SummaryTab({ data, balance }: { data: Summary; balance: string }) {
  const balFmt = balance ? (Number(BigInt(balance)) / 1e18).toFixed(6) : data.eth_balance;
  return (
    <div className="space-y-6">
      {(data.ofac_flagged || data.whale_flagged) && (
        <div className="flex flex-wrap gap-3 font-mono">
          {data.ofac_flagged && <div className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-status-critical/5 border border-dashed border-status-critical/40 text-status-critical text-xs font-bold"><ShieldAlert className="h-3.5 w-3.5 animate-pulse" />OFAC Sanctioned Entity</div>}
          {data.whale_flagged && <div className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-status-warning/5 border border-dashed border-status-warning/40 text-status-warning text-xs font-bold"><Zap className="h-3.5 w-3.5" />Whale Wallet Address</div>}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="ETH Balance" value={`${balFmt} ETH`} accentColor="#00df81" />
        <StatBox label="Total Txs" value={data.tx_total.toLocaleString()} accentColor="#9060FF" />
        <StatBox label="Sent / Received" value={`${data.tx_sent} / ${data.tx_received}`} accentColor="#9060FF" />
        <StatBox label="Gas Spent" value={`${data.gas_spent_eth} ETH`} accentColor="#6B7280" />
        <StatBox label="ERC-20 Tokens" value={data.erc20_tokens_interacted} accentColor="#00A7B5" />
        <StatBox label="Blob Txs" value={data.blob_tx_count} accentColor="#00df81" />
        <StatBox label="Top Rollup" value={data.top_rollup ?? "—"} accentColor="#00A7B5" />
        <StatBox label="Balance (Wei)" value={`${balance.slice(0, 15)}…`} accentColor="#6B7280" />
      </div>
    </div>
  );
}

// ── Normal Txs tab ────────────────────────────────────────────────────────────

function NormalTxsTab({ address }: { address: string }) {
  const [rows, setRows] = useState<EsTx[] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/wallet-360?address=${address}&type=normal-txs&page=${p}&offset=20&sort=desc`);
      const d = await r.json();
      if (d.status === "0") { setRows([]); setPage(p); return; }
      if (d.error) throw new Error(d.error);
      setRows(d.result ?? []); setPage(p);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [address]);

  useEffect(() => { load(1); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState msg={error} onRetry={() => load(page)} />;
  if (!rows || rows.length === 0) return <EmptyState msg="No transactions found." />;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto w-full border border-dashed border-border/40 rounded-none bg-surface/5">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-dashed border-border/30 bg-surface-elevated/40 font-mono text-[10px] uppercase tracking-widest text-text-secondary">
              {["Tx Hash", "Block", "From → To", "Value (ETH)", "Gas Used", "Status", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-bold opacity-60">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-border/20">
            {rows.map(tx => (
              <tr key={tx.hash} className="hover:bg-surface-elevated/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/tx/${tx.hash}`} className="font-mono text-primary font-bold hover:text-primary-hover">
                      {shortAddr(tx.hash)}
                    </Link>
                    <CopyButton value={tx.hash} />
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-text-secondary tabular-nums">{Number(tx.blockNumber).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono">
                  <Link href={`/address/${tx.from}`} className="text-text-secondary hover:text-primary font-semibold">
                    {shortAddr(tx.from)}
                  </Link>
                  <ArrowRight className="h-3 w-3 inline mx-1.5 text-text-secondary opacity-40" />
                  <span className="text-text-primary">
                    {tx.to ? (
                      <Link href={`/address/${tx.to}`} className="text-text-primary hover:text-primary font-semibold">
                        {shortAddr(tx.to)}
                      </Link>
                    ) : (
                      "Contract Create"
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-text-primary tabular-nums">{(Number(tx.value) / 1e18).toFixed(4)}</td>
                <td className="px-4 py-3 font-mono text-text-secondary tabular-nums">{Number(tx.gasUsed).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-none text-[10px] font-bold font-mono border border-dashed",
                    tx.isError === "0" ? "bg-primary/10 text-primary border-primary/20" : "bg-destructive/10 text-destructive border-destructive/20"
                  )}>
                    {tx.isError === "0" ? "OK" : "FAIL"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/tx/${tx.hash}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover font-mono">
                    [ INSPECT ]
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-border/20 font-mono">
        <button disabled={page === 1} onClick={() => load(page - 1)} className="px-3 py-1.5 text-xs rounded-none border border-dashed border-border bg-surface/30 disabled:opacity-30 hover:text-primary hover:border-primary/40 transition-colors font-bold">[ PREVIOUS ]</button>
        <span className="text-xs text-text-secondary">PAGE {page}</span>
        <button disabled={rows.length < 20} onClick={() => load(page + 1)} className="px-3 py-1.5 text-xs rounded-none border border-dashed border-border bg-surface/30 disabled:opacity-30 hover:text-primary hover:border-primary/40 transition-colors font-bold">[ NEXT ]</button>
      </div>
    </div>
  );
}

// ── ERC-20 tab ────────────────────────────────────────────────────────────────

function Erc20Tab({ address }: { address: string }) {
  const [rows, setRows] = useState<EsErc20[] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/wallet-360?address=${address}&type=erc20-txs&page=${p}&offset=20&sort=desc`);
      const d = await r.json();
      if (d.status === "0") { setRows([]); setPage(p); return; }
      if (d.error) throw new Error(d.error);
      setRows(d.result ?? []); setPage(p);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [address]);

  useEffect(() => { load(1); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState msg={error} onRetry={() => load(page)} />;
  if (!rows || rows.length === 0) return <EmptyState msg="No ERC-20 transfers found." />;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto w-full border border-dashed border-border/40 rounded-none bg-surface/5">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-dashed border-border/30 bg-surface-elevated/40 font-mono text-[10px] uppercase tracking-widest text-text-secondary">
              {["Token Contract", "Block", "From → To", "Amount", "Tx Hash", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-bold opacity-60">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-border/20">
            {rows.map((t, i) => (
              <tr key={`${t.hash}-${i}`} className="hover:bg-surface-elevated/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/address/${t.contractAddress}`} className="font-mono text-text-secondary text-[11px] font-semibold hover:text-primary">
                      {shortAddr(t.contractAddress)}
                    </Link>
                    <span className="px-1.5 py-0.5 border border-dashed border-border bg-surface font-mono text-[9px] font-bold text-text-primary">
                      {t.tokenSymbol}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-text-secondary tabular-nums">{Number(t.blockNumber).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono">
                  <Link href={`/address/${t.from}`} className={cn("font-semibold hover:text-primary transition-colors", t.from.toLowerCase() === address ? "text-red-400" : "text-text-secondary")}>
                    {shortAddr(t.from)}
                  </Link>
                  <ArrowRight className="h-3 w-3 inline mx-1.5 opacity-40" />
                  <Link href={`/address/${t.to}`} className={cn("font-semibold hover:text-primary transition-colors", t.to.toLowerCase() === address ? "text-green-400" : "text-text-primary")}>
                    {shortAddr(t.to)}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-text-primary font-bold tabular-nums">{t.value.length > 15 ? `${t.value.slice(0, 12)}…` : t.value}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/tx/${t.hash}`} className="font-mono text-primary text-[11px] font-bold hover:text-primary-hover">
                      {shortAddr(t.hash)}
                    </Link>
                    <CopyButton value={t.hash} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/tx/${t.hash}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover font-mono">
                    [ INSPECT ]
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-border/20 font-mono">
        <button disabled={page === 1} onClick={() => load(page - 1)} className="px-3 py-1.5 text-xs rounded-none border border-dashed border-border bg-surface/30 disabled:opacity-30 hover:text-primary hover:border-primary/40 transition-colors font-bold">[ PREVIOUS ]</button>
        <span className="text-xs text-text-secondary">PAGE {page}</span>
        <button disabled={rows.length < 20} onClick={() => load(page + 1)} className="px-3 py-1.5 text-xs rounded-none border border-dashed border-border bg-surface/30 disabled:opacity-30 hover:text-primary hover:border-primary/40 transition-colors font-bold">[ NEXT ]</button>
      </div>
    </div>
  );
}

// ── NFT tab ───────────────────────────────────────────────────────────────────

function NftTab({ address }: { address: string }) {
  const [rows, setRows] = useState<EsNft[] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/wallet-360?address=${address}&type=nft-txs&page=${p}&offset=20&sort=desc`);
      const d = await r.json();
      if (d.status === "0") { setRows([]); setPage(p); return; }
      if (d.error) throw new Error(d.error);
      setRows(d.result ?? []); setPage(p);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [address]);

  useEffect(() => { load(1); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState msg={error} onRetry={() => load(page)} />;
  if (!rows || rows.length === 0) return <EmptyState msg="No NFT transfers found." />;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto w-full border border-dashed border-border/40 rounded-none bg-surface/5">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-dashed border-border/30 bg-surface-elevated/40 font-mono text-[10px] uppercase tracking-widest text-text-secondary">
              {["Contract", "Token ID", "Block", "From → To", "Tx Hash", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-bold opacity-60">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-border/20">
            {rows.map((n, i) => (
              <tr key={`${n.hash}-${i}`} className="hover:bg-surface-elevated/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/address/${n.contractAddress}`} className="font-mono text-text-secondary text-[11px] font-semibold hover:text-primary">
                      {shortAddr(n.contractAddress)}
                    </Link>
                    <span className="px-1.5 py-0.5 border border-dashed border-border bg-surface font-mono text-[9px] font-bold text-text-primary">
                      {n.tokenSymbol}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-primary font-bold">#{n.tokenID}</td>
                <td className="px-4 py-3 font-mono text-text-secondary tabular-nums">{Number(n.blockNumber).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono">
                  <Link href={`/address/${n.from}`} className={cn("font-semibold hover:text-primary transition-colors", n.from.toLowerCase() === address ? "text-red-400" : "text-text-secondary")}>
                    {shortAddr(n.from)}
                  </Link>
                  <ArrowRight className="h-3 w-3 inline mx-1.5 opacity-40" />
                  <Link href={`/address/${n.to}`} className={cn("font-semibold hover:text-primary transition-colors", n.to.toLowerCase() === address ? "text-green-400" : "text-text-primary")}>
                    {shortAddr(n.to)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/tx/${n.hash}`} className="font-mono text-primary text-[11px] font-bold hover:text-primary-hover">
                      {shortAddr(n.hash)}
                    </Link>
                    <CopyButton value={n.hash} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/tx/${n.hash}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover font-mono">
                    [ INSPECT ]
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-border/20 font-mono">
        <button disabled={page === 1} onClick={() => load(page - 1)} className="px-3 py-1.5 text-xs rounded-none border border-dashed border-border bg-surface/30 disabled:opacity-30 hover:text-primary hover:border-primary/40 transition-colors font-bold">[ PREVIOUS ]</button>
        <span className="text-xs text-text-secondary">PAGE {page}</span>
        <button disabled={rows.length < 20} onClick={() => load(page + 1)} className="px-3 py-1.5 text-xs rounded-none border border-dashed border-border bg-surface/30 disabled:opacity-30 hover:text-primary hover:border-primary/40 transition-colors font-bold">[ NEXT ]</button>
      </div>
    </div>
  );
}

// ── Rollups tab ───────────────────────────────────────────────────────────────

interface RollupRow { rollup: string; tx_count: number; total_blobs: number; }

function RollupsTab({ rollups }: { rollups: RollupRow[] }) {
  if (!rollups.length) return <EmptyState msg="No blob rollup activity." />;
  return (
    <div className="overflow-x-auto w-full border border-dashed border-border/40 rounded-none bg-surface/5">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-dashed border-border/30 bg-surface-elevated/40 font-mono text-[10px] uppercase tracking-widest text-text-secondary">
            {["Rollup", "Blob Txs", "Total Blobs", "Action"].map(h => (
              <th key={h} className="px-4 py-3 text-left font-bold opacity-60">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-border/20">
          {rollups.map(r => (
            <tr key={r.rollup} className="hover:bg-surface-elevated/30 transition-colors">
              <td className="px-4 py-3 font-bold capitalize text-text-primary font-mono">
                <Link href={`/rollup/${r.rollup.toLowerCase()}`} className="text-text-primary hover:text-primary">
                  {r.rollup}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono tabular-nums">{r.tx_count.toLocaleString()}</td>
              <td className="px-4 py-3 font-mono text-primary font-bold tabular-nums">{r.total_blobs.toLocaleString()}</td>
              <td className="px-4 py-3">
                <Link href={`/rollup/${r.rollup.toLowerCase()}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover font-mono">
                  [ CONSOLE ]
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Admin panel ───────────────────────────────────────────────────────────────

function AdminPanel() {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState(""); const [email, setEmail] = useState("");
  const [tier, setTier] = useState("free"); const [limit, setLimit] = useState("1000");
  const [result, setResult] = useState<{ raw_key?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const issue = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/wallet-360/admin", { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Secret": secret }, body: JSON.stringify({ tier, daily_limit: parseInt(limit, 10), owner_email: email || undefined }) });
      setResult(await res.json());
    } catch { setResult({ error: "Request failed" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="mt-8 border border-dashed border-border/55 rounded-none overflow-hidden bg-surface/5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 bg-surface/20 hover:bg-surface-elevated/40 transition-colors">
        <div className="flex items-center gap-3"><Key className="h-4 w-4 text-text-secondary" /><span className="text-sm font-bold text-text-primary font-mono uppercase tracking-wider">Admin — Issue API Key</span></div>
        {open ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
      </button>
      {open && (
        <div className="px-6 py-5 bg-background/40 border-t border-dashed border-border/40">
          <form onSubmit={issue} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Admin Secret *</label><input type="password" value={secret} onChange={e => setSecret(e.target.value)} required className="w-full px-3 py-2 rounded-none bg-surface border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Owner Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-none bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Tier</label><select value={tier} onChange={e => setTier(e.target.value)} className="w-full px-3 py-2 rounded-none bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-primary"><option value="free">Free (1k/day)</option><option value="pro">Pro (10k/day)</option><option value="unlimited">Unlimited</option></select></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Daily Limit</label><input type="number" value={limit} onChange={e => setLimit(e.target.value)} min="1" className="w-full px-3 py-2 rounded-none bg-surface border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-primary" /></div>
            </div>
            <button type="submit" disabled={loading || !secret} className="flex items-center gap-2 px-4 py-2 rounded-none bg-primary text-white text-xs font-bold disabled:opacity-50 hover:bg-primary-hover hover:shadow-[0_0_8px_rgba(139,92,246,0.4)] transition-all font-mono uppercase tracking-wider">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />} [ Issue Key ]
            </button>
          </form>
          {result && (
            <div className={cn("mt-4 p-4 rounded-none border border-dashed text-sm font-mono", result.error ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-primary/5 border-primary/20")}>
              {result.error ? <p>{result.error}</p> : (
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Key issued — save now, not shown again</p>
                  <div className="flex items-center gap-2 bg-background rounded-none px-3 py-2 border border-border"><code className="font-mono text-xs flex-1 break-all">{result.raw_key}</code>{result.raw_key && <CopyButton value={result.raw_key} />}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Portal Action Center (Discord Webhook Integration) ────────────────────────

function PortalActionCenter() {
  const [open, setOpen] = useState(false);
  const [formType, setFormType] = useState<"key" | "report">("key");

  // Key form state
  const [projectName, setProjectName] = useState("");
  const [devEmail, setDevEmail] = useState("");
  const [requestedTier, setRequestedTier] = useState("free");
  const [useCase, setUseCase] = useState("");

  // Report form state
  const [targetAddress, setTargetAddress] = useState("");
  const [entityName, setEntityName] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const webhookUrl = "https://discord.com/api/webhooks/1519717974498480169/u_g58mM9zRR_aQDV1G6I54AqTjylHSdPAyBADQGneod_x1eaDplXrppCjLTtTutCBRc0";

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    setErrorMsg("");

    let payload = {};

    if (formType === "key") {
      payload = {
        username: "BlobLens Portal Bot",
        embeds: [
          {
            title: "🔑 NEW API KEY REQUEST",
            color: 0x9060FF, // Purple
            fields: [
              { name: "Project / Developer", value: projectName || "N/A", inline: true },
              { name: "Contact Email", value: devEmail || "N/A", inline: true },
              { name: "Requested Tier", value: requestedTier.toUpperCase(), inline: true },
              { name: "Intended Use Case", value: useCase || "Not provided", inline: false }
            ],
            timestamp: new Date().toISOString()
          }
        ]
      };
    } else {
      payload = {
        username: "BlobLens Portal Bot",
        embeds: [
          {
            title: "🏷️ NEW WALLET ATTRIBUTION REPORT",
            color: 0x00DF81, // Green
            fields: [
              { name: "Target Wallet Address", value: targetAddress || "N/A", inline: false },
              { name: "Suggested Rollup / Entity", value: entityName || "N/A", inline: true },
              { name: "Submitter Email", value: submitterEmail || "Anonymous", inline: true },
              { name: "Proof / Reference Link", value: proofLink || "Not provided", inline: false }
            ],
            timestamp: new Date().toISOString()
          }
        ]
      };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus("success");
        // Reset form fields
        if (formType === "key") {
          setProjectName("");
          setDevEmail("");
          setUseCase("");
        } else {
          setTargetAddress("");
          setEntityName("");
          setProofLink("");
          setSubmitterEmail("");
        }
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border border-dashed border-primary/35 rounded-none overflow-hidden bg-primary/5 relative group transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
      
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-primary/10 transition-colors">
        <div className="flex items-center gap-3">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-text-primary font-mono uppercase tracking-wider">Portal Action Center — Requests & Reports</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
      </button>

      {open && (
        <div className="px-6 py-5 border-t border-dashed border-primary/20 bg-background/30 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface border border-dashed border-border/50 rounded-none w-fit">
            <button
              type="button"
              onClick={() => { setFormType("key"); setStatus("idle"); }}
              className={cn(
                "px-3 py-1.5 rounded-none text-[11px] font-bold transition-all font-mono uppercase tracking-wider",
                formType === "key" ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"
              )}
            >
              Request API Key
            </button>
            <button
              type="button"
              onClick={() => { setFormType("report"); setStatus("idle"); }}
              className={cn(
                "px-3 py-1.5 rounded-none text-[11px] font-bold transition-all font-mono uppercase tracking-wider",
                formType === "report" ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"
              )}
            >
              Attribute Wallet
            </button>
          </div>

          {/* Forms */}
          <form onSubmit={handleSend} className="space-y-4">
            {formType === "key" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Project / Developer Name *</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      required
                      placeholder="e.g. Arbitrum Dev Team"
                      className="w-full px-3 py-2.5 rounded-none bg-surface/50 border border-dashed border-border/60 text-sm font-mono text-text-primary focus:outline-none focus:border-solid focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Contact Email *</label>
                    <input
                      type="email"
                      value={devEmail}
                      onChange={e => setDevEmail(e.target.value)}
                      required
                      placeholder="e.g. dev@project.com"
                      className="w-full px-3 py-2.5 rounded-none bg-surface/50 border border-dashed border-border/60 text-sm font-mono text-text-primary focus:outline-none focus:border-solid focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Requested Access Tier *</label>
                  <select
                    value={requestedTier}
                    onChange={e => setRequestedTier(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-none bg-surface/50 border border-dashed border-border/60 text-sm font-mono text-text-primary focus:outline-none focus:border-solid focus:border-primary"
                  >
                    <option value="free">Free Tier (1,000 requests/day)</option>
                    <option value="pro">Pro Tier (10,000 requests/day)</option>
                    <option value="enterprise">Enterprise Tier (Unlimited / Custom)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Intended Use Case *</label>
                  <textarea
                    value={useCase}
                    onChange={e => setUseCase(e.target.value)}
                    required
                    rows={3}
                    placeholder="Describe how you plan to utilize the Wallet 360 API..."
                    className="w-full px-3 py-2.5 rounded-none bg-surface/50 border border-dashed border-border/60 text-sm font-mono text-text-primary focus:outline-none focus:border-solid focus:border-primary resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Target Wallet Address *</label>
                    <input
                      type="text"
                      value={targetAddress}
                      onChange={e => setTargetAddress(e.target.value)}
                      required
                      placeholder="0x..."
                      className="w-full px-3 py-2.5 rounded-none bg-surface/50 border border-dashed border-border/60 text-sm font-mono text-text-primary focus:outline-none focus:border-solid focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Suggested Rollup / Entity Name *</label>
                    <input
                      type="text"
                      value={entityName}
                      onChange={e => setEntityName(e.target.value)}
                      required
                      placeholder="e.g. Base Sequencer 3"
                      className="w-full px-3 py-2.5 rounded-none bg-surface/50 border border-dashed border-border/60 text-sm font-mono text-text-primary focus:outline-none focus:border-solid focus:border-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Proof / Reference Link</label>
                    <input
                      type="url"
                      value={proofLink}
                      onChange={e => setProofLink(e.target.value)}
                      placeholder="e.g. https://github.com/... or transaction hash"
                      className="w-full px-3 py-2.5 rounded-none bg-surface/50 border border-dashed border-border/60 text-sm font-mono text-text-primary focus:outline-none focus:border-solid focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Submitter Email (Optional)</label>
                    <input
                      type="email"
                      value={submitterEmail}
                      onChange={e => setSubmitterEmail(e.target.value)}
                      placeholder="e.g. researcher@protocol.com"
                      className="w-full px-3 py-2.5 rounded-none bg-surface/50 border border-dashed border-border/60 text-sm font-mono text-text-primary focus:outline-none focus:border-solid focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Status Notifications */}
            {status === "success" && (
              <div className="p-4 rounded-none border border-dashed border-status-healthy/30 bg-status-healthy/5 text-status-healthy font-mono text-xs">
                Submission sent. The registry operators have been notified via the secure Discord channel.
              </div>
            )}
            {status === "error" && (
              <div className="p-4 rounded-none border border-dashed border-status-critical/30 bg-status-critical/5 text-status-critical font-mono text-xs">
                Error: {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-none bg-primary text-white text-xs font-bold disabled:opacity-50 hover:bg-primary-hover hover:shadow-[0_0_8px_rgba(139,92,246,0.4)] transition-all font-mono uppercase tracking-wider"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {formType === "key" ? "[ Submit Key Request ]" : "[ Submit Attribution ]"}
            </button>
          </form>
        </div>
      )}
      <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-primary/30" />
    </div>
  );
}

// ── API Reference ─────────────────────────────────────────────────────────────

const ENDPOINTS = [
  { method: "GET", path: "/api/wallet/:address", auth: true, desc: "Full wallet summary + flags" },
  { method: "GET", path: "/api/wallet/:address/balance", auth: true, desc: "ETH balance in Wei" },
  { method: "GET", path: "/api/wallet/:address/normal-txs", auth: true, desc: "Normal txs (Etherscan-compatible)" },
  { method: "GET", path: "/api/wallet/:address/erc20-txs", auth: true, desc: "ERC-20 transfer events" },
  { method: "GET", path: "/api/wallet/:address/nft-txs", auth: true, desc: "ERC-721 NFT transfers" },
  { method: "GET", path: "/api/wallet/:address/tokens", auth: true, desc: "ERC-20 token aggregates" },
  { method: "GET", path: "/api/wallet/:address/rollups", auth: true, desc: "Blob rollup activity" },
  { method: "GET", path: "/api/eth-price", auth: false, desc: "ETH/USD & ETH/BTC price" },
  { method: "GET", path: "/api/block-by-timestamp", auth: false, desc: "Block number from UNIX timestamp" },
  { method: "POST", path: "/api/wallet/admin/new-key", auth: false, desc: "Issue new API key (admin secret)" },
];

const PARAMS = [
  { name: "startblock", desc: "Filter txs from this block number" },
  { name: "endblock", desc: "Filter txs up to this block number" },
  { name: "page", desc: "Page number (1-indexed)" },
  { name: "offset", desc: "Rows per page (max 1000)" },
  { name: "sort", desc: "asc or desc (default: desc)" },
];

function DevReference() {
  const [open, setOpen] = useState(false);
  const base = "https://api.mywallet360.com";
  return (
    <div className="mt-6 border border-dashed border-border/55 rounded-none overflow-hidden bg-surface/5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 bg-surface/20 hover:bg-surface-elevated/40 transition-colors">
        <div className="flex items-center gap-3"><ExternalLink className="h-4 w-4 text-text-secondary" /><span className="text-sm font-bold text-text-primary font-mono uppercase tracking-wider">API Reference — Etherscan-Compatible</span></div>
        {open ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
      </button>
      {open && (
        <div className="px-6 py-5 bg-background/40 border-t border-dashed border-border/45 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Base URL</p>
            <div className="flex items-center gap-2 bg-surface border border-border rounded-none px-3 py-2"><code className="font-mono text-primary text-xs">{base}</code><CopyButton value={base} /></div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 font-mono">Auth</p>
            <p className="text-xs text-text-secondary font-mono">Protected routes require <code className="text-primary text-[11px]">X-API-Key: w360_…</code> or <code className="text-primary text-[11px]">Authorization: Bearer w360_…</code>.</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2 font-mono">Endpoints</p>
            <div className="space-y-1.5 font-mono">
              {ENDPOINTS.map(ep => (
                <div key={ep.path} className="flex items-start gap-3 bg-surface border border-border rounded-none px-3 py-2.5">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-none uppercase shrink-0 mt-0.5 border border-primary/20">{ep.method}</span>
                  <code className="font-mono text-xs text-text-primary flex-1 break-all">{ep.path}</code>
                  <span className="text-[10px] text-text-secondary shrink-0 hidden md:block">{ep.auth ? "🔑 " : ""}{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2 font-mono">Query Params (txs endpoints)</p>
            <div className="space-y-1 font-mono">
              {PARAMS.map(p => <div key={p.name} className="flex items-center gap-3 text-xs"><code className="text-primary font-mono w-28 shrink-0">{p.name}</code><span className="text-text-secondary">{p.desc}</span></div>)}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2 font-mono">Response Format</p>
            <pre className="bg-surface border border-border rounded-none p-3 text-xs font-mono text-text-secondary overflow-x-auto">{`{ "status": "1", "message": "OK", "result": [...] }`}</pre>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2 font-mono">Example</p>
            <pre className="bg-surface border border-border rounded-none p-3 text-xs font-mono text-text-secondary overflow-x-auto">{`curl -H "X-API-Key: w360_your_key" \\
  "${base}/api/wallet/0xABCD.../normal-txs?page=1&offset=50&sort=desc"`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = "summary" | "txs" | "erc20" | "nft" | "rollups";
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "summary", label: "Overview", icon: Wallet },
  { id: "txs", label: "Transactions", icon: ArrowRight },
  { id: "erc20", label: "ERC-20", icon: Coins },
  { id: "nft", label: "NFTs", icon: ImageIcon },
  { id: "rollups", label: "Rollups", icon: Zap },
];

export default function Wallet360Client() {
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [rollups, setRollups] = useState<RollupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v.trim());

  const search = useCallback(async (addr: string) => {
    const a = addr.trim().toLowerCase();
    setAddress(a); setTab("summary"); setSummary(null); setBalance("0");
    setRollups([]); setError(null); setLoading(true);

    const [sumRes, balRes, rolRes] = await Promise.allSettled([
      fetch(`/api/wallet-360?address=${a}&type=summary`).then(r => r.json()),
      fetch(`/api/wallet-360?address=${a}&type=balance`).then(r => r.json()),
      fetch(`/api/wallet-360?address=${a}&type=rollups`).then(r => r.json()),
    ]);
    setLoading(false);

    if (sumRes.status === "fulfilled") {
      if (sumRes.value.error) setError(sumRes.value.error);
      else setSummary(sumRes.value);
    } else setError("Failed to load summary");

    if (balRes.status === "fulfilled" && balRes.value.status === "1") setBalance(balRes.value.result ?? "0");
    if (rolRes.status === "fulfilled" && Array.isArray(rolRes.value)) setRollups(rolRes.value);
  }, []);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (isValid(input)) search(input); };

  return (
    <div className="animate-page-in space-y-6">
      {/* MyWallet360 Product Promotion Banner */}
      {!address && (
        <div className="p-6 border border-dashed border-primary/25 bg-primary/5 rounded-none relative overflow-hidden group hover:bg-primary/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" style={{ boxShadow: "0 0 6px var(--primary)" }} />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-xs font-bold uppercase tracking-widest font-mono text-primary flex items-center justify-center sm:justify-start gap-2">
                <Wallet className="h-4 w-4" />
                Looking for the Consumer Suite?
              </h4>
              <p className="text-xs text-text-secondary font-mono">
                Explore <strong className="text-text-primary">MyWallet360</strong> — our full-featured multi-chain portfolio manager and transaction tracking web application.
              </p>
            </div>
            <a
              href="https://www.mywallet360.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary-hover hover:shadow-[0_0_8px_rgba(139,92,246,0.4)] transition-all font-mono rounded-none shrink-0"
            >
              [ Launch MyWallet360 ]
            </a>
          </div>
          <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-primary/20" />
        </div>
      )}
      {/* Search */}
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary pointer-events-none" />
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)} spellCheck={false}
          placeholder="Enter Ethereum address (0x…)"
          className={cn("w-full pl-12 pr-32 py-4 rounded-none bg-surface/50 border border-dashed text-sm font-mono text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-solid focus:border-primary transition-all", isValid(input) ? "border-primary/60 shadow-[0_0_8px_rgba(144,96,255,0.15)]" : "border-border/60")}
        />
        <button type="submit" disabled={!isValid(input)} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-none bg-primary text-white text-sm font-bold disabled:opacity-30 hover:bg-primary-hover hover:shadow-[0_0_8px_rgba(139,92,246,0.4)] transition-all font-mono uppercase tracking-wider">
          [ Lookup ]
        </button>
      </form>

      {/* Results */}
      {address && (
        <div className="space-y-6">
          {/* Address bar */}
          <div className="flex items-center gap-3 p-3 bg-surface/25 border border-dashed border-border/50 rounded-none">
            <div className="h-8 w-8 rounded-none bg-primary/10 border border-dashed border-primary/20 flex items-center justify-center shrink-0"><span className="text-xs font-bold text-primary font-mono">0x</span></div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-50 mb-0.5 font-mono">Viewing wallet</p>
              <p className="font-mono text-sm text-text-primary truncate">{address}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <CopyButton value={address} />
              <Link href={`/address/${address}`} className="p-1 rounded-none hover:bg-surface-elevated text-text-secondary hover:text-primary transition-colors" title="View details in console">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface/20 border border-dashed border-border/50 rounded-none w-fit flex-wrap">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-none text-sm font-bold transition-all font-mono uppercase tracking-wider", tab === t.id ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary")}>
                  <Icon className="h-3.5 w-3.5" />{t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="bg-surface border border-dashed border-border/50 rounded-none p-5 bg-surface/10">
            {tab === "summary" && (loading ? <LoadingState /> : error ? <ErrorState msg={error} /> : summary ? <SummaryTab data={summary} balance={balance} /> : null)}
            {tab === "txs" && <NormalTxsTab address={address} />}
            {tab === "erc20" && <Erc20Tab address={address} />}
            {tab === "nft" && <NftTab address={address} />}
            {tab === "rollups" && (loading ? <LoadingState /> : <RollupsTab rollups={rollups} />)}
          </div>
        </div>
      )}

      <DevReference />
      <PortalActionCenter />
      <AdminPanel />
    </div>
  );
}
