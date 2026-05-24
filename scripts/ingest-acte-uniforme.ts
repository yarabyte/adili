import "./load-env";
import fs from "fs/promises";
import path from "path";
import { PDFParse } from "pdf-parse";
import { eq } from "drizzle-orm";

import { embed } from "../lib/ai/voyage";
import { db, sql } from "../lib/db/client";
import { chunks, sources } from "../lib/db/schema";
import {
  CORPUS_ACTES_DIR,
  DEFAULT_MANIFEST_PATH,
  loadActesUniformesManifest,
  type ActeManifestEntry,
} from "../lib/corpus/actes-uniformes-manifest";
import { prepareChunkContentForCorpus } from "../lib/search-snippet";

const EMBEDDING_DIM = 1024;

function chunkByArticle(text: string, code: string) {
  const t = text.replace(/\u00a0/g, " ").replace(/\r/g, "\n");
  const articleRegex =
    /(?:Article|Art\.?)\s*(\d+(?:[\-.]\d+)?|premier|1er|1ᵉʳ)\b\s*[:.\-—]?\s*([\s\S]+?)(?=(?:Article|Art\.?)\s*(?:\d+(?:[\-.]\d+)?|premier|1er|1ᵉʳ)\b|$)/gi;

  const articles: {
    articleNumber: string;
    articleLabel: string;
    content: string;
    contentTokens: number;
  }[] = [];

  let match: RegExpExecArray | null;
  while ((match = articleRegex.exec(t)) !== null) {
    let articleNum = match[1].toLowerCase();
    if (articleNum === "premier" || articleNum === "1er" || articleNum === "1ᵉʳ") {
      articleNum = "1";
    }
    const content = match[2].trim();
    if (content.length < 30) continue;

    articles.push({
      articleNumber: articleNum,
      articleLabel: `Art. ${articleNum} ${code}`,
      content: content.slice(0, 2000),
      contentTokens: Math.ceil(content.length / 4),
    });
  }

  return articles;
}

function chunkByFixedSegments(
  text: string,
  code: string,
  segmentSize = 1800,
  step = 1400
) {
  const collapsed = text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (collapsed.length < 80) return [];

  const articles: {
    articleNumber: string;
    articleLabel: string;
    content: string;
    contentTokens: number;
  }[] = [];

  let i = 0;
  let idx = 1;
  while (i < collapsed.length) {
    const slice = collapsed.slice(i, i + segmentSize).trim();
    if (slice.length < 80) break;
    articles.push({
      articleNumber: `s${idx}`,
      articleLabel: `Extrait ${idx} ${code}`,
      content: slice.slice(0, 2000),
      contentTokens: Math.ceil(slice.length / 4),
    });
    idx += 1;
    i += step;
  }

  return articles;
}

async function extractPdfText(buffer: Buffer): Promise<{
  text: string;
  numPages: number;
}> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text, numPages: result.total };
  } finally {
    await parser.destroy();
  }
}

function assertEmbeddingDim(vec: number[], label: string) {
  if (vec.length !== EMBEDDING_DIM) {
    throw new Error(
      `${label}: dimension embedding ${vec.length}, attendu ${EMBEDDING_DIM} — ajuster le schéma ou VOYAGE_EMBEDDING_MODEL.`
    );
  }
}

async function ingestActe(
  filePath: string,
  entry: ActeManifestEntry,
  corpusReference: string
) {
  const code = entry.code.toUpperCase();
  const title = entry.title;
  console.log(`\n📖 Traitement : ${title} (${code})`);

  const buffer = await fs.readFile(filePath);
  const data = await extractPdfText(buffer);
  console.log(`   ${data.numPages} pages, ${data.text.length} chars`);

  let articleChunks = chunkByArticle(data.text, code);
  if (articleChunks.length === 0) {
    console.warn(
      `   ⚠️  Aucun motif « Article … » — découpage par segments (texte brut)`
    );
    articleChunks = chunkByFixedSegments(data.text, code);
  }
  console.log(`   ${articleChunks.length} chunks à indexer`);

  if (articleChunks.length === 0) {
    console.warn(`   ⚠️  Texte trop court ou vide — ignoré`);
    return;
  }

  const [source] = await db
    .insert(sources)
    .values({
      type: "acte_uniforme",
      title,
      shortCode: code,
      reference: entry.reference ?? corpusReference,
    })
    .returning();

  if (!source) {
    throw new Error("Insertion source sans ligne retournée.");
  }

  const BATCH_SIZE = 32;
  for (let i = 0; i < articleChunks.length; i += BATCH_SIZE) {
    const batch = articleChunks.slice(i, i + BATCH_SIZE).map((c) => ({
      ...c,
      content: prepareChunkContentForCorpus(c.content, 2000),
    }));
    const texts = batch.map((c) => `${c.articleLabel}\n${c.content}`);

    const embeddings = await embed(texts, "document");

    if (embeddings.length !== batch.length) {
      throw new Error(
        `Voyage: ${embeddings.length} vecteurs pour ${batch.length} textes`
      );
    }

    embeddings.forEach((vec, idx) =>
      assertEmbeddingDim(vec, `${code} batch @${i + idx}`)
    );

    await db.insert(chunks).values(
      batch.map((c, idx) => ({
        sourceId: source.id,
        articleNumber: c.articleNumber,
        articleLabel: c.articleLabel,
        content: c.content,
        contentTokens: c.contentTokens,
        embedding: embeddings[idx],
      }))
    );

    console.log(
      `   ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(articleChunks.length / BATCH_SIZE)}`
    );
  }

  console.log(`   ✅ ${title} indexé`);
}

async function run() {
  const manifestPath =
    process.argv.find((a) => a.startsWith("--manifest="))?.slice(10) ??
    DEFAULT_MANIFEST_PATH;

  try {
    const manifest = await loadActesUniformesManifest(manifestPath);
    console.log(
      `Manifeste : ${manifest.documents.length} document(s) — réf. ${manifest.reference}`
    );

    const codes = new Set<string>();
    for (const doc of manifest.documents) {
      const code = doc.code.toUpperCase();
      if (codes.has(code)) {
        throw new Error(`Code dupliqué dans le manifeste : ${code}`);
      }
      codes.add(code);
    }

    for (const acte of manifest.documents) {
      const filePath = path.join(CORPUS_ACTES_DIR, acte.file);
      try {
        await fs.access(filePath);
      } catch {
        console.warn(`⚠️  Fichier manquant : ${filePath}`);
        continue;
      }
      try {
        await ingestActe(filePath, acte, manifest.reference);
      } catch (err) {
        console.error(
          `\n❌ Erreur ingestion (${acte.file}) — ce n'est pas un fichier manquant :`
        );
        console.error(err);
      }
    }
    console.log("\n🎉 Ingestion terminée");
    try {
      const { revalidateTag } = await import("next/cache");
      revalidateTag("corpus-stats");
    } catch {
      /* hors contexte Next (CLI) — la landing interroge la base à chaque requête */
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
