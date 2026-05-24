/**
 * Indexe les textes nationaux (droit camerounais, etc.) dans le corpus.
 *
 * Usage :
 *   npm run ingest:national
 *   npm run ingest:national -- --replace   # alias (remplacement automatique par code)
 */
import "./load-env";
import fs from "fs/promises";
import path from "path";
import {
  CORPUS_NATIONAL_DIR,
  DEFAULT_NATIONAL_MANIFEST_PATH,
  loadNationalManifest,
} from "../lib/corpus/national-manifest";
import { ingestPdfSource } from "../lib/corpus/ingest-pdf";
import { replaceNationalSource } from "../lib/corpus/replace-national-source";
import { sql } from "../lib/db/client";

async function run() {
  const manifestPath =
    process.argv.find((a) => a.startsWith("--manifest="))?.slice(11) ??
    DEFAULT_NATIONAL_MANIFEST_PATH;

  try {
    const manifest = await loadNationalManifest(manifestPath);
    console.log(`Manifeste national : ${manifest.documents.length} document(s)`);

    const codes = new Set<string>();
    for (const doc of manifest.documents) {
      const code = doc.code.toUpperCase();
      if (codes.has(code)) {
        throw new Error(`Code dupliqué : ${code}`);
      }
      codes.add(code);
    }

    for (const doc of manifest.documents) {
      const filePath = path.join(CORPUS_NATIONAL_DIR, doc.file);
      try {
        await fs.access(filePath);
      } catch {
        console.warn(`⚠️  Fichier manquant : ${filePath}`);
        continue;
      }

      const code = doc.code.toUpperCase();
      await replaceNationalSource(code);

      try {
        await ingestPdfSource({
          filePath,
          shortCode: code,
          title: doc.title,
          sourceType: "national",
          reference: doc.reference,
          metadata: {
            country: doc.country,
            countryLabel: doc.countryLabel,
            documentKind: doc.documentKind ?? "texte",
          },
        });
      } catch (err) {
        console.error(`\n❌ Erreur ingestion (${doc.file}) :`);
        console.error(err);
      }
    }

    console.log("\n🎉 Ingestion nationale terminée");
    try {
      const { revalidateTag } = await import("next/cache");
      revalidateTag("corpus-stats");
    } catch {
      /* CLI */
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
