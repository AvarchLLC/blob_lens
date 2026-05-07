import { createHash } from "crypto";
import sql from "@/lib/db";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Post-merge anchor for slot ↔ block mapping
const MERGE_BLOCK = 15_537_394;
const MERGE_SLOT  = 4_700_013;

function blockToSlot(blockNumber: number): number {
  return MERGE_SLOT + (blockNumber - MERGE_BLOCK);
}

// versioned_hash = 0x01 || SHA256(kzg_commitment)[1:]
function kzgToVersionedHash(commitmentHex: string): string {
  const buf = Buffer.from(commitmentHex.replace(/^0x/, ""), "hex");
  const digest = createHash("sha256").update(buf).digest();
  digest[0] = 0x01;
  return "0x" + digest.toString("hex");
}

function detectEncoding(bytes: Uint8Array): string {
  // OP-Stack field-element packing: byte[0] of every 32-byte chunk is 0x00
  let opZeros = 0;
  const chunks = Math.min(32, Math.floor(bytes.length / 32));
  for (let i = 0; i < chunks * 32; i += 32) if (bytes[i] === 0) opZeros++;
  if (chunks > 0 && opZeros / chunks > 0.9) return "OP-Stack (channel frames)";

  // zlib magic: 0x78 0x9C / 0x78 0x01 / 0x78 0xDA
  if (bytes[0] === 0x78 && (bytes[1] === 0x9c || bytes[1] === 0x01 || bytes[1] === 0xda))
    return "zlib compressed";

  // zstd magic: 0xFD2FB528 little-endian
  if (bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd)
    return "zstd compressed";

  // brotli-like or LZ4 (Arbitrum Nitro) — 0x02 marker
  if (bytes[0] === 0x02) return "Arbitrum (compressed batch)";

  // Sparse blob
  let nonZero = 0;
  for (let i = 0; i < bytes.length; i++) if (bytes[i] !== 0) nonZero++;
  if (nonZero / bytes.length < 0.05) return "Sparse (mostly empty)";

  return "Unknown / raw";
}

async function fetchBlobSidecars(slot: number): Promise<{ data: BeaconSidecar[] } | null> {
  const alchemyKey = process.env.ALCHEMY_KEY;
  const beaconBase = process.env.BEACON_RPC_URL ??
    (alchemyKey ? `https://eth-mainnet.g.alchemy.com/eth/v2/${alchemyKey}` : null);

  if (!beaconBase) return null;

  const url = `${beaconBase}/eth/v1/beacon/blob_sidecars/${slot}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json() as Promise<{ data: BeaconSidecar[] }>;
}

interface BeaconSidecar {
  index: string;
  blob: string; // 0x + 262144 hex chars (131072 bytes)
  kzg_commitment: string;
  kzg_proof: string;
}

export async function GET(req: NextRequest) {
  const tx_hash     = req.nextUrl.searchParams.get("tx_hash");
  const block_param = req.nextUrl.searchParams.get("block_number");

  if (!tx_hash || !block_param)
    return Response.json({ error: "tx_hash and block_number required" }, { status: 400 });

  const blockNumber = Number(block_param);
  if (!Number.isInteger(blockNumber) || blockNumber <= 0)
    return Response.json({ error: "invalid block_number" }, { status: 400 });

  // Fetch tx's blob versioned hashes from DB
  const rows = await sql<{ blob_hashes: string[] }[]>`
    SELECT blob_hashes FROM blob_transactions WHERE tx_hash = ${tx_hash} LIMIT 1
  `;
  const knownHashes: Set<string> = new Set(rows[0]?.blob_hashes ?? []);

  // Try the computed slot and neighbours (handles missed slots)
  const baseSlot = blockToSlot(blockNumber);
  let sidecars: BeaconSidecar[] | null = null;
  let usedSlot = baseSlot;

  for (const delta of [0, 1, -1, 2]) {
    const attempt = baseSlot + delta;
    const result = await fetchBlobSidecars(attempt);
    if (result?.data?.length) {
      sidecars = result.data;
      usedSlot = attempt;
      break;
    }
  }

  if (!sidecars) {
    return Response.json({
      error: "Beacon API unavailable or no blobs for this block. Set ALCHEMY_KEY or BEACON_RPC_URL in apps/web/.env.local.",
      slot: baseSlot,
    }, { status: 503 });
  }

  // Match sidecars to this tx by versioned hash
  const matched = sidecars.filter((s) => {
    const vh = kzgToVersionedHash(s.kzg_commitment);
    return knownHashes.size === 0 || knownHashes.has(vh);
  });

  const blobs = matched.map((s) => {
    const hex = s.blob.replace(/^0x/, "");
    const bytes = Uint8Array.from(Buffer.from(hex.slice(0, 2048), "hex")); // first 1024 bytes for analysis
    const full  = Uint8Array.from(Buffer.from(hex, "hex"));

    let nonZero = 0;
    for (const b of full) if (b !== 0) nonZero++;

    const density    = nonZero / full.length;
    const versionedHash = kzgToVersionedHash(s.kzg_commitment);

    return {
      index:           Number(s.index),
      versioned_hash:  versionedHash,
      kzg_commitment:  s.kzg_commitment,
      size_bytes:      full.length,
      non_zero_bytes:  nonZero,
      density_pct:     Math.round(density * 1000) / 10,
      detected_encoding: detectEncoding(bytes),
      hex_preview:     hex.slice(0, 512), // first 256 bytes
    };
  });

  return Response.json({ tx_hash, block_number: blockNumber, slot: usedSlot, blobs });
}
