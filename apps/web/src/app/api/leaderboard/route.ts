import { getLeaderboard } from "@/lib/queries";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const hours = Number(req.nextUrl.searchParams.get("hours") ?? 24);
  try {
    const data = await getLeaderboard(hours);
    return Response.json({ data, updatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
