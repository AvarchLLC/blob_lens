use reqwest::Client;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use tracing::warn;

const BLOB_SIZE: usize = 131_072; // bytes per blob (131072 = 2^17)
const MERGE_BLOCK: u64 = 15_537_394;
const MERGE_SLOT: u64 = 4_700_013;

pub const GHOST_THRESHOLD: f64 = 0.05; // blobs with <5% non-zero bytes are ghost blobs

#[derive(Debug, Deserialize)]
struct BeaconSidecarResponse {
    data: Vec<BeaconSidecar>,
}

#[derive(Debug, Deserialize)]
struct BeaconSidecar {
    blob: String,            // 0x + 262144 hex chars (131072 bytes)
    kzg_commitment: String,
}

pub fn block_to_slot(block_number: u64) -> u64 {
    MERGE_SLOT + (block_number - MERGE_BLOCK)
}

/// Computes versioned_hash = 0x01 || SHA256(kzg_commitment)[1:]
pub fn kzg_to_versioned_hash(commitment: &str) -> String {
    let hex_str = commitment.strip_prefix("0x").unwrap_or(commitment);
    let bytes = hex::decode(hex_str).unwrap_or_default();
    let mut hash = Sha256::digest(&bytes);
    hash[0] = 0x01; // BLS12_381 G1 point versioned hash prefix
    format!("0x{}", hex::encode(hash))
}

fn count_non_zero_bytes(blob_hex: &str) -> usize {
    let s = blob_hex.strip_prefix("0x").unwrap_or(blob_hex);
    // Each byte is 2 hex chars. Count pairs that are not "00".
    s.as_bytes()
        .chunks(2)
        .filter(|pair| pair != b"00")
        .count()
}

fn beacon_bases(beacon_rpc_override: &Option<String>) -> Vec<String> {
    if let Some(url) = beacon_rpc_override {
        return vec![url.clone()];
    }
    // Verified working as of 2026-05. Alchemy does not support blob_sidecars.
    vec![
        "https://lodestar-mainnet.chainsafe.io".to_string(),
        "https://www.lightclientdata.org".to_string(),
        "https://beaconstate.ethstaker.cc".to_string(),
    ]
}

#[derive(Debug, Clone)]
pub struct SidecarStats {
    pub non_zero_bytes: usize,
    pub fullness_ratio: f64,
}

#[derive(Debug)]
pub struct TxBlobStats {
    /// Total non-zero bytes summed across all blobs in the transaction
    pub bytes_used: i32,
    /// Average fullness ratio (non_zero / 131072) across all blobs
    pub fullness_ratio: f64,
    /// True if any blob in the transaction has fullness below GHOST_THRESHOLD
    pub is_ghost_blob: bool,
}

/// Fetch all blob sidecars for a given block and return a map from versioned_hash → SidecarStats.
/// Tries beacon endpoints in order; returns an empty map if all fail or the slot has no blobs.
pub async fn fetch_slot_sidecars(
    client: &Client,
    beacon_rpc_override: &Option<String>,
    block_number: u64,
) -> HashMap<String, SidecarStats> {
    let slot = block_to_slot(block_number);

    for base in beacon_bases(beacon_rpc_override) {
        let url = format!("{}/eth/v1/beacon/blob_sidecars/{}", base, slot);
        let resp = match client
            .get(&url)
            .timeout(std::time::Duration::from_secs(12))
            .send()
            .await
        {
            Ok(r) if r.status().is_success() => r,
            Ok(r) => {
                warn!("Beacon {} → HTTP {}", url, r.status());
                continue;
            }
            Err(e) => {
                warn!("Beacon {} → fetch error: {}", url, e);
                continue;
            }
        };

        let body: BeaconSidecarResponse = match resp.json().await {
            Ok(b) => b,
            Err(e) => {
                warn!("Beacon {} → JSON parse error: {}", url, e);
                continue;
            }
        };

        let mut map = HashMap::new();
        for sidecar in &body.data {
            let versioned_hash = kzg_to_versioned_hash(&sidecar.kzg_commitment);
            let non_zero = count_non_zero_bytes(&sidecar.blob);
            map.insert(
                versioned_hash,
                SidecarStats {
                    non_zero_bytes: non_zero,
                    fullness_ratio: non_zero as f64 / BLOB_SIZE as f64,
                },
            );
        }
        return map;
    }

    HashMap::new()
}

/// Aggregate per-blob stats into per-transaction stats using the tx's versioned hashes.
/// Returns None if none of the tx's hashes appear in the sidecar map (fetch failed or slots mismatched).
pub fn aggregate_tx_stats(
    blob_hashes: &[String],
    sidecar_map: &HashMap<String, SidecarStats>,
) -> Option<TxBlobStats> {
    let matched: Vec<&SidecarStats> = blob_hashes
        .iter()
        .filter_map(|h| sidecar_map.get(h))
        .collect();

    if matched.is_empty() {
        return None;
    }

    let total_non_zero: usize = matched.iter().map(|s| s.non_zero_bytes).sum();
    let avg_fullness = matched.iter().map(|s| s.fullness_ratio).sum::<f64>() / matched.len() as f64;
    let has_ghost = matched.iter().any(|s| s.fullness_ratio < GHOST_THRESHOLD);

    Some(TxBlobStats {
        bytes_used: total_non_zero as i32,
        fullness_ratio: avg_fullness,
        is_ghost_blob: has_ghost,
    })
}
