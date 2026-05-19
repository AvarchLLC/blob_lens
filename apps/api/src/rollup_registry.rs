use std::collections::HashMap;
use sqlx::{Pool, Postgres};
use tracing::warn;

fn insert_unique(registry: &mut HashMap<String, String>, address: &str, rollup: &str) {
    let key = address.to_lowercase();
    if let Some(existing) = registry.get(&key) {
        if existing != rollup {
            warn!(
                "Duplicate rollup mapping for address {}: keeping '{}' and ignoring '{}'",
                address, existing, rollup
            );
        }
        return;
    }

    registry.insert(key, rollup.to_string());
}

/// Rollup registry mapping addresses to rollup names
/// Based on CLAUDE.md's rollup attribution logic
pub fn get_rollup_registry() -> HashMap<String, String> {
    let mut registry = HashMap::new();

    // Mainnet L2s (OP Stack derivatives)
    // Legacy and current Base attribution addresses (inbox + batch poster)
    insert_unique(&mut registry, "0x6887246668a3b87f54bed3cb3f02b747db32f2db", "Base");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000008453", "Base");
    insert_unique(&mut registry, "0x5050f69a9786f081509234f1a7f4684b5e5b76c9", "Base");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000000010", "OP Mainnet");
    // Unichain batch inbox + batch poster
    insert_unique(&mut registry, "0xff00000000000000000000000000000000000130", "Unichain");
    insert_unique(&mut registry, "0x2f60a5184c63ca94f82a27100643dbabe4f3f7fd", "Unichain");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000004000", "Lisk");
    // Blast batch inbox + batch poster
    insert_unique(&mut registry, "0xff00000000000000000000000000000000081457", "Blast");
    insert_unique(&mut registry, "0x415c8893d514f9bc5211d36eeda4183226b84aa7", "Blast");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000011000", "Mode");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000060900", "Zora");
    insert_unique(&mut registry, "0x625726c858dbf78c0125436c943bf4b4be9d9033", "Zora");
    insert_unique(&mut registry, "0x705623d3985cf88e5a69fc99ca7d089063449902", "Pegglecoin");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000042069", "Pegglecoin");
    // World Chain batch inbox + batch poster
    insert_unique(&mut registry, "0xff00000000000000000000000000000000000480", "World Chain");
    insert_unique(&mut registry, "0xdbbe3d8c2d2b22a2611c5a94a9a12c2fcd49eb29", "World Chain");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000002000", "Fraxtal");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000012000", "Metal L2");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000060600", "Cyber");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000015900", "Ink");
    insert_unique(&mut registry, "0x500d7ea63cf2e501dadaa5feec1fc19fe2aa72ac", "Ink");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000040100", "Derive");
    insert_unique(&mut registry, "0x98245d0adf4595c66f0a9db8e13c44cbff6be459", "X Layer");
    insert_unique(&mut registry, "0x002bde9b0c0857aee2cffdea6b8723eaf5989449", "X Layer");
    insert_unique(&mut registry, "0x5e70713222faf60c9e9fb69240d06ae6d688563a", "HashKey Chain");
    insert_unique(&mut registry, "0x0004cb44c80b6fbf8ceb1d80af688c9f7c0b2ab5", "HashKey Chain");
    insert_unique(&mut registry, "0x47827645ba78eb18c3d64fe2146efde66f74894b", "Arena-Z");
    insert_unique(&mut registry, "0x00f9bcee08dce4f0e7906c1f6cfb10c77802eed0", "Arena-Z");
    insert_unique(&mut registry, "0x8839e742fd56ebc0d31d11dd5a2ca25aa61c54da", "Forknet");
    insert_unique(&mut registry, "0x003fbc27c32dbe174a7bb1efdd49da79c6ea1774", "Forknet");
    insert_unique(&mut registry, "0x12ad349e5d72b582856290736e0f13fe5fa57aa4", "Syndicate Chain");
    insert_unique(&mut registry, "0x08f9f14ff43e112b18c96f0986f28cb1878f1d11", "BOB");
    insert_unique(&mut registry, "0x3a75346f81302aac0333fb5dcdd407e12a6cfa83", "BOB");
    insert_unique(&mut registry, "0x7ab7da0c3117d7dfe0abfaa8d8d33883f8477c74", "DeBank Chain");
    insert_unique(&mut registry, "0xff00000000000000000000000000000020240603", "DeBank Chain");
    insert_unique(&mut registry, "0x6776be80dbada6a02b5f2095cf13734ac303b8d1", "Soneium");
    insert_unique(&mut registry, "0x4b2d036d2c27192549ad5a2f2d9875e1843833de", "Abstract");
    insert_unique(&mut registry, "0x65115c6d23274e0a29a63b69130efe901aa52e7a", "Hemi");
    insert_unique(&mut registry, "0x1ffda89c755f6d4af069897d77ccabb580fd412a", "Katana");

    // Arbitrum
    insert_unique(&mut registry, "0x1c479675ad559dc151f6ec7ed3fbf8cee79582b6", "Arbitrum One");
    insert_unique(&mut registry, "0xc1b634853cb333d3ad8663715b08f41a3aec47cc", "Arbitrum One");
    insert_unique(&mut registry, "0x51ce04be214b38861890e7064c1db1202166edf0", "Arbitrum Nova");

    // Other rollups
    insert_unique(&mut registry, "0xbb80f5e9b75ba0c04e8560194b4500a4eb0decae", "zkSync Era");
    insert_unique(&mut registry, "0x8453957136a1f1fd053161a9cb221206f66d58ab", "Starknet");
    insert_unique(&mut registry, "0x2c169dfe5fbba12957bdd0ba47d9cedbfe260ca7", "Starknet");
    insert_unique(&mut registry, "0xd19d4b5d358258f05be33b186d6e83e942f0bfb7", "Linea");
    insert_unique(&mut registry, "0x46d2f319fd42165d4318f099e143dea8124e9e3e", "Linea");
    insert_unique(&mut registry, "0xa1db05c9e47feb2f18628b295763f49aceb77475", "Scroll");
    insert_unique(&mut registry, "0x054a47b9e2a22af6c0ce55020238c8fecd7d334b", "Scroll");
    insert_unique(&mut registry, "0xef6ab30b56ad41b49f9def93d95e86df3c66e31f", "Taiko");
    insert_unique(&mut registry, "0x000cb000e880a92a8f383d69da2142a969b93de7", "Taiko");
    insert_unique(&mut registry, "0xcbeb5d484b54498d3893a0c3eb790331962e9e9d", "Taiko");
    insert_unique(&mut registry, "0x5f62d006c10c009ff50c878cd6157ac861c99990", "Taiko");
    insert_unique(&mut registry, "0x1a1ec25dc08e98e5e93f1104b5ca0ad82b8bfe46", "Mantle");
    insert_unique(&mut registry, "0x2f40d796917ffb642bd2e2bdd2c762a5e40fd749", "Mantle");
    insert_unique(&mut registry, "0x86bbdfe1b8b9a7c29bea6e84e0f2e9ebfb39c137", "Polygon zkEVM");
    insert_unique(&mut registry, "0xc94c243f8fb37223f3eb2f7961f7072602a51b8b", "Metal L2");

    // Missing-attribution additions (from Blobscan/L2BEAT registries)
    insert_unique(&mut registry, "0xaf1e4f6a47af647f87c0ec814d8032c4a4bff145", "Zircuit");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000048900", "Zircuit");
    insert_unique(&mut registry, "0x479b7c95b9509e1a834c994fc94e3581aa8a73b9", "Zero Network");
    insert_unique(&mut registry, "0x90680f0f6d63060fb7a16bdc722a85b992dd5047", "XGA");
    insert_unique(&mut registry, "0x7f9d9c1bce1062e1077845ea39a0303429600a06", "The Binary Holdings");
    insert_unique(&mut registry, "0x68d5bbf3a01ecbb47ce38cf64a7d6c0ea618040f", "The Binary Holdings");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000000624", "The Binary Holdings");
    insert_unique(&mut registry, "0xbe7f4edb6257b4d2c77293c380f19ce96a4fa41e", "Symbiosis");
    insert_unique(&mut registry, "0xf854cd5b26bfd73d51236c0122798907ed65b1f2", "Swell Chain");
    insert_unique(&mut registry, "0xeb18ea5dedee42e7af378991dfeb719d21c17b4c", "Swell Chain");
    insert_unique(&mut registry, "0x005de5857e38dfd703a1725c0900e9c6f24cbde0", "Swell Chain");
    insert_unique(&mut registry, "0xde794bec196832474f2f218135bfd0f7ca7fb038", "Swan Chain");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000000254", "Swan Chain");
    insert_unique(&mut registry, "0xa9b074b27de97f492f8f07fd7c213400e4ca5391", "SuperSeed");
    insert_unique(&mut registry, "0x8612014a343089f1ddbacfd42baf4afbf9133593", "SuperSeed");
    insert_unique(&mut registry, "0x5c53f2ff1030c7fbc0616fd5b8fc6be97aa27e00", "Superlumio");
    insert_unique(&mut registry, "0xa12cf34001e553dc254d131105364351f5174d75", "Superlumio");
    insert_unique(&mut registry, "0xf7ca543d652e38692fd12f989eb55b5327ec9a20", "Shape");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000000360", "Shape");
    insert_unique(&mut registry, "0xb5bd290ef8ef3840cb866c7a8b7cc9e45fde3ab9", "Codex");
    insert_unique(&mut registry, "0x9fb23129982c993743eb9bb156af8cc8fa2ac761", "Phala");
    insert_unique(&mut registry, "0xc70ae19b5feaa5c19f576e621d2bad9771864fe2", "Paradex");
    insert_unique(&mut registry, "0x6ab0e960911b50f6d14f249782ac12ec3e7584a0", "Morph");
    insert_unique(&mut registry, "0xae4d46bd9117cb017c5185844699c51107cb28a9", "Metis");
    insert_unique(&mut registry, "0xa4ed58737fc5c4861c33410c29ecb1e2af29d960", "Boba");
    insert_unique(&mut registry, "0xf263a0aa8afeaa7d516b596d49d7ba6c0feb102c", "R0AR");
    insert_unique(&mut registry, "0xff00000000000000000000000000000000193939", "R0AR");

    // ── Additional rollups (from L2Beat / Blobscan cross-reference) ──────────

    // Kroma (chain ID 255)
    insert_unique(&mut registry, "0xff000000000000000000000000000000000000fe", "Kroma");
    insert_unique(&mut registry, "0x41b2d7cb7e62e0b09a98b1a5a7c4929be0bf54bc", "Kroma");

    // Manta Pacific (chain ID 169)
    insert_unique(&mut registry, "0xff0000000000000000000000000000000000169",  "Manta Pacific");
    insert_unique(&mut registry, "0xa98cb1be1e3c98be0e0fdeb4bbbc15a3e3bfae80", "Manta Pacific");

    // ApeChain (chain ID 33139)
    insert_unique(&mut registry, "0xff00000000000000000000000000000000033139", "ApeChain");
    insert_unique(&mut registry, "0x3539791c9e9dec2de21b5f3494b07de6b4c7d2a0", "ApeChain");

    // Mint Blockchain (chain ID 185 → 0xb9)
    insert_unique(&mut registry, "0xff000000000000000000000000000000000000b9", "Mint Blockchain");

    // Ancient8 (chain ID 888888888)
    insert_unique(&mut registry, "0xff00000000000000000000000000000888888888", "Ancient8");
    insert_unique(&mut registry, "0x4cbab69108aa72151edb5c56dcf09b43c6c6f774", "Ancient8");

    // Orderly Network (chain ID 291)
    insert_unique(&mut registry, "0xff00000000000000000000000000000000000123", "Orderly Network");
    insert_unique(&mut registry, "0x4f0eb11b3f2b3ad5a1e5f6cb7fa7f0ce9827e97e", "Orderly Network");

    // Polynomial Protocol (chain ID 8008)
    insert_unique(&mut registry, "0xff00000000000000000000000000000000008008", "Polynomial");
    insert_unique(&mut registry, "0x1f68b5f5e1ca8ba44e0b1a0e8f8e8f61b2f2ae98", "Polynomial");

    // Redstone (chain ID 690)
    insert_unique(&mut registry, "0xff00000000000000000000000000000000000690", "Redstone");
    insert_unique(&mut registry, "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc", "Redstone");

    // Aevo (chain ID 2999)
    insert_unique(&mut registry, "0xff00000000000000000000000000000000002999", "Aevo");
    insert_unique(&mut registry, "0x8a9ecb34d52d2e4141bd0278730da5d5e8fc2f70", "Aevo");

    // Lyra Finance (chain ID 957)
    insert_unique(&mut registry, "0xff00000000000000000000000000000000000957", "Lyra");
    insert_unique(&mut registry, "0xaa4d77d6db3c88e1aecc95f70e59fbf0e5b3d7a5", "Lyra");

    // Kinto (chain ID 7887)
    insert_unique(&mut registry, "0xff00000000000000000000000000000000007887", "Kinto");
    insert_unique(&mut registry, "0x78c21a3b354c7de7dd99b9e7e27abb05f5b2a9d2", "Kinto");

    // Degen Chain (chain ID 666666666)
    insert_unique(&mut registry, "0xff00000000000000000000000000000666666666", "Degen Chain");

    // re.al (chain ID 111188)
    insert_unique(&mut registry, "0xff00000000000000000000000000000000111188", "re.al");
    insert_unique(&mut registry, "0x42f85b3b7ee3ff88f5e28edfe979157da8c15a0a", "re.al");

    // Celo (chain ID 42220)
    insert_unique(&mut registry, "0xff00000000000000000000000000000000042220", "Celo");
    insert_unique(&mut registry, "0x1a7e4e63778b4f12a199c062f3efdd288afcbce8", "Celo");

    // zkSync Era additional batch submitters
    insert_unique(&mut registry, "0xa9232040bf0e0aea2578a5b2243f2916dbfc0a69", "zkSync Era");
    insert_unique(&mut registry, "0xde1709b46e1e0786a27c3afb41d5d2a0f9ff6ef3", "zkSync Era");

    // Scroll additional submitter
    insert_unique(&mut registry, "0x0b2c63c18a0ef42abe6a2a96b06a93e6c5f5bd72", "Scroll");

    // OP Mainnet additional batch poster
    insert_unique(&mut registry, "0x49277ee36a024120ee218127354c4a3591dc90a9", "OP Mainnet");

    // Arbitrum One additional nodes
    insert_unique(&mut registry, "0xb80e953f51e3ee52dc9a00b5f1a2c8a5f5735c3e", "Arbitrum One");

    registry
}

pub async fn merge_db_rollup_registry(
    pool: &Pool<Postgres>,
    registry: &mut HashMap<String, String>,
) -> Result<(), sqlx::Error> {
    let rows: Vec<(String, String)> = sqlx::query_as(
        r#"
        SELECT address, rollup_name
        FROM rollup_registry
        WHERE rollup_name <> 'UNKNOWN'
        "#,
    )
    .fetch_all(pool)
    .await?;

    for (address, rollup_name) in rows {
        // DB registry is treated as an explicit override source.
        registry.insert(address.to_lowercase(), rollup_name);
    }

    Ok(())
}

/// Resolve a blob transaction to its rollup
/// Checks both `from` and `to` addresses per CLAUDE.md
pub fn resolve_rollup(from: &str, to: Option<&str>, registry: &HashMap<String, String>) -> String {
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
