import { getEthPrice } from "@/lib/ethPrice";

export const dynamic = "force-dynamic";

export async function GET() {
  const usd = await getEthPrice();
  return Response.json({ usd });
}
