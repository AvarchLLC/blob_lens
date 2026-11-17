//! Differential gas-repricing replayer — DRAFT.
//!
//! Replays a historical mainnet tx under Osaka (current) vs Glamsterdam
//! (EIP-8037/8038) rules against the ba-data archive node, and diffs the
//! outcome (gas used, success, output). An outcome flip confirms a Tier-0
//! candidate.
//!
//! Flow (the structure is final; the revm builder calls are marked TODO until
//! we build against revm@glamsterdam-devnet-8 and see its exact API):
//!   1. For each txhash: fetch the tx + its block env from MAINNET_RPC (ba-data).
//!   2. Fetch the pre-state with debug_traceTransaction { tracer: prestateTracer }
//!      so execution is self-contained and deterministic.
//!   3. Load that pre-state into a revm CacheDB.
//!   4. Execute twice — cfg.spec = OSAKA, then cfg.spec = AMSTERDAM (8037 on).
//!   5. Diff gas_used / success / output; print and (optionally) webhook.
//!
//! Env:
//!   MAINNET_RPC   ba-data archive node (http://127.0.0.1:8545 on ba-data)
//!   TXLIST        path to a file of txhashes, one per line (from ClickHouse)

use std::{env, fs};

use alloy::{
    primitives::{TxHash, B256},
    providers::{ext::DebugApi, ProviderBuilder},
    rpc::types::trace::geth::{GethDebugTracingOptions, GethDefaultTracingOptions},
};
use eyre::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let rpc = env::var("MAINNET_RPC").unwrap_or_else(|_| "http://127.0.0.1:8545".into());
    let txlist = env::var("TXLIST").unwrap_or_else(|_| "txlist.txt".into());
    let hashes: Vec<TxHash> = fs::read_to_string(&txlist)?
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| l.trim().parse::<B256>().map(TxHash::from))
        .collect::<Result<_, _>>()?;

    let provider = ProviderBuilder::new().connect(&rpc).await?;
    println!("replaying {} tx(s) against {rpc}", hashes.len());

    for tx in hashes {
        // 1 + 2: fetch the tx and its pre-state (prestateTracer) from the archive node.
        let opts = GethDebugTracingOptions {
            config: GethDefaultTracingOptions::default(),
            tracer: Some("prestateTracer".into()),
            ..Default::default()
        };
        let prestate = provider.debug_trace_transaction(tx, opts).await?;
        let full = provider.get_transaction_by_hash(tx).await?;

        // 3: load prestate into a revm CacheDB.
        //    let mut db = CacheDB::new(EmptyDB::default());
        //    for (addr, acc) in prestate { db.insert_account_info(addr, acc.into()); ... }

        // 4: execute under each spec.
        //    let base = run(&db, &full, SpecId::OSAKA)?;      // current rules
        //    let glam = run(&db, &full, SpecId::AMSTERDAM)?;   // EIP-8037/8038 on

        // 5: diff.
        //    if base.success != glam.success || base.gas_used != glam.gas_used {
        //        println!("FLIP {tx:?}: osaka(ok={},gas={}) vs glam(ok={},gas={})", ...);
        //    }
        let _ = (&prestate, &full); // silence unused until the revm block lands
        println!("fetched {tx:?} (+prestate) — revm execute block is the TODO above");
    }

    // TODO after revm builds: implement `run(db, tx, spec) -> ExecResult` with
    //   let ctx = Context::mainnet().with_db(db).modify_cfg_chained(|c| c.spec = spec);
    //   let mut evm = ctx.build_mainnet();
    //   evm.transact(tx_env_from(full))  // read gas_used / success / output
    // and set the Amsterdam state-gas / reservoir flags the branch exposes
    // (is_amsterdam_eip8037_enabled, etc.).
    Ok(())
}
