-- Seed/refresh rollup address registry in Postgres.
-- Usage:
--   set -a; source .env
--   psql "$DATABASE_URL" -f apps/api/seed_rollup_registry.sql

INSERT INTO rollup_registry (address, rollup_name, chain_id)
VALUES
  ('0x5050f69a9786f081509234f1a7f4684b5e5b76c9', 'Base', NULL),
  ('0xff00000000000000000000000000000000008453', 'Base', '8453'),
  ('0xc1b634853cb333d3ad8663715b08f41a3aec47cc', 'Arbitrum One', NULL),

  ('0x2f60a5184c63ca94f82a27100643dbabe4f3f7fd', 'Unichain', '130'),
  ('0xff00000000000000000000000000000000000130', 'Unichain', '130'),

  ('0x415c8893d514f9bc5211d36eeda4183226b84aa7', 'Blast', '81457'),
  ('0xff00000000000000000000000000000000081457', 'Blast', '81457'),

  ('0x625726c858dbf78c0125436c943bf4b4be9d9033', 'Zora', NULL),
  ('0x98245d0adf4595c66f0a9db8e13c44cbff6be459', 'X Layer', '196'),
  ('0x002bde9b0c0857aee2cffdea6b8723eaf5989449', 'X Layer', '196'),
  ('0x5e70713222faf60c9e9fb69240d06ae6d688563a', 'HashKey Chain', '177'),
  ('0x0004cb44c80b6fbf8ceb1d80af688c9f7c0b2ab5', 'HashKey Chain', '177'),
  ('0x47827645ba78eb18c3d64fe2146efde66f74894b', 'Arena-Z', '7897'),
  ('0x00f9bcee08dce4f0e7906c1f6cfb10c77802eed0', 'Arena-Z', '7897'),
  ('0x8839e742fd56ebc0d31d11dd5a2ca25aa61c54da', 'Forknet', '8338'),
  ('0x003fbc27c32dbe174a7bb1efdd49da79c6ea1774', 'Forknet', '8338'),
  ('0x12ad349e5d72b582856290736e0f13fe5fa57aa4', 'Syndicate Chain', '510'),
  ('0x08f9f14ff43e112b18c96f0986f28cb1878f1d11', 'BOB', '60808'),
  ('0x3a75346f81302aac0333fb5dcdd407e12a6cfa83', 'BOB', '60808'),
  ('0x7ab7da0c3117d7dfe0abfaa8d8d33883f8477c74', 'DeBank Chain', '20240603'),
  ('0xff00000000000000000000000000000020240603', 'DeBank Chain', '20240603'),
  ('0x705623d3985cf88e5a69fc99ca7d089063449902', 'Pegglecoin', '42069'),
  ('0xff00000000000000000000000000000000042069', 'Pegglecoin', '42069'),

  ('0xdbbe3d8c2d2b22a2611c5a94a9a12c2fcd49eb29', 'World Chain', '480'),
  ('0xff00000000000000000000000000000000000480', 'World Chain', '480'),

  ('0xaf1e4f6a47af647f87c0ec814d8032c4a4bff145', 'Zircuit', NULL),
  ('0xff00000000000000000000000000000000048900', 'Zircuit', NULL),

  ('0x479b7c95b9509e1a834c994fc94e3581aa8a73b9', 'Zero Network', NULL),

  ('0x90680f0f6d63060fb7a16bdc722a85b992dd5047', 'XGA', NULL),

  ('0x7f9d9c1bce1062e1077845ea39a0303429600a06', 'The Binary Holdings', NULL),
  ('0x68d5bbf3a01ecbb47ce38cf64a7d6c0ea618040f', 'The Binary Holdings', NULL),
  ('0xff00000000000000000000000000000000000624', 'The Binary Holdings', NULL),

  ('0xbe7f4edb6257b4d2c77293c380f19ce96a4fa41e', 'Symbiosis', NULL),

  ('0x6776be80dbada6a02b5f2095cf13734ac303b8d1', 'Soneium', '1868'),
  ('0x4b2d036d2c27192549ad5a2f2d9875e1843833de', 'Abstract', '2741'),
  ('0xf7ca543d652e38692fd12f989eb55b5327ec9a20', 'Shape', NULL),
  ('0xff00000000000000000000000000000000000360', 'Shape', NULL),
  ('0xb5bd290ef8ef3840cb866c7a8b7cc9e45fde3ab9', 'Codex', NULL),
  ('0x500d7ea63cf2e501dadaa5feec1fc19fe2aa72ac', 'Ink', '57073'),
  ('0xc94c243f8fb37223f3eb2f7961f7072602a51b8b', 'Metal L2', NULL),
  ('0x9fb23129982c993743eb9bb156af8cc8fa2ac761', 'Phala', NULL),
  ('0xc70ae19b5feaa5c19f576e621d2bad9771864fe2', 'Paradex', NULL),
  ('0x6ab0e960911b50f6d14f249782ac12ec3e7584a0', 'Morph', '2818'),
  ('0xae4d46bd9117cb017c5185844699c51107cb28a9', 'Metis', NULL),
  ('0xa4ed58737fc5c4861c33410c29ecb1e2af29d960', 'Boba', NULL),
  ('0xf263a0aa8afeaa7d516b596d49d7ba6c0feb102c', 'R0AR', NULL),
  ('0xff00000000000000000000000000000000193939', 'R0AR', NULL),
  ('0x1ffda89c755f6d4af069897d77ccabb580fd412a', 'Katana', NULL),
  ('0x65115c6d23274e0a29a63b69130efe901aa52e7a', 'Hemi', NULL),
  ('0x2c169dfe5fbba12957bdd0ba47d9cedbfe260ca7', 'Starknet', NULL),
  ('0x2f40d796917ffb642bd2e2bdd2c762a5e40fd749', 'Mantle', '5000'),
  ('0x46d2f319fd42165d4318f099e143dea8124e9e3e', 'Linea', NULL),
  ('0x054a47b9e2a22af6c0ce55020238c8fecd7d334b', 'Scroll', NULL),
  ('0x000cb000e880a92a8f383d69da2142a969b93de7', 'Taiko', NULL),
  ('0xcbeb5d484b54498d3893a0c3eb790331962e9e9d', 'Taiko', NULL),
  ('0x5f62d006c10c009ff50c878cd6157ac861c99990', 'Taiko', NULL),

  ('0xf854cd5b26bfd73d51236c0122798907ed65b1f2', 'Swell Chain', NULL),
  ('0xeb18ea5dedee42e7af378991dfeb719d21c17b4c', 'Swell Chain', NULL),
  ('0x005de5857e38dfd703a1725c0900e9c6f24cbde0', 'Swell Chain', NULL),

  ('0xde794bec196832474f2f218135bfd0f7ca7fb038', 'Swan Chain', '254'),
  ('0xff00000000000000000000000000000000000254', 'Swan Chain', '254'),

  ('0xa9b074b27de97f492f8f07fd7c213400e4ca5391', 'SuperSeed', '5330'),
  ('0x8612014a343089f1ddbacfd42baf4afbf9133593', 'SuperSeed', '5330'),

  ('0x5c53f2ff1030c7fbc0616fd5b8fc6be97aa27e00', 'Superlumio', NULL),
  ('0xa12cf34001e553dc254d131105364351f5174d75', 'Superlumio', NULL)
ON CONFLICT (address)
DO UPDATE SET
  rollup_name = EXCLUDED.rollup_name,
  chain_id = COALESCE(EXCLUDED.chain_id, rollup_registry.chain_id);
