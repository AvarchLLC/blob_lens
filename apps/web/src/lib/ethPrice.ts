const GAS_PER_BLOB = 131_072;

export async function getEthPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { ethereum: { usd: number } };
    return data.ethereum.usd;
  } catch {
    return null;
  }
}

export function blobCostUsd(feeWeiPerGas: string | number, ethUsd: number): number {
  return (Number(feeWeiPerGas) * GAS_PER_BLOB) / 1e18 * ethUsd;
}

export function formatUsd(usd: number): string {
  if (usd < 0.0001) return "< $0.0001";
  if (usd < 0.01)   return `$${usd.toFixed(4)}`;
  if (usd < 1)      return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}
