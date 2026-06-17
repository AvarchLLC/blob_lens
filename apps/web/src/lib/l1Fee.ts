const BLOCKS_PER_HOUR = 300;
const BLOCKS_PER_CHUNK = 1024;

function getRpcUrl(): string {
  const custom = process.env.RPC_URL || process.env.RETH_RPC;
  if (custom) return custom;
  const key = process.env.ALCHEMY_KEY;
  if (key) return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
  return "https://cloudflare-eth.com";
}

async function rpcCall(url: string, method: string, params: unknown[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export interface HourlyL1Fee {
  hour: string;
  l1_base_fee_gwei: number;
}

export async function getHourlyL1Fee(hours = 24): Promise<HourlyL1Fee[]> {
  const url = getRpcUrl();
  const totalBlocks = hours * BLOCKS_PER_HOUR;
  const chunkCount = Math.ceil(totalBlocks / BLOCKS_PER_CHUNK);

  const latestHex = (await rpcCall(url, "eth_blockNumber", [])) as string;
  const latest = parseInt(latestHex, 16);

  const chunkResults = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) => {
      const newestBlock = latest - i * BLOCKS_PER_CHUNK;
      const count = Math.min(BLOCKS_PER_CHUNK, totalBlocks - i * BLOCKS_PER_CHUNK);
      return rpcCall(url, "eth_feeHistory", [
        `0x${count.toString(16)}`,
        `0x${newestBlock.toString(16)}`,
        [],
      ]) as Promise<{ oldestBlock: string; baseFeePerGas: string[] }>;
    })
  );

  const feeByBlock = new Map<number, number>();
  for (const chunk of chunkResults) {
    if (!chunk?.baseFeePerGas) continue;
    const oldest = parseInt(chunk.oldestBlock, 16);
    // baseFeePerGas has blockCount+1 entries; last entry is next-block projection — drop it
    chunk.baseFeePerGas.slice(0, -1).forEach((hex, j) => {
      feeByBlock.set(oldest + j, parseInt(hex, 16));
    });
  }

  const hourly: HourlyL1Fee[] = [];
  const latestBucketStart = Math.floor(latest / BLOCKS_PER_HOUR) * BLOCKS_PER_HOUR;

  for (let h = hours - 1; h >= 0; h--) {
    const bucketStart = latestBucketStart - (h + 1) * BLOCKS_PER_HOUR;
    const fees: number[] = [];
    for (let b = bucketStart; b < bucketStart + BLOCKS_PER_HOUR; b++) {
      const fee = feeByBlock.get(b);
      if (fee !== undefined) fees.push(fee);
    }
    if (fees.length === 0) continue;

    const avgFeeWei = fees.reduce((s, f) => s + f, 0) / fees.length;
    // Approximate timestamp from block distance to current latest
    const midBlock = bucketStart + BLOCKS_PER_HOUR / 2;
    const approxTime = new Date(Date.now() - (latest - midBlock) * 12_000);

    hourly.push({
      hour: approxTime.toISOString(),
      l1_base_fee_gwei: avgFeeWei / 1e9,
    });
  }

  return hourly;
}
