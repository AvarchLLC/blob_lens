import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.WALLET_360_BACKEND_URL ?? "http://134.209.107.4:8080";
const API_KEY = process.env.WALLET_360_API_KEY ?? "";

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const ipLimits = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 60; // 60 requests
const WINDOW = 60 * 1000; // per 1 minute (60,000 ms)

function getClientIp(req: NextRequest): string {
  return (
    (req as NextRequest & { ip?: string }).ip ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = ipLimits.get(ip);

  if (!record || now > record.resetAt) {
    ipLimits.set(ip, { count: 1, resetAt: now + WINDOW });
    return false;
  }

  if (record.count >= LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

// Periodically clean up expired entries to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipLimits.entries()) {
      if (now > record.resetAt) {
        ipLimits.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
  if (interval.unref) interval.unref();
}

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
  // ── Check Rate Limit ────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

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
