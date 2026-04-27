
use alloy::providers::{Provider, ProviderBuilder};
use futures_util::StreamExt;
use dotenvy::dotenv;
use std::env;

pub async fn fetch_blob() -> eyre::Result<()> {
  // 1. Setup Alchemy WebSocket URL
    // Use 'wss://' instead of 'https://'
    dotenv().ok();
    let alchemy_key = env::var("ALCHEMY_KEY").unwrap();
    let ws_url = format!("wss://eth-mainnet.g.alchemy.com/v2/{}", alchemy_key);
    // 2. Initialize the WS Provider
    let provider = ProviderBuilder::new()
        .on_ws(alloy::rpc::client::WsConnect::new(ws_url))
        .await?;

    println!("Connected to Alchemy WebSocket. Listening for Blob Transactions...");

    // 3. Subscribe to Full Pending Transactions
    // Note: To get the transaction type, we need the full body, not just the hash.
    let sub = provider.subscribe_pending_transactions().await?;
    let mut stream = sub.into_stream();

while let Some(tx_hash) = stream.next().await {
    if let Ok(Some(full_tx)) = provider.get_transaction_by_hash(tx_hash).await {
         println!("Fetched full tx: {:?}", full_tx.transaction_type);
        println!("Fetched full tx: {:?}", full_tx.blob_versioned_hashes);
    }
}

    Ok(()) 
}