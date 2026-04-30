import postgres from "postgres";

// Singleton pool — reused across hot reloads in dev, one instance in prod.
const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export default sql;
