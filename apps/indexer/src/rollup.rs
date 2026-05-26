use std::collections::HashMap;

/// Static rollup registry: maps lower-case batch-poster / inbox addresses → rollup name.
/// Ported from apps/api_v1 with the DB-override path removed (pure in-process lookup).
pub fn build_registry() -> HashMap<String, &'static str> {
    let mut m: HashMap<String, &'static str> = HashMap::new();
    let mut add = |addr: &str, name: &'static str| {
        m.insert(addr.to_lowercase(), name);
    };

    // OP Stack
    add("0x6887246668a3b87f54bed3cb3f02b747db32f2db", "Base");
    add("0xff00000000000000000000000000000000008453", "Base");
    add("0x5050f69a9786f081509234f1a7f4684b5e5b76c9", "Base");
    add("0xff00000000000000000000000000000000000010", "OP Mainnet");
    add("0x49277ee36a024120ee218127354c4a3591dc90a9", "OP Mainnet");
    add("0xff00000000000000000000000000000000000130", "Unichain");
    add("0x2f60a5184c63ca94f82a27100643dbabe4f3f7fd", "Unichain");
    add("0xff00000000000000000000000000000000004000", "Lisk");
    add("0xff00000000000000000000000000000000081457", "Blast");
    add("0x415c8893d514f9bc5211d36eeda4183226b84aa7", "Blast");
    add("0xff00000000000000000000000000000000011000", "Mode");
    add("0xff00000000000000000000000000000000060900", "Zora");
    add("0x625726c858dbf78c0125436c943bf4b4be9d9033", "Zora");
    add("0x705623d3985cf88e5a69fc99ca7d089063449902", "Pegglecoin");
    add("0xff00000000000000000000000000000000042069", "Pegglecoin");
    add("0xff00000000000000000000000000000000000480", "World Chain");
    add("0xdbbe3d8c2d2b22a2611c5a94a9a12c2fcd49eb29", "World Chain");
    add("0xff00000000000000000000000000000000002000", "Fraxtal");
    add("0xff00000000000000000000000000000000012000", "Metal L2");
    add("0xff00000000000000000000000000000000060600", "Cyber");
    add("0xff00000000000000000000000000000000015900", "Ink");
    add("0x500d7ea63cf2e501dadaa5feec1fc19fe2aa72ac", "Ink");
    add("0xff00000000000000000000000000000000040100", "Derive");
    add("0x98245d0adf4595c66f0a9db8e13c44cbff6be459", "X Layer");
    add("0x002bde9b0c0857aee2cffdea6b8723eaf5989449", "X Layer");
    add("0x5e70713222faf60c9e9fb69240d06ae6d688563a", "HashKey Chain");
    add("0x0004cb44c80b6fbf8ceb1d80af688c9f7c0b2ab5", "HashKey Chain");
    add("0x47827645ba78eb18c3d64fe2146efde66f74894b", "Arena-Z");
    add("0x00f9bcee08dce4f0e7906c1f6cfb10c77802eed0", "Arena-Z");
    add("0x8839e742fd56ebc0d31d11dd5a2ca25aa61c54da", "Forknet");
    add("0x003fbc27c32dbe174a7bb1efdd49da79c6ea1774", "Forknet");
    add("0x12ad349e5d72b582856290736e0f13fe5fa57aa4", "Syndicate Chain");
    add("0x08f9f14ff43e112b18c96f0986f28cb1878f1d11", "BOB");
    add("0x3a75346f81302aac0333fb5dcdd407e12a6cfa83", "BOB");
    add("0x7ab7da0c3117d7dfe0abfaa8d8d33883f8477c74", "DeBank Chain");
    add("0xff00000000000000000000000000000020240603", "DeBank Chain");
    add("0x6776be80dbada6a02b5f2095cf13734ac303b8d1", "Soneium");
    add("0x4b2d036d2c27192549ad5a2f2d9875e1843833de", "Abstract");
    add("0x65115c6d23274e0a29a63b69130efe901aa52e7a", "Hemi");
    add("0x1ffda89c755f6d4af069897d77ccabb580fd412a", "Katana");
    // Arbitrum
    add("0x1c479675ad559dc151f6ec7ed3fbf8cee79582b6", "Arbitrum One");
    add("0xc1b634853cb333d3ad8663715b08f41a3aec47cc", "Arbitrum One");
    add("0x51ce04be214b38861890e7064c1db1202166edf0", "Arbitrum Nova");
    add("0xb80e953f51e3ee52dc9a00b5f1a2c8a5f5735c3e", "Arbitrum One");
    // zkSync / Starknet / Linea / Scroll / Taiko / Mantle / Polygon / Celo
    add("0xbb80f5e9b75ba0c04e8560194b4500a4eb0decae", "zkSync Era");
    add("0xa9232040bf0e0aea2578a5b2243f2916dbfc0a69", "zkSync Era");
    add("0xde1709b46e1e0786a27c3afb41d5d2a0f9ff6ef3", "zkSync Era");
    add("0x8453957136a1f1fd053161a9cb221206f66d58ab", "Starknet");
    add("0x2c169dfe5fbba12957bdd0ba47d9cedbfe260ca7", "Starknet");
    add("0xd19d4b5d358258f05be33b186d6e83e942f0bfb7", "Linea");
    add("0x46d2f319fd42165d4318f099e143dea8124e9e3e", "Linea");
    add("0xa1db05c9e47feb2f18628b295763f49aceb77475", "Scroll");
    add("0x054a47b9e2a22af6c0ce55020238c8fecd7d334b", "Scroll");
    add("0x0b2c63c18a0ef42abe6a2a96b06a93e6c5f5bd72", "Scroll");
    add("0xef6ab30b56ad41b49f9def93d95e86df3c66e31f", "Taiko");
    add("0x000cb000e880a92a8f383d69da2142a969b93de7", "Taiko");
    add("0xcbeb5d484b54498d3893a0c3eb790331962e9e9d", "Taiko");
    add("0x5f62d006c10c009ff50c878cd6157ac861c99990", "Taiko");
    add("0x1a1ec25dc08e98e5e93f1104b5ca0ad82b8bfe46", "Mantle");
    add("0x2f40d796917ffb642bd2e2bdd2c762a5e40fd749", "Mantle");
    add("0x86bbdfe1b8b9a7c29bea6e84e0f2e9ebfb39c137", "Polygon zkEVM");
    add("0xc94c243f8fb37223f3eb2f7961f7072602a51b8b", "Metal L2");
    add("0xaf1e4f6a47af647f87c0ec814d8032c4a4bff145", "Zircuit");
    add("0xff00000000000000000000000000000000048900", "Zircuit");
    add("0x479b7c95b9509e1a834c994fc94e3581aa8a73b9", "Zero Network");
    add("0x90680f0f6d63060fb7a16bdc722a85b992dd5047", "XGA");
    add("0x7f9d9c1bce1062e1077845ea39a0303429600a06", "The Binary Holdings");
    add("0x68d5bbf3a01ecbb47ce38cf64a7d6c0ea618040f", "The Binary Holdings");
    add("0xff00000000000000000000000000000000000624", "The Binary Holdings");
    add("0xbe7f4edb6257b4d2c77293c380f19ce96a4fa41e", "Symbiosis");
    add("0xf854cd5b26bfd73d51236c0122798907ed65b1f2", "Swell Chain");
    add("0xeb18ea5dedee42e7af378991dfeb719d21c17b4c", "Swell Chain");
    add("0x005de5857e38dfd703a1725c0900e9c6f24cbde0", "Swell Chain");
    add("0xde794bec196832474f2f218135bfd0f7ca7fb038", "Swan Chain");
    add("0xff00000000000000000000000000000000000254", "Swan Chain");
    add("0xa9b074b27de97f492f8f07fd7c213400e4ca5391", "SuperSeed");
    add("0x8612014a343089f1ddbacfd42baf4afbf9133593", "SuperSeed");
    add("0x5c53f2ff1030c7fbc0616fd5b8fc6be97aa27e00", "Superlumio");
    add("0xa12cf34001e553dc254d131105364351f5174d75", "Superlumio");
    add("0xf7ca543d652e38692fd12f989eb55b5327ec9a20", "Shape");
    add("0xff00000000000000000000000000000000000360", "Shape");
    add("0xb5bd290ef8ef3840cb866c7a8b7cc9e45fde3ab9", "Codex");
    add("0x9fb23129982c993743eb9bb156af8cc8fa2ac761", "Phala");
    add("0xc70ae19b5feaa5c19f576e621d2bad9771864fe2", "Paradex");
    add("0x6ab0e960911b50f6d14f249782ac12ec3e7584a0", "Morph");
    add("0xae4d46bd9117cb017c5185844699c51107cb28a9", "Metis");
    add("0xa4ed58737fc5c4861c33410c29ecb1e2af29d960", "Boba");
    add("0xf263a0aa8afeaa7d516b596d49d7ba6c0feb102c", "R0AR");
    add("0xff00000000000000000000000000000000193939", "R0AR");
    add("0xff000000000000000000000000000000000000fe", "Kroma");
    add("0x41b2d7cb7e62e0b09a98b1a5a7c4929be0bf54bc", "Kroma");
    add("0xff0000000000000000000000000000000000169",  "Manta Pacific");
    add("0xa98cb1be1e3c98be0e0fdeb4bbbc15a3e3bfae80", "Manta Pacific");
    add("0xff00000000000000000000000000000000033139", "ApeChain");
    add("0x3539791c9e9dec2de21b5f3494b07de6b4c7d2a0", "ApeChain");
    add("0xff000000000000000000000000000000000000b9", "Mint Blockchain");
    add("0xff00000000000000000000000000000888888888", "Ancient8");
    add("0x4cbab69108aa72151edb5c56dcf09b43c6c6f774", "Ancient8");
    add("0xff00000000000000000000000000000000000123", "Orderly Network");
    add("0x4f0eb11b3f2b3ad5a1e5f6cb7fa7f0ce9827e97e", "Orderly Network");
    add("0xff00000000000000000000000000000000008008", "Polynomial");
    add("0xff00000000000000000000000000000000000690", "Redstone");
    add("0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc", "Redstone");
    add("0xff00000000000000000000000000000000002999", "Aevo");
    add("0x8a9ecb34d52d2e4141bd0278730da5d5e8fc2f70", "Aevo");
    add("0xff00000000000000000000000000000000000957", "Lyra");
    add("0xff00000000000000000000000000000000007887", "Kinto");
    add("0xff00000000000000000000000000000666666666", "Degen Chain");
    add("0xff00000000000000000000000000000000111188", "re.al");
    add("0x42f85b3b7ee3ff88f5e28edfe979157da8c15a0a", "re.al");
    add("0xff00000000000000000000000000000000042220", "Celo");
    add("0x1a7e4e63778b4f12a199c062f3efdd288afcbce8", "Celo");

    m
}

/// Resolve a blob tx to its rollup — checks `from` first, then `to`.
pub fn resolve(registry: &HashMap<String, &'static str>, from: &str, to: &str) -> String {
    let from_lc = from.to_lowercase();
    if let Some(&name) = registry.get(&from_lc) {
        return name.to_string();
    }
    if !to.is_empty() {
        let to_lc = to.to_lowercase();
        if let Some(&name) = registry.get(&to_lc) {
            return name.to_string();
        }
    }
    "UNKNOWN".to_string()
}
