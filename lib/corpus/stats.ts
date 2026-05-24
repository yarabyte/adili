import { unstable_cache } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { chunks, sources } from "@/lib/db/schema";

export type CorpusStats = {
  sources: number;
  chunks: number;
};

export type CorpusBreakdown = {
  ohada: CorpusStats;
  cameroon: CorpusStats;
  total: CorpusStats;
};

async function queryStatsBySourceType(
  type: "acte_uniforme" | "national" | "ccja"
): Promise<CorpusStats> {
  const [row] = await db
    .select({
      sources: sql<number>`count(distinct ${sources.id})::int`,
      chunks: sql<number>`count(${chunks.id})::int`,
    })
    .from(chunks)
    .innerJoin(sources, eq(chunks.sourceId, sources.id))
    .where(eq(sources.type, type));

  return {
    sources: Number(row?.sources ?? 0),
    chunks: Number(row?.chunks ?? 0),
  };
}

/** Un seul scan chunks×sources pour OHADA + national (évite 2 requêtes lourdes). */
async function queryCorpusBreakdown(): Promise<CorpusBreakdown> {
  const [row] = await db
    .select({
      ohadaSources: sql<number>`count(distinct case when ${sources.type} = 'acte_uniforme' then ${sources.id} end)::int`,
      ohadaChunks: sql<number>`count(case when ${sources.type} = 'acte_uniforme' then ${chunks.id} end)::int`,
      cameroonSources: sql<number>`count(distinct case when ${sources.type} = 'national' then ${sources.id} end)::int`,
      cameroonChunks: sql<number>`count(case when ${sources.type} = 'national' then ${chunks.id} end)::int`,
    })
    .from(chunks)
    .innerJoin(sources, eq(chunks.sourceId, sources.id));

  const ohada = {
    sources: Number(row?.ohadaSources ?? 0),
    chunks: Number(row?.ohadaChunks ?? 0),
  };
  const cameroon = {
    sources: Number(row?.cameroonSources ?? 0),
    chunks: Number(row?.cameroonChunks ?? 0),
  };
  return {
    ohada,
    cameroon,
    total: {
      sources: ohada.sources + cameroon.sources,
      chunks: ohada.chunks + cameroon.chunks,
    },
  };
}

/** Comptages actes uniformes OHADA (landing publique). */
export async function getCorpusStats(): Promise<CorpusStats> {
  try {
    return await queryStatsBySourceType("acte_uniforme");
  } catch {
    return { sources: 0, chunks: 0 };
  }
}

/** OHADA + droit national (dashboard, barre d’état). */
export async function getCorpusBreakdown(): Promise<CorpusBreakdown> {
  try {
    return await queryCorpusBreakdown();
  } catch {
    const empty = { sources: 0, chunks: 0 };
    return { ohada: empty, cameroon: empty, total: empty };
  }
}

export const getCorpusStatsCached = unstable_cache(
  getCorpusStats,
  ["adili-corpus-counts"],
  { revalidate: 300, tags: ["corpus-stats"] }
);

export const getCorpusBreakdownCached = unstable_cache(
  getCorpusBreakdown,
  ["adili-corpus-breakdown"],
  { revalidate: 300, tags: ["corpus-stats"] }
);

export function formatCorpusStatsLine(
  stats: CorpusStats,
  opts?: { indexed?: boolean }
): string {
  const texts = stats.sources <= 1 ? "texte" : "textes";
  const extraits = stats.chunks.toLocaleString("fr-FR");
  const suffix = opts?.indexed === false ? "extraits" : "extraits indexés";
  return `${stats.sources} ${texts} · ${extraits} ${suffix}`;
}
