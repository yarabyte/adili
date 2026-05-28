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
  distanceToRelevancePercent,
  searchHitSnippet,
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

type QueryIntent = "fiscal" | "travail" | "constitution" | "commerce" | "penal" | "general";

function detectQueryIntent(query: string): QueryIntent {
  if (
    /imp[ôo]t|fiscal|\btva\b|\bis\b|\birpp\b|\bcgi\b|code\s+g[ée]n[ée]ral\s+des\s+imp[ôo]ts/i.test(
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
      return code === "CGI-CM" ? 1.35 : 0.9;
    case "travail":
      return code === "CT-CM" ? 1.35 : 0.9;
    case "constitution":
      return code === "CONST-CM" ? 1.4 : 0.88;
    case "commerce":
      return code === "LAC-CM" ? 1.35 : 0.9;
    case "penal":
      return code === "CP-CM" ? 1.3 : 0.92;
    default:
      return 1;
  }
}

function intentPrimaryShortCode(intent: QueryIntent): string | null {
  switch (intent) {
    case "fiscal":
      return "CGI-CM";
    case "travail":
      return "CT-CM";
    case "constitution":
      return "CONST-CM";
    case "commerce":
      return "LAC-CM";
    case "penal":
      return "CP-CM";
    default:
      return null;
  }
}

/**
 * Contextualisation légère pour l'embedding « query » selon le corpus visé.
 */
function queryTextForEmbedding(userQuery: string): string {
  const t = userQuery.trim();
  const intent = detectQueryIntent(t);
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
 * Recherche sémantique dans le corpus juridique.
 * Embeddings Voyage (input_type=query), distance cosinus pgvector via Drizzle,
 * puis re-ranking bayésien par les notes praticiens (table search_ratings).
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

  // Pool de candidats : on en récupère bien plus que `limit` pour laisser de
  // la marge au re-ranking par feedback (un extrait avec 4.5/5 peut remonter
  // de plusieurs positions).
  const fetchLimit = Math.min(Math.max(limit * 6, limit), 60);
  const primaryShortCode = intentPrimaryShortCode(intent);

  const baseQuery = db
    .select({
      chunkId: chunks.id,
      articleNumber: chunks.articleNumber,
      articleLabel: chunks.articleLabel,
      content: chunks.content,
      distance,
      sourceId: sources.id,
      sourceTitle: sources.title,
      sourceShortCode: sources.shortCode,
    })
    .from(chunks)
    .innerJoin(sources, eq(chunks.sourceId, sources.id));

  const rows = primaryShortCode
    ? await baseQuery
        .where(eq(sources.shortCode, primaryShortCode))
        .orderBy(distance)
        .limit(fetchLimit)
    : await baseQuery.orderBy(distance).limit(fetchLimit);

  if (rows.length === 0) return [];

  // 1) Statistiques de notes sur tout le pool de candidats
  const ratingStats = await loadChunkRatingStats(rows.map((r) => r.chunkId));

  // 2) Calcul du score final = similarité cosinus × multiplicateur bayésien
  const rescored = rows.map((r) => {
    const stats: ChunkRatingStats | undefined = ratingStats.get(r.chunkId);
    const multiplier = bayesianMultiplier(stats);
    const sourceBoost = intentSourceBoost(intent, r.sourceShortCode);
    const similarity = Math.max(0, 1 - Number(r.distance));
    const finalScore = similarity * multiplier * sourceBoost;
    return { ...r, stats, multiplier, sourceBoost, finalScore };
  });

  // 3) Tri descendant par score re-rangé
  rescored.sort((a, b) => b.finalScore - a.finalScore);

  // 4) Dédoublonnage par article puis cap au `limit` demandé
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
    snippet: searchHitSnippet(r.content),
    distance: Number(r.distance),
    relevancePercent: distanceToRelevancePercent(Number(r.distance)),
    source: {
      id: r.sourceId,
      title: r.sourceTitle,
      shortCode: r.sourceShortCode,
    },
    rating: {
      count: r.stats?.count ?? 0,
      mean: r.stats ? Number(r.stats.mean.toFixed(2)) : null,
      posterior: bayesianPosterior(r.stats),
      boost: Number((r.multiplier - 1).toFixed(3)),
    },
  }));
}
