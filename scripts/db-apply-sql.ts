/**
 * Applique un ou plusieurs fichiers SQL "ops" (triggers, RLS, vues…) sur DATABASE_URL.
 * Hors système de migrations Drizzle : on rejoue tout le contenu du fichier en une transaction.
 *
 * Usage :
 *   npm run db:sql lib/db/sql/0001_sync_auth_users.sql [...autres fichiers]
 */
import path from "path";
import fs from "node:fs/promises";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), ".env.local"), override: true });

async function applyFile(sql: postgres.Sql, filePath: string) {
  const abs = path.resolve(filePath);
  const content = await fs.readFile(abs, "utf8");
  process.stdout.write(`→ ${path.relative(process.cwd(), abs)}\n`);
  await sql.begin(async (tx) => {
    await tx.unsafe(content);
  });
  process.stdout.write(`  ✅\n`);
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error(
      "Usage : npm run db:sql -- <fichier.sql> [autres...]"
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant (.env.local).");

  const sql = postgres(url, { max: 1 });
  try {
    for (const f of files) {
      await applyFile(sql, f);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
