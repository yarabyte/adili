import fs from "fs/promises";
import { PDFParse } from "pdf-parse";

import { embed } from "@/lib/ai/voyage";
import { db } from "@/lib/db/client";
import { chunks, sources } from "@/lib/db/schema";
import { prepareChunkContentForCorpus } from "@/lib/search-snippet";

const EMBEDDING_DIM = 1024;

export type CorpusChunkDraft = {
  articleNumber: string;
  articleLabel: string;
  content: string;
  contentTokens: number;
};

type SourceType = "acte_uniforme" | "ccja" | "national";

export type IngestPdfSourceInput = {
  filePath: string;
  shortCode: string;
  title: string;
  sourceType: SourceType;
  reference?: string;
  metadata?: Record<string, unknown>;
};

export function chunkByArticle(text: string, code: string): CorpusChunkDraft[] {
  const t = text.replace(/\u00a0/g, " ").replace(/\r/g, "\n");
  const articleRegex =
    /(?:Article|Art\.?|ARTICLE)\s*(\d+(?:[\-.]\d+)?|premier|1er|1ᵉʳ)\b\s*[-.:—]?\s*([\s\S]+?)(?=(?:Article|Art\.?|ARTICLE)\s*(?:\d+(?:[\-.]\d+)?|premier|1er|1ᵉʳ)\b|$)/gi;

  const articles: CorpusChunkDraft[] = [];

  let match: RegExpExecArray | null;
  while ((match = articleRegex.exec(t)) !== null) {
    let articleNum = match[1].toLowerCase().replace(/\s+/g, "");
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

export function chunkByFixedSegments(
  text: string,
  code: string,
  segmentSize = 1800,
  step = 1400
): CorpusChunkDraft[] {
  const collapsed = text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (collapsed.length < 80) return [];

  const articles: CorpusChunkDraft[] = [];
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

export async function extractPdfText(buffer: Buffer): Promise<{
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
      `${label}: dimension embedding ${vec.length}, attendu ${EMBEDDING_DIM}.`
    );
  }
}

export async function ingestPdfSource(input: IngestPdfSourceInput) {
  const code = input.shortCode.toUpperCase();
  const title = input.title;
  console.log(`\n📖 Traitement : ${title} (${code})`);

  const buffer = await fs.readFile(input.filePath);
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
    return { sourceId: null, chunkCount: 0 };
  }

  const [source] = await db
    .insert(sources)
    .values({
      type: input.sourceType,
      title,
      shortCode: code,
      reference: input.reference,
      metadata: input.metadata,
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
  return { sourceId: source.id, chunkCount: articleChunks.length };
}
