import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL est requis (URI Postgres du même projet Supabase que l’auth)."
  );
}

/**
 * En dev, Next.js HMR ré-évalue ce module → on recréerait un client à chaque
 * rebuild et on saturerait vite le pooler Supabase (15 connexions en session).
 * On cache donc le client `postgres` sur `globalThis` pour survivre au HMR.
 */
type Cached = {
  sql: ReturnType<typeof postgres>;
  db: PostgresJsDatabase<typeof schema>;
};

declare global {
  // eslint-disable-next-line no-var
  var __adili_db__: Cached | undefined;
}

function createClient(): Cached {
  // Pooler Supabase : préférer le port **6543** (transaction mode) dans DATABASE_URL
  // pour autoriser plusieurs requêtes parallèles sans saturer le pool session (5432).
  const isTransactionPooler = /:6543\b/.test(url!);
  const sqlClient = postgres(url!, {
    max: isTransactionPooler ? 8 : 1,
    idle_timeout: 10,
    max_lifetime: 60 * 15,
    connect_timeout: 15,
    prepare: false,
  });
  return { sql: sqlClient, db: drizzle(sqlClient, { schema }) };
}

const cached =
  globalThis.__adili_db__ ?? (globalThis.__adili_db__ = createClient());

/** Client Postgres bas niveau (fermer avec `await sql.end()` après les scripts CLI). */
export const sql = cached.sql;
export const db = cached.db;
