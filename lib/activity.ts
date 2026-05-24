import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { aiCalls, searches } from "@/lib/db/schema";
import { toDate } from "@/lib/datetime";

export type ActivityItem =
  | {
      kind: "search";
      id: string;
      query: string;
      resultsCount: number | null;
      createdAt: Date;
    }
  | {
      kind: "synthesis";
      id: string;
      query: string | null;
      status: "ok" | "error" | "rate_limited";
      tokensOut: number | null;
      latencyMs: number | null;
      createdAt: Date;
    };

/**
 * Charge l'activité combinée (recherches + synthèses) la plus récente pour un
 * utilisateur. Trié desc par `createdAt`, plafonné à `limit` éléments.
 */
export async function getRecentActivity(
  userId: string,
  limit = 8
): Promise<ActivityItem[]> {
  const fetchSize = Math.max(limit, 12);

  try {
    const [recentSearches, recentSynth] = await Promise.all([
      db
        .select({
          id: searches.id,
          query: searches.query,
          resultsCount: searches.resultsCount,
          createdAt: searches.createdAt,
        })
        .from(searches)
        .where(eq(searches.userId, userId))
        .orderBy(desc(searches.createdAt))
        .limit(fetchSize),
      db
        .select({
          id: aiCalls.id,
          query: aiCalls.query,
          status: aiCalls.status,
          tokensOut: aiCalls.tokensOut,
          latencyMs: aiCalls.latencyMs,
          createdAt: aiCalls.createdAt,
        })
        .from(aiCalls)
        .where(
          and(
            eq(aiCalls.userId, userId),
            eq(aiCalls.action, "synthesize"),
            inArray(aiCalls.status, ["ok", "error", "rate_limited"])
          )
        )
        .orderBy(desc(aiCalls.createdAt))
        .limit(fetchSize),
    ]);

    const merged: ActivityItem[] = [
      ...recentSearches.map((r): ActivityItem => ({
        kind: "search",
        id: r.id,
        query: r.query,
        resultsCount: r.resultsCount ?? null,
        createdAt: toDate(r.createdAt) ?? new Date(),
      })),
      ...recentSynth.map((r): ActivityItem => ({
        kind: "synthesis",
        id: r.id,
        query: r.query,
        status: r.status as "ok" | "error" | "rate_limited",
        tokensOut: r.tokensOut ?? null,
        latencyMs: r.latencyMs ?? null,
        createdAt: toDate(r.createdAt) ?? new Date(),
      })),
    ];

    merged.sort((a, b) => {
      const tb = toDate(b.createdAt)?.getTime() ?? 0;
      const ta = toDate(a.createdAt)?.getTime() ?? 0;
      return tb - ta;
    });
    return merged.slice(0, limit);
  } catch (err) {
    console.error("[activity] getRecentActivity", err);
    return [];
  }
}

/** Format relatif côté serveur : « à l'instant » / « il y a 5 min » / « il y a 2 h » / date courte. */
export function relativeTimeFr(
  date: Date | string,
  now: Date = new Date()
): string {
  const d = toDate(date);
  if (!d) return "—";
  const diffMs = now.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(d);
}
