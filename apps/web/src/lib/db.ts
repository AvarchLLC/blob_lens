import postgres from "postgres";

const ssl = process.env.DATABASE_URL?.includes("sslmode=require")
  ? { rejectUnauthorized: false }
  : false;

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl,
});

export default sql;
