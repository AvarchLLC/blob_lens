import { env } from "@/env";

/**
 * Utility for querying ClickHouse database with safe error handling.
 */
export async function queryClickHouse<T = any>(sql: string): Promise<T[]> {
  const chUrl = process.env.CLICKHOUSE_URL || env.CLICKHOUSE_URL;
  const chUser = process.env.CLICKHOUSE_USER || env.CLICKHOUSE_USER;
  const chPass = process.env.CLICKHOUSE_PASSWORD || env.CLICKHOUSE_PASSWORD;

  if (!chUrl) {
    throw new Error("CLICKHOUSE_URL environment variable is not defined");
  }

  const url = `${chUrl}/?user=${encodeURIComponent(chUser || "")}&password=${encodeURIComponent(chPass || "")}`;
  
  const res = await fetch(url, {
    method: "POST",
    body: sql.trim() + " FORMAT JSONEachRow",
    headers: { "Content-Type": "text/plain" },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ClickHouse query failed (${res.status}): ${errorText}`);
  }

  const text = await res.text();
  if (!text.trim()) return [];

  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
