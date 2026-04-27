use std::collections::HashMap;

/// Rollup registry mapping addresses to rollup names
/// Based on CLAUDE.md's rollup attribution logic
pub fn get_rollup_registry() -> HashMap<String, String> {
    let mut registry = HashMap::new();

    // Mainnet L2s (OP Stack derivatives)
    registry.insert("0x6887246668a3b87f54bed3cb3f02b747db32f2db".to_lowercase(), "Base".to_string());
    registry.insert("0xff00000000000000000000000000000000000010".to_lowercase(), "OP Mainnet".to_string());
    registry.insert("0xff00000000000000000000000000000000010000".to_lowercase(), "Unichain".to_string());
    registry.insert("0xff00000000000000000000000000000000004000".to_lowercase(), "Lisk".to_string());
    registry.insert("0xff00000000000000000000000000000000000010".to_lowercase(), "Blast".to_string());
    registry.insert("0xff00000000000000000000000000000000011000".to_lowercase(), "Mode".to_string());
    registry.insert("0xff00000000000000000000000000000000060900".to_lowercase(), "Zora".to_string());
    registry.insert("0xff00000000000000000000000000000000040900".to_lowercase(), "WorldChain".to_string());
    registry.insert("0xff00000000000000000000000000000000002000".to_lowercase(), "Fraxtal".to_string());
    registry.insert("0xff00000000000000000000000000000000012000".to_lowercase(), "Metal L2".to_string());
    registry.insert("0xff00000000000000000000000000000000060600".to_lowercase(), "Cyber".to_string());
    registry.insert("0xff00000000000000000000000000000000015900".to_lowercase(), "Ink".to_string());
    registry.insert("0xff00000000000000000000000000000000040100".to_lowercase(), "Derive".to_string());

    // Arbitrum
    registry.insert("0x1c479675ad559dc151f6ec7ed3fbf8ce2c2e6e92".to_lowercase(), "Arbitrum One".to_string());
    registry.insert("0x51ce04be214b38861890e7064c1db1202166edf0".to_lowercase(), "Arbitrum Nova".to_string());

    // Other rollups
    registry.insert("0xbb80f5e9b75ba0c04e8560194b4500a4eb0decae".to_lowercase(), "zkSync Era".to_string());
    registry.insert("0x8453957136a1f1fd053161a9cb221206f66d58ab".to_lowercase(), "Starknet".to_string());
    registry.insert("0xd19d4b5d358258f05be33b186d6e83e942f0bfb7".to_lowercase(), "Linea".to_string());
    registry.insert("0xa1db05c9e47feb2f18628b295763f49aceb77475".to_lowercase(), "Scroll".to_string());
    registry.insert("0xef6ab30b56ad41b49f9def93d95e86df3c66e31f".to_lowercase(), "Taiko".to_string());
    registry.insert("0x1a1ec25dc08e98e5e93f1104b5ca0ad82b8bfe46".to_lowercase(), "Mantle".to_string());
    registry.insert("0x86bbdfe1b8b9a7c29bea6e84e0f2e9ebfb39c137".to_lowercase(), "Polygon zkEVM".to_string());

    registry
}

/// Resolve a blob transaction to its rollup
/// Checks both `from` and `to` addresses per CLAUDE.md
pub fn resolve_rollup(from: &str, to: Option<&str>, _registry: &HashMap<String, String>) -> String {
    let registry = get_rollup_registry();
    
    let from_lower = from.to_lowercase();
    if let Some(rollup) = registry.get(&from_lower) {
        return rollup.clone();
    }

    if let Some(to_addr) = to {
        let to_lower = to_addr.to_lowercase();
        if let Some(rollup) = registry.get(&to_lower) {
            return rollup.clone();
        }
    }

    "UNKNOWN".to_string()
}
