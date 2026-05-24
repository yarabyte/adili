/**
 * Supprime tout le corpus « acte_uniforme » (sources + chunks en cascade).
 *
 * Usage :
 *   npm run purge:actes
 *   npm run purge:actes -- --dry-run
 */
import "./load-env";

import { eq, inArray, sql } from "drizzle-orm";

import { db, sql as pg } from "../lib/db/client";
import { chunks, sources } from "../lib/db/schema";

async function run() {
  const dryRun = process.argv.includes("--dry-run");

  const existing = await db
    .select({
      id: sources.id,
      shortCode: sources.shortCode,
      title: sources.title,
    })
    .from(sources)
    .where(eq(sources.type, "acte_uniforme"));

  if (existing.length === 0) {
    console.log("Aucune source « acte_uniforme » en base.");
    await pg.end({ timeout: 5 });
    return;
  }

  const ids = existing.map((s) => s.id);

  const [chunkCountRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(chunks)
    .where(inArray(chunks.sourceId, ids));

  const chunkCount = Number(chunkCountRow?.n ?? 0);

  console.log(
    dryRun
      ? "Mode dry-run — rien ne sera supprimé.\n"
      : "Suppression du corpus actes uniformes…\n"
  );

  for (const s of existing) {
    console.log(`  · ${s.shortCode} — ${s.title}`);
  }
  console.log(`\n${existing.length} source(s), ${chunkCount} chunk(s).`);

  if (dryRun) {
    await pg.end({ timeout: 5 });
    return;
  }

  const deleted = await db
    .delete(sources)
    .where(eq(sources.type, "acte_uniforme"))
    .returning({ id: sources.id });

  console.log(`\n✅ ${deleted.length} source(s) supprimée(s) (chunks en cascade).`);
  console.log(
    "Prochaine étape : PDF dans corpus/acte-uniformes/, manifeste lib/corpus/actes-uniformes-manifest.json, puis npm run ingest:actes"
  );

  await pg.end({ timeout: 5 });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
