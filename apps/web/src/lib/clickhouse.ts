import { createClient } from "@clickhouse/client";

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL ?? "http://100.76.225.2:8123",
  database: "blob_lens",
  username: process.env.CLICKHOUSE_USER ?? "blob_lens",
  password: process.env.CLICKHOUSE_PASSWORD ?? "changeme",
  clickhouse_settings: {
    // Return 64-bit integers as JS numbers (safe for counts in the millions)
    output_format_json_quote_64bit_integers: 0,
  },
});

export default clickhouse;
