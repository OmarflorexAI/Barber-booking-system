import "server-only";
import postgres from "postgres";

/**
 * Direct Postgres connection for the booking engine (database owner role,
 * so RLS does not apply; the engine does its own authorization).
 * One pool per server process; reused across hot reloads in development.
 */
const globalForDb = globalThis as unknown as { __bookingSql?: postgres.Sql };

export function getSql(): postgres.Sql {
  if (!globalForDb.__bookingSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
    // prepare:false keeps us compatible with Supabase's transaction pooler on Vercel.
    globalForDb.__bookingSql = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
  }
  return globalForDb.__bookingSql;
}
