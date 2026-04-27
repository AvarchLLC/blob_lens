mod services;
use services::blob_parser;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Hello, world!");
    blob_parser::fetch_blob().await?;
    Ok(())
}
