import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.WALLET_360_BACKEND_URL ?? "http://134.209.107.4:8080";

export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret") ?? "";
  if (!adminSecret) {
    return NextResponse.json({ error: "X-Admin-Secret header required" }, { status: 401 });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const res = await fetch(`${BACKEND}/api/wallet/admin/new-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": adminSecret },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[wallet-360 admin proxy]", err);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
