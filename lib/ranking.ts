import { avg, count, inArray } from "drizzle-orm";

import { db } from "./db/client";
import { searchRatings } from "./db/schema";

export type ChunkRatingStats = {
  count: number;
  mean: number;
};

/**
 * Charge en bloc les statistiques de notation (n, moyenne) pour une liste de
 * chunkIds. Renvoie une `Map` indexée par chunkId. Les chunks sans note
 * n'apparaissent pas dans la Map.
 */
export async function loadChunkRatingStats(
  chunkIds: string[]
): Promise<Map<string, ChunkRatingStats>> {
  const map = new Map<string, ChunkRatingStats>();
  if (chunkIds.length === 0) return map;

  try {
    const rows = await db
      .select({
        chunkId: searchRatings.chunkId,
        n: count(searchRatings.id),
        mean: avg(searchRatings.rating),
      })
      .from(searchRatings)
      .where(inArray(searchRatings.chunkId, chunkIds))
      .groupBy(searchRatings.chunkId);

    for (const r of rows) {
      const n = Number(r.n);
      const mean = r.mean === null ? NaN : Number(r.mean);
      if (n > 0 && Number.isFinite(mean)) {
        map.set(r.chunkId, { count: n, mean });
      }
    }
  } catch (err) {
    console.error("[ranking] loadChunkRatingStats", err);
  }

  return map;
}

/**
 * Re-ranking bayésien : on lisse la moyenne par un prior (3/5, K=5 phantom
 * votes) pour éviter qu'une seule note 5/5 ou 1/5 ne décale brutalement un
 * extrait. Le résultat est borné dans [-0.2, +0.2] (±20 %).
 */
const PRIOR_MEAN = 3;
const PRIOR_STRENGTH = 5;
const STEP_PER_POINT = 0.1; // +10 % par point au-dessus du prior

/** Multiplicateur dans [0.8, 1.2]. 1.0 quand aucun feedback. */
export function bayesianMultiplier(stats: ChunkRatingStats | undefined): number {
  if (!stats || stats.count === 0) return 1;
  const posterior =
    (stats.count * stats.mean + PRIOR_STRENGTH * PRIOR_MEAN) /
    (stats.count + PRIOR_STRENGTH);
  const boost = (posterior - PRIOR_MEAN) * STEP_PER_POINT;
  return Math.max(0.8, Math.min(1.2, 1 + boost));
}

/** Posterior moyen utilisé pour le multiplicateur (utile pour debug / UI). */
export function bayesianPosterior(stats: ChunkRatingStats | undefined): number | null {
  if (!stats || stats.count === 0) return null;
  return (
    (stats.count * stats.mean + PRIOR_STRENGTH * PRIOR_MEAN) /
    (stats.count + PRIOR_STRENGTH)
  );
}
