import { cosineDistance, eq } from "drizzle-orm";

import { embed } from "./ai/voyage";
import { db } from "./db/client";
import { chunks, sources } from "./db/schema";
import {
  bayesianMultiplier,
  bayesianPosterior,
  loadChunkRatingStats,
  type ChunkRatingStats,
} from "./ranking";
import {
  lexicalRelevanceScore,
  passesRelevanceGate,
  tokenHitStatsForRow,
} from "./search-relevance";
import {
  distanceToRelevancePercent,
  searchHitSnippetForQuery,
} from "./search-snippet";

export type SearchHit = {
  chunkId: string;
  articleNumber: string | null;
  articleLabel: string | null;
  snippet: string;
  distance: number;
  /** Pertinence cosinus brute, conservée pour transparence dans l'UI. */
  relevancePercent: number;
  source: {
    id: string;
    title: string;
    shortCode: string;
    type: "acte_uniforme" | "ccja" | "national";
  };
  /** Feedback praticiens (re-ranking bayésien). `boost` ∈ [-0.2, +0.2]. */
  rating: {
    count: number;
    mean: number | null;
    /** Posterior bayésien (∈ [1, 5]) après lissage par le prior. */
    posterior: number | null;
    /** Multiplicateur - 1, donc impact en %, ex. 0.12 = +12 %. */
    boost: number;
  };
};

type QueryIntent =
  | "fiscal"
  | "travail"
  | "constitution"
  | "commerce"
  | "penal"
  | "famille_civil"
  | "suretes"
  | "ohada_commercial"
  | "general";

const SURETES_CODES = new Set([
  "AUS-2010",
  "AUS-1997",
  "AUSCGIE-2014",
  "AUSCGIE-1997",
  "AUSCOOP-2010",
]);

const OHADA_COMMERCE_CODES = new Set([
  "AUDCG-2010",
  "AUDCG-1997",
  "AUS-2010",
  "AUS-1997",
  "AUPC-2010",
  "AUPC-1997",
]);

function detectQueryIntent(query: string): QueryIntent {
  if (
    /mariage|mari[ée]s?|divorce|filiation|maire|mairie|c[ée]l[ée]bration|officier\s+d'?état\s+civil|[ée]tat\s+civil|naissance|d[ée]c[èe]s|conjoint|[ée]poux|p[èe]re|m[èe]re|union\s+civile/i.test(
      query
    )
  )
    return "famille_civil";
  if (
    /sûret|suret|hypothèque|gage|nantissement|privilège|auscg|droit des sûretés/i.test(
      query
    )
  )
    return "suretes";
  if (
    /compensation|crédit commercial|compte bancaire|chèque|effet de commerce|banque|débit|crédit\s+unilatéral/i.test(
      query
    )
  )
    return "ohada_commercial";
  if (
    /imp[ôo]t|fiscal|\btva\b|\birpp\b|\bcgi\b|code\s+g[ée]n[ée]ral\s+des\s+imp[ôo]ts|impôt\s+sur/i.test(
      query
    )
  )
    return "fiscal";
  if (
    /travail|salari[ée]|employeur|contrat\s+de\s+travail|licenciement|pr[ée]avis|gr[èe]ve|inspection\s+du\s+travail|ct-cm/i.test(
      query
    )
  )
    return "travail";
  if (
    /constitution|constitutionnel|pr[ée]sident|assembl[ée]e\s+nationale|s[ée]nat|conseil\s+constitutionnel|const-cm|r[ée]vision\s+constitutionnelle/i.test(
      query
    )
  )
    return "constitution";
  if (
    /commerce|commercial|registre\s+de\s+commerce|fonds\s+de\s+commerce|lac-cm|activit[ée]\s+commerciale/i.test(
      query
    )
  )
    return "commerce";
  if (/cp-cm|code\s+p[ée]nal|droit\s+p[ée]nal/i.test(query)) return "penal";
  return "general";
}

function intentSourceBoost(intent: QueryIntent, shortCode: string): number {
  const code = shortCode.toUpperCase();
  switch (intent) {
    case "fiscal":
      return code === "CGI-CM" ? 1.28 : code.includes("CGI") ? 1.12 : 0.94;
    case "travail":
      return code === "CT-CM" ? 1.28 : 0.94;
    case "constitution":
      return code === "CONST-CM" ? 1.32 : 0.9;
    case "commerce":
      return code === "LAC-CM" ? 1.28 : OHADA_COMMERCE_CODES.has(code) ? 1.1 : 0.94;
    case "penal":
      return code === "CP-CM" ? 1.25 : 0.94;
    case "famille_civil":
      if (code === "CGI-CM") return 0.72;
      if (code === "CONST-CM") return 1.26;
      if (code === "CPC-CM") return 1.14;
      if (code === "CT-CM" || code === "LAC-CM") return 0.88;
      return 0.95;
    case "suretes":
      return SURETES_CODES.has(code) ? 1.3 : OHADA_COMMERCE_CODES.has(code) ? 1.05 : 0.92;
    case "ohada_commercial":
      return OHADA_COMMERCE_CODES.has(code) ? 1.22 : code === "LAC-CM" ? 1.08 : 0.94;
    default:
      return 1;
  }
}

function corpusTypeBoost(
  query: string,
  sourceType: "acte_uniforme" | "ccja" | "national"
): number {
  if (
    /ohada|acte\s+uniforme|audcg|aua|aupc|auscg|droit\s+uniforme/i.test(query) &&
    sourceType === "acte_uniforme"
  )
    return 1.06;
  if (/ccja|cour\s+commune/i.test(query) && sourceType === "ccja") return 1.08;
  if (
    /cameroun|national|cp-cm|cgi-cm|const-cm|l[ée]gislation\s+nationale/i.test(
      query
    ) &&
    sourceType === "national"
  )
    return 1.06;
  return 1;
}

/**
 * Contextualisation légère pour l'embedding « query » selon le corpus visé.
 */
function queryTextForEmbedding(userQuery: string): string {
  const t = userQuery.trim();
  const intent = detectQueryIntent(t);
  if (intent === "famille_civil") {
    return `Droit civil et état civil au Cameroun (mariage, famille, mairie, célébration). ${t}`;
  }
  if (intent === "suretes") {
    return `Droit OHADA des sûretés (AUS, AUSCGIE). ${t}`;
  }
  if (intent === "ohada_commercial") {
    return `Droit OHADA commercial et bancaire (AUDCG, compensation, crédit). ${t}`;
  }
  if (intent === "fiscal") {
    return `Droit fiscal de la République du Cameroun (Code général des impôts). ${t}`;
  }
  if (intent === "travail") {
    return `Droit du travail de la République du Cameroun (Code du travail). ${t}`;
  }
  if (intent === "constitution") {
    return `Droit constitutionnel de la République du Cameroun (Constitution). ${t}`;
  }
  if (intent === "commerce") {
    return `Droit commercial national de la République du Cameroun (loi sur l'activité commerciale). ${t}`;
  }
  if (
    /cameroun|cameroon|cp-cm|code\s+p[ée]nal|droit\s+p[ée]nal|l[ée]gislation\s+nationale/i.test(
      t
    )
  ) {
    return `Droit national de la République du Cameroun (codes et lois nationales). ${t}`;
  }
  if (/ohada|acte\s+uniforme|actes\s+uniformes|ccja|audcg|aua|aupc/i.test(t)) {
    return t;
  }
  return `Droit OHADA, actes uniformes et droit camerounais. ${t}`;
}

/**
 * Recherche hybride dans le corpus juridique.
 * Embeddings Voyage (input_type=query), distance cosinus pgvector,
 * re-ranking lexical (articles, codes, termes) + bayésien (notes praticiens).
 */
export async function searchChunks(
  query: string,
  limit = 10
): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const intent = detectQueryIntent(trimmed);

  const [embedding] = await embed([queryTextForEmbedding(trimmed)], "query");
  if (!embedding) return [];

  const distance = cosineDistance(chunks.embedding, embedding);

  const fetchLimit = Math.min(Math.max(limit * 8, 24), 80);

  const rows = await db
    .select({
      chunkId: chunks.id,
      articleNumber: chunks.articleNumber,
      articleLabel: chunks.articleLabel,
      content: chunks.content,
      distance,
      sourceId: sources.id,
      sourceTitle: sources.title,
      sourceShortCode: sources.shortCode,
      sourceType: sources.type,
    })
    .from(chunks)
    .innerJoin(sources, eq(chunks.sourceId, sources.id))
    .orderBy(distance)
    .limit(fetchLimit);

  if (rows.length === 0) return [];

  const ratingStats = await loadChunkRatingStats(rows.map((r) => r.chunkId));

  const rescored = rows
    .map((r) => {
      const stats: ChunkRatingStats | undefined = ratingStats.get(r.chunkId);
      const multiplier = bayesianMultiplier(stats);
      const sourceBoost = intentSourceBoost(intent, r.sourceShortCode);
      const typeBoost = corpusTypeBoost(trimmed, r.sourceType);
      const similarity = Math.max(0, 1 - Number(r.distance));
      const lexicalInput = {
        content: r.content,
        articleNumber: r.articleNumber,
        articleLabel: r.articleLabel,
        sourceShortCode: r.sourceShortCode,
        sourceTitle: r.sourceTitle,
      };
      const lexical = lexicalRelevanceScore(trimmed, lexicalInput);
      const tokenHits = tokenHitStatsForRow(trimmed, lexicalInput);
      const tokenFactor =
        tokenHits.total >= 2 ? 0.4 + 0.6 * tokenHits.coverage : 1;
      const hybridSimilarity = similarity * (1 + lexical * 0.9) * tokenFactor;
      const finalScore = hybridSimilarity * multiplier * sourceBoost * typeBoost;
      return {
        ...r,
        stats,
        multiplier,
        sourceBoost,
        lexical,
        tokenHits,
        similarity,
        finalScore,
      };
    })
    .filter((r) =>
      passesRelevanceGate(r.similarity, r.lexical, r.tokenHits)
    );

  rescored.sort((a, b) => b.finalScore - a.finalScore);

  const seen = new Set<string>();
  const deduped: typeof rescored = [];
  for (const r of rescored) {
    const key = `${r.sourceShortCode}::${r.articleLabel ?? ""}::${r.articleNumber ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
    if (deduped.length >= limit) break;
  }

  return deduped.map((r) => ({
    chunkId: r.chunkId,
    articleNumber: r.articleNumber,
    articleLabel: r.articleLabel,
    snippet: searchHitSnippetForQuery(r.content, trimmed),
    distance: Number(r.distance),
    relevancePercent: distanceToRelevancePercent(Number(r.distance)),
    source: {
      id: r.sourceId,
      title: r.sourceTitle,
      shortCode: r.sourceShortCode,
      type: r.sourceType,
    },
    rating: {
      count: r.stats?.count ?? 0,
      mean: r.stats ? Number(r.stats.mean.toFixed(2)) : null,
      posterior: bayesianPosterior(r.stats),
      boost: Number((r.multiplier - 1).toFixed(3)),
    },
  }));
}
