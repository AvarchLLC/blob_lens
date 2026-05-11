import { getPerRollupFeeActivity } from "@/lib/queries";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rollup = req.nextUrl.searchParams.get("rollup");
  if (!rollup) {
    return Response.json({ error: "rollup required" }, { status: 400 });
  }
  try {
    const data = await getPerRollupFeeActivity(rollup, 24);
    return Response.json({ data });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
