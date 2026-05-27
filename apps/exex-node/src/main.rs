use reth_ethereum::{
    exex::ExExContext,
    node::EthereumNode,
};
use tracing_subscriber::EnvFilter;

mod clickhouse_client;
mod exex;
mod rollup;

fn main() -> eyre::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    dotenvy::dotenv().ok();

    let ch_url  = std::env::var("CLICKHOUSE_URL").unwrap_or_else(|_| "http://localhost:8123".into());
    let ch_db   = std::env::var("CLICKHOUSE_DB").unwrap_or_else(|_| "blob_lens".into());
    let ch_user = std::env::var("CLICKHOUSE_USER").ok();
    let ch_pass = std::env::var("CLICKHOUSE_PASSWORD").ok();

    reth_ethereum::cli::Cli::parse_args().run(async move |builder, _| {
        let mut client = clickhouse::Client::default()
            .with_url(&ch_url)
            .with_database(&ch_db);
        if let Some(u) = &ch_user { client = client.with_user(u); }
        if let Some(p) = &ch_pass { client = client.with_password(p); }

        clickhouse_client::init_schema(&client).await?;
        tracing::info!("ClickHouse schema initialised");

        let handle = builder
            .node(EthereumNode::default())
            .install_exex("blob-indexer", async move |ctx: ExExContext<_>| {
                Ok(exex::run(ctx, client))
            })
            .launch()
            .await?;

        handle.wait_for_node_exit().await
    })
}
