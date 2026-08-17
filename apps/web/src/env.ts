import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgresql://postgres:password@localhost:5432/blob_lens"),
    CLICKHOUSE_URL: z.string().url().default("http://localhost:8123"),
    CLICKHOUSE_USER: z.string().min(1).default("default"),
    CLICKHOUSE_PASSWORD: z.string().default(""),
    ALCHEMY_KEY: z.string().optional(),
    BEACON_RPC_URL: z.string().url().optional(),
    WALLET_360_BACKEND_URL: z.string().url().optional(),
    WALLET_360_API_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_MARKET_REFRESH_MS: z.coerce.number().default(12000),
    NEXT_PUBLIC_LEADERBOARD_REFRESH_MS: z.coerce.number().default(30000),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MARKET_REFRESH_MS: process.env.NEXT_PUBLIC_MARKET_REFRESH_MS,
    NEXT_PUBLIC_LEADERBOARD_REFRESH_MS: process.env.NEXT_PUBLIC_LEADERBOARD_REFRESH_MS,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
