import { getRecentBlocks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getRecentBlocks(20);
    return Response.json({ data, updatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
