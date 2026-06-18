import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.WALLET_360_BACKEND_URL ?? "http://134.209.107.4:8080";
const API_KEY = process.env.WALLET_360_API_KEY ?? "";

type AddressType =
  | "summary" | "txs" | "tokens" | "rollups"
  | "balance" | "normal-txs" | "erc20-txs" | "nft-txs";

function addressPath(address: string, type: AddressType, params: URLSearchParams): string {
  const base = `/api/wallet/${address}`;
  switch (type) {
    case "txs":        return `${base}/txs?${params}`;
    case "tokens":     return `${base}/tokens`;
    case "rollups":    return `${base}/rollups`;
    case "balance":    return `${base}/balance`;
    case "normal-txs": return `${base}/normal-txs?${params}`;
    case "erc20-txs":  return `${base}/erc20-txs?${params}`;
    case "nft-txs":    return `${base}/nft-txs?${params}`;
    default:           return base;
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = (sp.get("type") ?? "summary") as string;

  // ── Non-address endpoints ──────────────────────────────────────────────────
  if (type === "eth-price") {
    return proxy(`${BACKEND}/api/eth-price`, null);
  }
  if (type === "block-by-timestamp") {
    const ts      = sp.get("timestamp") ?? "";
    const closest = sp.get("closest") ?? "before";
    return proxy(`${BACKEND}/api/block-by-timestamp?timestamp=${ts}&closest=${closest}`, null);
  }

  // ── Address endpoints ──────────────────────────────────────────────────────
  const address = (sp.get("address") ?? "").trim().toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
  }
  if (!API_KEY) {
    return NextResponse.json({ error: "WALLET_360_API_KEY not configured" }, { status: 503 });
  }

  // Forward Etherscan-style pagination params
  const fwd = new URLSearchParams();
  for (const k of ["startblock","endblock","page","offset","sort","limit"]) {
    const v = sp.get(k);
    if (v) fwd.set(k, v);
  }

  const path = addressPath(address, type as AddressType, fwd);
  return proxy(`${BACKEND}${path}`, API_KEY);
}

async function proxy(url: string, apiKey: string | null) {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers["X-API-Key"] = apiKey;
    const res  = await fetch(url, { headers, next: { revalidate: 0 } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[wallet-360 proxy]", err);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
