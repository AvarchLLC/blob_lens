import { getHourlyL1Fee } from "@/lib/l1Fee";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getHourlyL1Fee(24);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
