/**
 * Ingère un seul texte national (droit camerounais) sans réindexer les autres.
 *
 * Usage (entrée manifeste) :
 *   npm run ingest:national:single -- --code CPC-CM
 *
 * Usage (fichier + métadonnées explicites) :
 *   npm run ingest:national:single -- --file code-civil-camerounais.pdf --code CPC-CM --title "Code de procédure civile…"
 */
import "./load-env";
import fs from "fs/promises";
import path from "path";

import { ingestPdfSource } from "../lib/corpus/ingest-pdf";
import {
  CORPUS_NATIONAL_DIR,
  DEFAULT_NATIONAL_MANIFEST_PATH,
  loadNationalManifest,
} from "../lib/corpus/national-manifest";
import { replaceNationalSource } from "../lib/corpus/replace-national-source";
import { sql } from "../lib/db/client";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1]?.trim() || undefined;
}

async function run() {
  const codeArg = argValue("--code")?.toUpperCase();
  const fileArg = argValue("--file");
  const titleArg = argValue("--title");
  const referenceArg = argValue("--reference");
  const manifestPath = argValue("--manifest") ?? DEFAULT_NATIONAL_MANIFEST_PATH;

  if (!codeArg) {
    console.error(
      "Usage : npm run ingest:national:single -- --code CPC-CM\n" +
        "        (optionnel) --file … --title … --reference …"
    );
    process.exit(1);
  }

  let file: string;
  let title: string;
  let reference: string | undefined;
  let country = "CM";
  let countryLabel = "Cameroun";
  let documentKind: string | undefined;

  if (fileArg && titleArg) {
    file = fileArg;
    title = titleArg;
    reference = referenceArg;
  } else {
    const manifest = await loadNationalManifest(manifestPath);
    const entry = manifest.documents.find(
      (d) => d.code.toUpperCase() === codeArg
    );
    if (!entry) {
      console.error(
        `Code ${codeArg} introuvable dans ${manifestPath}. ` +
          "Ajoutez une entrée au manifeste ou passez --file et --title."
      );
      process.exit(1);
    }
    file = entry.file;
    title = entry.title;
    reference = entry.reference;
    country = entry.country;
    countryLabel = entry.countryLabel;
    documentKind = entry.documentKind;
  }

  const filePath = path.join(CORPUS_NATIONAL_DIR, file);
  try {
    await fs.access(filePath);
  } catch {
    console.error(`Fichier introuvable : ${filePath}`);
    process.exit(1);
  }

  console.log(`Ingestion ciblée : ${title} (${codeArg})`);
  console.log(`   Fichier : ${filePath}`);

  await replaceNationalSource(codeArg);

  try {
    const result = await ingestPdfSource({
      filePath,
      shortCode: codeArg,
      title,
      sourceType: "national",
      reference,
      metadata: {
        country,
        countryLabel,
        documentKind: documentKind ?? "code_procedure_civile",
      },
    });
    console.log(
      `\n✅ Terminé — ${result.chunkCount} chunk(s), source ${result.sourceId ?? "—"}`
    );
    try {
      const { revalidateTag } = await import("next/cache");
      revalidateTag("corpus-stats");
    } catch {
      /* CLI */
    }
  } catch (err) {
    console.error("\n❌ Erreur ingestion :");
    console.error(err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
