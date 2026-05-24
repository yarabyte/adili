import { and, asc, count, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { aiCalls } from "@/lib/db/schema";

const WINDOW_MS = 60 * 60 * 1000; // 1h

export const SYNTHESIS_PER_HOUR = (() => {
  const raw = process.env.SYNTHESIS_RATE_LIMIT_PER_HOUR;
  const n = raw ? Number(raw) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 1000 ? n : 30;
})();

export class RateLimitError extends Error {
  readonly retryAfterMs: number;
  readonly limit: number;
  constructor(retryAfterMs: number, limit: number) {
    super(
      `Limite de synthèses atteinte (${limit}/heure). Réessayez dans ${Math.max(
        1,
        Math.ceil(retryAfterMs / 60_000)
      )} min.`
    );
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
    this.limit = limit;
  }
}

export type AiCallReservation = {
  callId: string;
  remaining: number;
  limit: number;
};

/**
 * Vérifie la cadence puis réserve un appel `ai_calls` (status='pending').
 * À appeler avant le streaming Anthropic ; `finalizeAiCall` clôture la ligne.
 */
export type AiCallQuotaMeta = {
  feature?: string;
  model?: string;
  quotaVia?: string;
  packId?: string | null;
  depassementGratuit?: boolean;
};

export async function consumeSynthesisLimit(args: {
  userId: string;
  cabinetId?: string | null;
  action?: string;
  query?: string;
  quotaMeta?: AiCallQuotaMeta;
}): Promise<AiCallReservation> {
  const { userId, cabinetId, action = "synthesize", query, quotaMeta } = args;
  const since = new Date(Date.now() - WINDOW_MS);

  const [agg] = await db
    .select({ n: count() })
    .from(aiCalls)
    .where(
      and(
        eq(aiCalls.userId, userId),
        eq(aiCalls.action, action),
        gt(aiCalls.createdAt, since)
      )
    );
  const used = Number(agg?.n ?? 0);

  if (used >= SYNTHESIS_PER_HOUR) {
    const [oldest] = await db
      .select({ ts: aiCalls.createdAt })
      .from(aiCalls)
      .where(
        and(
          eq(aiCalls.userId, userId),
          eq(aiCalls.action, action),
          gt(aiCalls.createdAt, since)
        )
      )
      .orderBy(asc(aiCalls.createdAt))
      .limit(1);

    const retryAfterMs = oldest
      ? Math.max(1_000, oldest.ts.getTime() + WINDOW_MS - Date.now())
      : WINDOW_MS;
    throw new RateLimitError(retryAfterMs, SYNTHESIS_PER_HOUR);
  }

  const [row] = await db
    .insert(aiCalls)
    .values({
      userId,
      cabinetId: cabinetId ?? null,
      action,
      query: query ?? null,
      status: "pending",
      feature: quotaMeta?.feature ?? "recherche_synthese",
      model: quotaMeta?.model ?? null,
      quotaVia: quotaMeta?.quotaVia ?? null,
      packId: quotaMeta?.packId ?? null,
      depassementGratuit: quotaMeta?.depassementGratuit ?? false,
    })
    .returning({ id: aiCalls.id });

  return {
    callId: row.id,
    remaining: Math.max(0, SYNTHESIS_PER_HOUR - used - 1),
    limit: SYNTHESIS_PER_HOUR,
  };
}

export async function finalizeAiCall(
  callId: string,
  data: {
    status: "ok" | "error" | "rate_limited";
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
    meta?: Record<string, unknown>;
    model?: string;
  }
): Promise<void> {
  try {
    await db
      .update(aiCalls)
      .set({
        status: data.status,
        latencyMs: data.latencyMs ?? null,
        tokensIn: data.tokensIn ?? null,
        tokensOut: data.tokensOut ?? null,
        meta: data.meta ?? null,
        model: data.model ?? undefined,
        completedAt: new Date(),
      })
      .where(eq(aiCalls.id, callId));
  } catch (err) {
    console.error("[finalizeAiCall] échec de mise à jour :", err);
  }
}
