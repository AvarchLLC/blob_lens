//! Differential gas-repricing replayer (Tier-1).
//!
//! For each historical mainnet tx: fork state from the ba-data archive node at
//! the tx's parent block, set the real block env, and execute under OSAKA
//! (current) vs AMSTERDAM (EIP-8037/8038). Report gas delta + outcome flips.
//!
//! When a tx passes under Osaka but fails under Amsterdam, we gas-sweep it
//! (retry Amsterdam at 3x gas) to classify:
//!   - "fixed-gas"  : succeeds with more gas  -> the tx/relayer limit is now too
//!                    low (INV-4), fixable by raising it.
//!   - "hard-break" : still fails with 3x gas -> a deeper breakage.
//!
//! Env:  MAINNET_RPC  (default http://127.0.0.1:8545)
//!       TXLIST       file of txhashes (or pass as args)
//!       JSONL=1      emit one JSON object per tx (for the driver) instead of
//!                    the human table
//!       LABEL        optional tag echoed into each JSON row (e.g. a contract)

use std::{env, fs};

use alloy_eips::BlockId;
use alloy_provider::{DynProvider, Provider, ProviderBuilder};
use anyhow::{anyhow, Result};
use revm::{
    context::{CfgEnv, TxEnv},
    context_interface::result::ExecutionResult,
    database::{AlloyDB, CacheDB},
    database_interface::WrapDatabaseAsync,
    primitives::{hardfork::SpecId, Address, Bytes, TxKind, B256, U256},
    Context, ExecuteEvm, MainBuilder, MainContext,
};
use serde_json::{json, Value};

fn s(v: &Value, k: &str) -> Option<String> {
    v.get(k).and_then(|x| x.as_str()).map(String::from)
}
fn u256(v: &Value, k: &str) -> U256 {
    s(v, k).and_then(|x| U256::from_str_radix(x.trim_start_matches("0x"), 16).ok()).unwrap_or(U256::ZERO)
}
fn u64h(v: &Value, k: &str) -> u64 {
    s(v, k).and_then(|x| u64::from_str_radix(x.trim_start_matches("0x"), 16).ok()).unwrap_or(0)
}
fn b256(v: &Value, k: &str) -> Option<B256> {
    s(v, k).and_then(|x| x.parse::<B256>().ok())
}
fn hexbytes(x: &str) -> Vec<u8> {
    let x = x.trim_start_matches("0x");
    (0..x.len() / 2).filter_map(|i| u8::from_str_radix(&x[2 * i..2 * i + 2], 16).ok()).collect()
}

#[derive(Clone)]
struct BlockCtx {
    number: U256,
    timestamp: U256,
    beneficiary: Address,
    gas_limit: u64,
    basefee: u64,
    prevrandao: Option<B256>,
}

struct TxFields {
    from: Address,
    kind: TxKind,
    data: Bytes,
    value: U256,
    gas: u64,
    nonce: u64,
}

fn build_tx(f: &TxFields, gas_limit: u64) -> Result<TxEnv> {
    TxEnv::builder()
        .caller(f.from)
        .kind(f.kind)
        .data(f.data.clone())
        .value(f.value)
        .gas_limit(gas_limit)
        .gas_price(0)
        .nonce(f.nonce)
        .chain_id(Some(1))
        .build()
        .map_err(|e| anyhow!("txenv: {e:?}"))
}

/// Pull a human reason out of revert data: the 4-byte selector plus the longest
/// printable-ASCII run (catches EntryPoint "AA40 over verificationGasLimit",
/// "AA23 reverted (or OOG)", solidity Error(string), etc.).
fn decode_revert(out: &Bytes) -> String {
    let b = out.as_ref();
    let sel = if b.len() >= 4 {
        format!("0x{:02x}{:02x}{:02x}{:02x}", b[0], b[1], b[2], b[3])
    } else {
        "0x".into()
    };
    let (mut best, mut cur) = (String::new(), String::new());
    for &c in b {
        if (0x20..=0x7e).contains(&c) {
            cur.push(c as char);
        } else {
            if cur.len() > best.len() { best = cur.clone(); }
            cur.clear();
        }
    }
    if cur.len() > best.len() { best = cur; }
    let best = best.trim().to_string();
    if best.len() >= 4 { format!("{sel} \"{best}\"") } else { format!("{sel} (no ascii)") }
}

fn run(provider: &DynProvider, parent: u64, b: &BlockCtx, tx: &TxEnv, spec: SpecId) -> Result<(bool, u64, String)> {
    let db = WrapDatabaseAsync::new(AlloyDB::new(provider.clone(), BlockId::number(parent)))
        .ok_or_else(|| anyhow!("AlloyDB init"))?;
    let mut cache = CacheDB::new(db);
    let mut cfg = CfgEnv::new_with_spec(spec);
    cfg.disable_nonce_check = true;
    cfg.disable_base_fee = true; // gas_price=0 with a real basefee would be rejected
    cfg.disable_balance_check = true; // measure gas, not affordability
    cfg.disable_block_gas_limit = true; // let the 3x gas-sweep exceed the block limit
    let bc = b.clone();
    let mut evm = Context::mainnet()
        .with_cfg(cfg)
        .modify_block_chained(|blk| {
            blk.number = bc.number;
            blk.timestamp = bc.timestamp;
            blk.beneficiary = bc.beneficiary;
            blk.gas_limit = bc.gas_limit;
            blk.basefee = bc.basefee;
            blk.prevrandao = bc.prevrandao;
        })
        .with_db(&mut cache)
        .build_mainnet();
    let res: ExecutionResult = evm.transact_one(tx.clone()).map_err(|e| anyhow!("exec: {e:?}"))?;
    let ok = res.is_success();
    let why = if ok {
        String::new()
    } else {
        match res.output() {
            Some(o) if !o.is_empty() => decode_revert(o),
            _ => "halt / out-of-gas (no revert data)".to_string(),
        }
    };
    Ok((ok, res.tx_gas_used(), why))
}

#[tokio::main]
async fn main() -> Result<()> {
    let rpc = env::var("MAINNET_RPC").unwrap_or_else(|_| "http://127.0.0.1:8545".into());
    let jsonl = env::var("JSONL").is_ok();
    let label = env::var("LABEL").unwrap_or_default();
    let mut hashes: Vec<String> = env::args().skip(1).collect();
    if let Ok(path) = env::var("TXLIST") {
        hashes.extend(fs::read_to_string(path)?.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()));
    }
    if hashes.is_empty() {
        return Err(anyhow!("give txhashes as args or TXLIST=file"));
    }

    let provider = ProviderBuilder::new().connect(&rpc).await?.erased();
    if !jsonl {
        println!("replaying {} tx under OSAKA vs AMSTERDAM @ {rpc}\n", hashes.len());
    }

    let mut flips = 0u32;
    let mut hard = 0u32;
    for h in &hashes {
        let tx: Value = match provider.raw_request::<_, Value>("eth_getTransactionByHash".into(), (h,)).await {
            Ok(v) if !v.is_null() => v,
            _ => { emit_err(jsonl, h, &label, "not found"); continue; }
        };
        let block = u64h(&tx, "blockNumber");
        if block == 0 { emit_err(jsonl, h, &label, "pending"); continue; }
        let parent = block - 1;
        let blk_hex = format!("0x{:x}", block);
        let bh: Value = provider.raw_request::<_, Value>("eth_getBlockByNumber".into(), (blk_hex, false)).await
            .unwrap_or(Value::Null);
        let bctx = BlockCtx {
            number: u256(&bh, "number"),
            timestamp: u256(&bh, "timestamp"),
            beneficiary: s(&bh, "miner").and_then(|x| x.parse().ok()).unwrap_or_default(),
            gas_limit: u64h(&bh, "gasLimit").max(30_000_000),
            basefee: u64h(&bh, "baseFeePerGas"),
            prevrandao: b256(&bh, "mixHash"),
        };
        let fields = TxFields {
            from: match s(&tx, "from").and_then(|x| x.parse().ok()) { Some(a) => a, None => { emit_err(jsonl, h, &label, "from"); continue; } },
            kind: match s(&tx, "to").and_then(|x| x.parse::<Address>().ok()) { Some(a) => TxKind::Call(a), None => TxKind::Create },
            data: s(&tx, "input").map(|x| Bytes::from(hexbytes(&x))).unwrap_or_default(),
            value: u256(&tx, "value"),
            gas: u64h(&tx, "gas"),
            nonce: u64h(&tx, "nonce"),
        };

        let txenv = build_tx(&fields, fields.gas)?;
        let (ok_o, gas_o, _) = run(&provider, parent, &bctx, &txenv, SpecId::OSAKA)?;
        let (ok_a, gas_a, why_a) = run(&provider, parent, &bctx, &txenv, SpecId::AMSTERDAM)?;
        let flip = ok_o && !ok_a;

        let mut class = if flip { "fixed-gas-or-break" } else { "" }.to_string();
        if flip {
            flips += 1;
            // Gas-sweep: retry Amsterdam at 3x gas (capped to block limit).
            let swept = (fields.gas.saturating_mul(3)).min(bctx.gas_limit);
            let txhi = build_tx(&fields, swept)?;
            let (ok_hi, _, _) = run(&provider, parent, &bctx, &txhi, SpecId::AMSTERDAM)?;
            class = if ok_hi { "fixed-gas".into() } else { hard += 1; "hard-break".into() };
        }

        if jsonl {
            println!("{}", json!({
                "tx": h, "label": label, "block": block,
                "osaka_ok": ok_o, "osaka_gas": gas_o,
                "amster_ok": ok_a, "amster_gas": gas_a,
                "delta": gas_a as i64 - gas_o as i64,
                "flip": flip, "class": class, "reason": why_a,
            }));
        } else {
            let mark = if flip { format!("  <<< FLIP [{class}]") } else { String::new() };
            println!("  {h}\n    osaka : ok={ok_o} gas={gas_o}\n    amster: ok={ok_a} gas={gas_a}  (Δ{:+}){mark}", gas_a as i64 - gas_o as i64);
            if flip { println!("    reason: {why_a}"); }
        }
    }

    if !jsonl {
        println!("\ndone: {} tx, {flips} flip(s) ({hard} hard-break)", hashes.len());
    }
    Ok(())
}

fn emit_err(jsonl: bool, h: &str, label: &str, why: &str) {
    if jsonl {
        println!("{}", json!({"tx": h, "label": label, "error": why}));
    } else {
        println!("  {h}  skip: {why}");
    }
}
