import { getRollupTransactions } from "@/lib/queries";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await getRollupTransactions(decodeURIComponent(id));
    return Response.json({ data, updatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
