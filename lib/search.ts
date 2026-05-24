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

/**
 * Contextualisation légère pour l'embedding « query » selon le corpus visé.
 */
function queryTextForEmbedding(userQuery: string): string {
  const t = userQuery.trim();
  if (
    /cameroun|cameroon|cp-cm|code\s+p[ée]nal|droit\s+p[ée]nal|l[ée]gislation\s+nationale/i.test(
      t
    )
  ) {
    return `Droit pénal et législation de la République du Cameroun (Code pénal). ${t}`;
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

  const [embedding] = await embed([queryTextForEmbedding(trimmed)], "query");
  if (!embedding) return [];

  const distance = cosineDistance(chunks.embedding, embedding);

  // Pool de candidats : on en récupère bien plus que `limit` pour laisser de
  // la marge au re-ranking par feedback (un extrait avec 4.5/5 peut remonter
  // de plusieurs positions).
  const fetchLimit = Math.min(Math.max(limit * 6, limit), 60);

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
    })
    .from(chunks)
    .innerJoin(sources, eq(chunks.sourceId, sources.id))
    .orderBy(distance)
    .limit(fetchLimit);

  if (rows.length === 0) return [];

  // 1) Statistiques de notes sur tout le pool de candidats
  const ratingStats = await loadChunkRatingStats(rows.map((r) => r.chunkId));

  // 2) Calcul du score final = similarité cosinus × multiplicateur bayésien
  const rescored = rows.map((r) => {
    const stats: ChunkRatingStats | undefined = ratingStats.get(r.chunkId);
    const multiplier = bayesianMultiplier(stats);
    const similarity = Math.max(0, 1 - Number(r.distance));
    const finalScore = similarity * multiplier;
    return { ...r, stats, multiplier, finalScore };
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
