import { createClient } from "@clickhouse/client";

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL ?? "",
  database: "blob_lens",
  username: process.env.CLICKHOUSE_USER ?? "",
  password: process.env.CLICKHOUSE_PASSWORD ?? "",
  request_timeout: 30_000,
  clickhouse_settings: {
    output_format_json_quote_64bit_integers: 0,
  },
});

export default clickhouse;
