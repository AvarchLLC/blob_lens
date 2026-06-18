"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Search, Copy, Check, Key, Zap, ArrowRight, ChevronDown, ChevronUp,
  ExternalLink, ShieldAlert, Loader2, RefreshCw, Wallet, Image as ImageIcon,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(a: string) { return `${a.slice(0, 8)}…${a.slice(-6)}`; }

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="p-1 rounded hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors" title="Copy">
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function LoadingState() {
  return <div className="flex items-center justify-center py-16 gap-3 text-text-secondary"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading…</span></div>;
}
function ErrorState({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <p className="text-sm text-destructive">{msg}</p>
      {onRetry && <button onClick={onRetry} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-border text-text-secondary hover:text-text-primary"><RefreshCw className="h-3.5 w-3.5" />Retry</button>}
    </div>
  );
}
function EmptyState({ msg }: { msg: string }) {
  return <div className="flex items-center justify-center py-16 text-sm text-text-secondary opacity-50">{msg}</div>;
}
function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-50 mb-1">{label}</p>
      <p className="text-lg font-bold text-text-primary font-mono">{value ?? "—"}</p>
    </div>
  );
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
  const balEth = (BigInt(balance || "0") * BigInt(1e9) / BigInt(1e18)).toString();
  const balFmt = balance ? (Number(BigInt(balance)) / 1e18).toFixed(6) : data.eth_balance;
  return (
    <div className="space-y-5">
      {(data.ofac_flagged || data.whale_flagged) && (
        <div className="flex flex-wrap gap-2">
          {data.ofac_flagged && <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold"><ShieldAlert className="h-3.5 w-3.5" />OFAC Sanctioned</div>}
          {data.whale_flagged && <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold"><Zap className="h-3.5 w-3.5" />Whale Wallet</div>}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="ETH Balance" value={`${balFmt} ETH`} />
        <StatBox label="Total Txs" value={data.tx_total.toLocaleString()} />
        <StatBox label="Sent / Received" value={`${data.tx_sent} / ${data.tx_received}`} />
        <StatBox label="Gas Spent" value={`${data.gas_spent_eth} ETH`} />
        <StatBox label="ERC-20 Tokens" value={data.erc20_tokens_interacted} />
        <StatBox label="Blob Txs" value={data.blob_tx_count} />
        <StatBox label="Top Rollup" value={data.top_rollup ?? "—"} />
        <StatBox label="Balance (Wei)" value={`${balance.slice(0, 10)}…`} />
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
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="border-b border-border">{["Tx Hash","Block","From → To","Value (ETH)","Gas Used","Status"].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border/30">
            {rows.map(tx => (
              <tr key={tx.hash} className="hover:bg-surface-elevated/50">
                <td className="px-4 py-3"><div className="flex items-center gap-1"><span className="font-mono text-primary">{shortAddr(tx.hash)}</span><CopyButton value={tx.hash} /><a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-text-secondary hover:text-primary" /></a></div></td>
                <td className="px-4 py-3 font-mono text-text-secondary">{Number(tx.blockNumber).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono"><span className="text-text-secondary">{shortAddr(tx.from)}</span><ArrowRight className="h-3 w-3 inline mx-1 text-text-secondary opacity-40" /><span className="text-text-primary">{tx.to ? shortAddr(tx.to) : "Create"}</span></td>
                <td className="px-4 py-3 font-mono font-bold">{(Number(tx.value) / 1e18).toFixed(4)}</td>
                <td className="px-4 py-3 font-mono text-text-secondary">{Number(tx.gasUsed).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", tx.isError === "0" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>{tx.isError === "0" ? "OK" : "FAIL"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <button disabled={page===1} onClick={()=>load(page-1)} className="px-3 py-1.5 text-xs rounded-md border border-border disabled:opacity-30">Previous</button>
        <span className="text-xs text-text-secondary">Page {page}</span>
        <button disabled={rows.length<20} onClick={()=>load(page+1)} className="px-3 py-1.5 text-xs rounded-md border border-border disabled:opacity-30">Next</button>
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
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="border-b border-border">{["Token","Block","From → To","Amount","Tx Hash"].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border/30">
            {rows.map((t, i) => (
              <tr key={`${t.hash}-${i}`} className="hover:bg-surface-elevated/50">
                <td className="px-4 py-3"><div className="flex items-center gap-1"><span className="font-mono text-text-secondary text-[10px]">{shortAddr(t.contractAddress)}</span><a href={`https://etherscan.io/token/${t.contractAddress}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-text-secondary hover:text-primary" /></a></div></td>
                <td className="px-4 py-3 font-mono text-text-secondary">{Number(t.blockNumber).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono"><span className={cn("text-xs", t.from.toLowerCase()===address ? "text-red-400" : "text-text-secondary")}>{shortAddr(t.from)}</span><ArrowRight className="h-3 w-3 inline mx-1 opacity-40" /><span className={cn("text-xs", t.to.toLowerCase()===address ? "text-green-400" : "text-text-primary")}>{shortAddr(t.to)}</span></td>
                <td className="px-4 py-3 font-mono text-text-primary">{t.value.length > 15 ? `${t.value.slice(0,12)}…` : t.value}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1"><span className="font-mono text-primary text-[10px]">{shortAddr(t.hash)}</span><a href={`https://etherscan.io/tx/${t.hash}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-text-secondary hover:text-primary" /></a></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <button disabled={page===1} onClick={()=>load(page-1)} className="px-3 py-1.5 text-xs rounded-md border border-border disabled:opacity-30">Previous</button>
        <span className="text-xs text-text-secondary">Page {page}</span>
        <button disabled={rows.length<20} onClick={()=>load(page+1)} className="px-3 py-1.5 text-xs rounded-md border border-border disabled:opacity-30">Next</button>
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
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="border-b border-border">{["Contract","Token ID","Block","From → To","Tx Hash"].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border/30">
            {rows.map((n, i) => (
              <tr key={`${n.hash}-${i}`} className="hover:bg-surface-elevated/50">
                <td className="px-4 py-3"><div className="flex items-center gap-1"><span className="font-mono text-text-secondary text-[10px]">{shortAddr(n.contractAddress)}</span><a href={`https://etherscan.io/token/${n.contractAddress}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-text-secondary hover:text-primary" /></a></div></td>
                <td className="px-4 py-3 font-mono text-primary font-bold">#{n.tokenID}</td>
                <td className="px-4 py-3 font-mono text-text-secondary">{Number(n.blockNumber).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono"><span className={cn("text-xs", n.from.toLowerCase()===address ? "text-red-400" : "text-text-secondary")}>{shortAddr(n.from)}</span><ArrowRight className="h-3 w-3 inline mx-1 opacity-40" /><span className={cn("text-xs", n.to.toLowerCase()===address ? "text-green-400" : "text-text-primary")}>{shortAddr(n.to)}</span></td>
                <td className="px-4 py-3"><div className="flex items-center gap-1"><span className="font-mono text-primary text-[10px]">{shortAddr(n.hash)}</span><a href={`https://etherscan.io/tx/${n.hash}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 text-text-secondary hover:text-primary" /></a></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <button disabled={page===1} onClick={()=>load(page-1)} className="px-3 py-1.5 text-xs rounded-md border border-border disabled:opacity-30">Previous</button>
        <span className="text-xs text-text-secondary">Page {page}</span>
        <button disabled={rows.length<20} onClick={()=>load(page+1)} className="px-3 py-1.5 text-xs rounded-md border border-border disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}

// ── Rollups tab ───────────────────────────────────────────────────────────────

interface RollupRow { rollup: string; tx_count: number; total_blobs: number; }

function RollupsTab({ rollups }: { rollups: RollupRow[] }) {
  if (!rollups.length) return <EmptyState msg="No blob rollup activity." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead><tr className="border-b border-border">{["Rollup","Blob Txs","Total Blobs"].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border/30">
          {rollups.map(r=><tr key={r.rollup} className="hover:bg-surface-elevated/50"><td className="px-4 py-3 font-bold capitalize text-text-primary">{r.rollup}</td><td className="px-4 py-3 font-mono">{r.tx_count.toLocaleString()}</td><td className="px-4 py-3 font-mono text-primary font-bold">{r.total_blobs.toLocaleString()}</td></tr>)}
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
      const res = await fetch("/api/wallet-360/admin", { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Secret": secret }, body: JSON.stringify({ tier, daily_limit: parseInt(limit,10), owner_email: email||undefined }) });
      setResult(await res.json());
    } catch { setResult({ error: "Request failed" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="mt-8 border border-border rounded-xl overflow-hidden">
      <button onClick={()=>setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 bg-surface hover:bg-surface-elevated transition-colors">
        <div className="flex items-center gap-3"><Key className="h-4 w-4 text-text-secondary" /><span className="text-sm font-bold text-text-primary">Admin — Issue API Key</span></div>
        {open ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
      </button>
      {open && (
        <div className="px-6 py-5 bg-background border-t border-border">
          <form onSubmit={issue} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Admin Secret *</label><input type="password" value={secret} onChange={e=>setSecret(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Owner Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-primary" /></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Tier</label><select value={tier} onChange={e=>setTier(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-primary"><option value="free">Free (1k/day)</option><option value="pro">Pro (10k/day)</option><option value="unlimited">Unlimited</option></select></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Daily Limit</label><input type="number" value={limit} onChange={e=>setLimit(e.target.value)} min="1" className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono text-text-primary focus:outline-none focus:border-primary" /></div>
            </div>
            <button type="submit" disabled={loading||!secret} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50 hover:bg-primary/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />} Issue Key
            </button>
          </form>
          {result && (
            <div className={cn("mt-4 p-4 rounded-lg border text-sm", result.error ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-primary/5 border-primary/20")}>
              {result.error ? <p>{result.error}</p> : (
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Key issued — save now, not shown again</p>
                  <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border"><code className="font-mono text-xs flex-1 break-all">{result.raw_key}</code>{result.raw_key && <CopyButton value={result.raw_key} />}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── API Reference ─────────────────────────────────────────────────────────────

const ENDPOINTS = [
  { method:"GET", path:"/api/wallet/:address",             auth:true,  desc:"Full wallet summary + flags" },
  { method:"GET", path:"/api/wallet/:address/balance",     auth:true,  desc:"ETH balance in Wei" },
  { method:"GET", path:"/api/wallet/:address/normal-txs",  auth:true,  desc:"Normal txs (Etherscan-compatible)" },
  { method:"GET", path:"/api/wallet/:address/erc20-txs",   auth:true,  desc:"ERC-20 transfer events" },
  { method:"GET", path:"/api/wallet/:address/nft-txs",     auth:true,  desc:"ERC-721 NFT transfers" },
  { method:"GET", path:"/api/wallet/:address/tokens",      auth:true,  desc:"ERC-20 token aggregates" },
  { method:"GET", path:"/api/wallet/:address/rollups",     auth:true,  desc:"Blob rollup activity" },
  { method:"GET", path:"/api/eth-price",                   auth:false, desc:"ETH/USD & ETH/BTC price" },
  { method:"GET", path:"/api/block-by-timestamp",          auth:false, desc:"Block number from UNIX timestamp" },
  { method:"POST",path:"/api/wallet/admin/new-key",        auth:false, desc:"Issue new API key (admin secret)" },
];

const PARAMS = [
  { name:"startblock", desc:"Filter txs from this block number" },
  { name:"endblock",   desc:"Filter txs up to this block number" },
  { name:"page",       desc:"Page number (1-indexed)" },
  { name:"offset",     desc:"Rows per page (max 1000)" },
  { name:"sort",       desc:"asc or desc (default: desc)" },
];

function DevReference() {
  const [open, setOpen] = useState(false);
  const base = "http://134.209.107.4:8080";
  return (
    <div className="mt-6 border border-border rounded-xl overflow-hidden">
      <button onClick={()=>setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 bg-surface hover:bg-surface-elevated transition-colors">
        <div className="flex items-center gap-3"><ExternalLink className="h-4 w-4 text-text-secondary" /><span className="text-sm font-bold text-text-primary">API Reference — Etherscan-Compatible</span></div>
        {open ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
      </button>
      {open && (
        <div className="px-6 py-5 bg-background border-t border-border space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Base URL</p>
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2"><code className="font-mono text-primary text-xs">{base}</code><CopyButton value={base} /></div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Auth</p>
            <p className="text-xs text-text-secondary">Protected routes require <code className="text-primary text-[11px]">X-API-Key: w360_…</code> or <code className="text-primary text-[11px]">Authorization: Bearer w360_…</code>.</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Endpoints</p>
            <div className="space-y-1.5">
              {ENDPOINTS.map(ep=>(
                <div key={ep.path} className="flex items-start gap-3 bg-surface border border-border rounded-lg px-3 py-2.5">
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase shrink-0 mt-0.5">{ep.method}</span>
                  <code className="font-mono text-xs text-text-primary flex-1 break-all">{ep.path}</code>
                  <span className="text-[10px] text-text-secondary shrink-0 hidden md:block">{ep.auth ? "🔑 " : ""}{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Query Params (txs endpoints)</p>
            <div className="space-y-1">
              {PARAMS.map(p=><div key={p.name} className="flex items-center gap-3 text-xs"><code className="text-primary font-mono w-28 shrink-0">{p.name}</code><span className="text-text-secondary">{p.desc}</span></div>)}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Response Format</p>
            <pre className="bg-surface border border-border rounded-lg p-3 text-xs font-mono text-text-secondary overflow-x-auto">{`{ "status": "1", "message": "OK", "result": [...] }`}</pre>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Example</p>
            <pre className="bg-surface border border-border rounded-lg p-3 text-xs font-mono text-text-secondary overflow-x-auto">{`curl -H "X-API-Key: w360_your_key" \\
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
  { id: "summary",  label: "Overview",     icon: Wallet },
  { id: "txs",      label: "Transactions", icon: ArrowRight },
  { id: "erc20",    label: "ERC-20",       icon: Coins },
  { id: "nft",      label: "NFTs",         icon: ImageIcon },
  { id: "rollups",  label: "Rollups",      icon: Zap },
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
      fetch(`/api/wallet-360?address=${a}&type=summary`).then(r=>r.json()),
      fetch(`/api/wallet-360?address=${a}&type=balance`).then(r=>r.json()),
      fetch(`/api/wallet-360?address=${a}&type=rollups`).then(r=>r.json()),
    ]);
    setLoading(false);

    if (sumRes.status==="fulfilled") {
      if (sumRes.value.error) setError(sumRes.value.error);
      else setSummary(sumRes.value);
    } else setError("Failed to load summary");

    if (balRes.status==="fulfilled" && balRes.value.status==="1") setBalance(balRes.value.result ?? "0");
    if (rolRes.status==="fulfilled" && Array.isArray(rolRes.value)) setRollups(rolRes.value);
  }, []);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (isValid(input)) search(input); };

  return (
    <div className="animate-page-in">
      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary pointer-events-none" />
        <input
          type="text" value={input} onChange={e=>setInput(e.target.value)} spellCheck={false}
          placeholder="Enter Ethereum address (0x…)"
          className={cn("w-full pl-12 pr-32 py-4 rounded-xl bg-surface border text-sm font-mono text-text-primary placeholder:text-text-secondary/40 focus:outline-none transition-all", isValid(input) ? "border-primary/60 shadow-[0_0_0_1px_rgba(0,167,181,0.2)]" : "border-border")}
        />
        <button type="submit" disabled={!isValid(input)} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-30 hover:bg-primary/90 transition-all">
          Lookup <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {/* Results */}
      {address && (
        <div className="mb-8">
          {/* Address bar */}
          <div className="flex items-center gap-3 mb-5 p-3 bg-surface border border-border rounded-lg">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><span className="text-xs font-bold text-primary">0x</span></div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-50 mb-0.5">Viewing wallet</p>
              <p className="font-mono text-sm text-text-primary truncate">{address}</p>
            </div>
            <div className="flex items-center gap-1">
              <CopyButton value={address} />
              <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-surface-elevated text-text-secondary hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg mb-5 w-fit flex-wrap">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all", tab===t.id ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary")}>
                  <Icon className="h-3.5 w-3.5" />{t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="bg-surface border border-border rounded-xl p-5">
            {tab==="summary" && (loading ? <LoadingState /> : error ? <ErrorState msg={error} /> : summary ? <SummaryTab data={summary} balance={balance} /> : null)}
            {tab==="txs"     && <NormalTxsTab address={address} />}
            {tab==="erc20"   && <Erc20Tab address={address} />}
            {tab==="nft"     && <NftTab address={address} />}
            {tab==="rollups" && (loading ? <LoadingState /> : <RollupsTab rollups={rollups} />)}
          </div>
        </div>
      )}

      <DevReference />
      <AdminPanel />
    </div>
  );
}
