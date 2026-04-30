import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await sql`SELECT COUNT(*) AS row_count FROM blob_transactions`;
    return Response.json({
      status: "ok",
      row_count: Number(rows[0].row_count),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
