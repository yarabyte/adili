import { z } from "zod";

import {
  ANTHROPIC_MODEL,
  SYNTHESIS_MAX_TOKENS,
  SYNTHESIS_MIN_CHUNK_SCORE,
  SYNTHESIS_TEMPERATURE,
  getAnthropicClient,
} from "@/lib/ai/anthropic";
import {
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserPrompt,
} from "@/lib/ai/prompts";
import {
  RateLimitError,
  consumeSynthesisLimit,
  finalizeAiCall,
} from "@/lib/ai/rate-limit";
import { IA_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { checkAndConsumeQuota } from "@/lib/quotas/check-and-consume";
import type { SearchHit } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ChunkSchema = z.object({
  chunkId: z.string().min(1),
  articleNumber: z.string().nullable().optional(),
  articleLabel: z.string().nullable().optional(),
  snippet: z.string(),
  distance: z.number().optional(),
  relevancePercent: z.number().min(0).max(100),
  source: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    shortCode: z.string().min(1),
  }),
});

const Body = z.object({
  query: z.string().min(3).max(500),
  chunks: z.array(ChunkSchema).min(1).max(15),
});

type ServerEvent =
  | { type: "rate_limit"; remaining: number; limit: number }
  | {
      type: "quota";
      restantMensuel: number;
      quotaMensuel: number;
      packRestant: number;
      via: string;
    }
  | { type: "text"; content: string }
  | { type: "done" }
  | {
      type: "error";
      message: string;
      code?:
        | "unauthenticated"
        | "rate_limited"
        | "quota_exceeded"
        | "subscription_expired"
        | "unavailable"
        | "invalid";
      retryAfterMs?: number;
      details?: Record<string, unknown>;
    };

function ssePayload(obj: ServerEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function errorStream(event: Extract<ServerEvent, { type: "error" }>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(ssePayload(event));
      controller.enqueue(ssePayload({ type: "done" }));
      controller.close();
    },
  });
}

export async function POST(req: Request) {
  // 1) Validation du body
  let parsed: z.infer<typeof Body>;
  try {
    const body = Body.parse(await req.json());
    parsed = {
      ...body,
      chunks: body.chunks.map((c) => ({
        ...c,
        snippet: c.snippet.trim() || "Extrait sans texte affichable.",
      })),
    };
  } catch (err) {
    return sseResponse(
      errorStream({
        type: "error",
        code: "invalid",
        message: `Requête invalide${err instanceof Error ? ` : ${err.message}` : ""}`,
      })
    );
  }

  // 2) Authentification (la synthèse IA consomme du LLM → réservée aux comptes)
  const session = await getCurrentProfile();
  if (!session) {
    return sseResponse(
      errorStream({
        type: "error",
        code: "unauthenticated",
        message:
          "Connectez-vous pour générer la synthèse IA. La recherche reste accessible sans compte.",
      })
    );
  }

  // 3) Filtrage : seuil nominal (50 %) ou, si le meilleur score est plus bas,
  // accepter les extraits proches du meilleur (recherche sémantique souvent ~40–45 %).
  const topScore = Math.max(
    ...parsed.chunks.map((c) => c.relevancePercent),
    0
  );
  const floor = 35;
  const effectiveThreshold = Math.max(
    floor,
    Math.min(SYNTHESIS_MIN_CHUNK_SCORE, topScore)
  );
  const eligible = parsed.chunks.filter(
    (c) => c.relevancePercent >= effectiveThreshold
  ) as SearchHit[];

  if (eligible.length === 0) {
    return sseResponse(
      errorStream({
        type: "error",
        code: "invalid",
        message: `Aucun extrait ne dépasse le seuil de pertinence (${effectiveThreshold} %). Affinez votre requête.`,
      })
    );
  }

  // 4) Quota mensuel (1 action = 1 décrément)
  let quotaCheck;
  try {
    quotaCheck = await checkAndConsumeQuota(
      session.user.id,
      "recherche_synthese"
    );
  } catch (err) {
    console.error("[/api/search/synthesize] quota indisponible :", err);
    return sseResponse(
      errorStream({
        type: "error",
        code: "unavailable",
        message:
          "Le suivi des quotas IA est indisponible. Appliquez la migration `npm run db:billing` puis réessayez.",
      })
    );
  }

  if (!quotaCheck.ok) {
    return sseResponse(
      errorStream({
        type: "error",
        code:
          quotaCheck.raison === "subscription_expired"
            ? "subscription_expired"
            : "quota_exceeded",
        message:
          quotaCheck.raison === "subscription_expired"
            ? "Votre abonnement n'est pas actif. Consultez la facturation pour réactiver l'accès."
            : `Quota IA épuisé (${quotaCheck.details.consomme ?? "?"}/${quotaCheck.details.quota_mensuel ?? "?"} ce mois). Renouvellement le ${quotaCheck.details.reset_date ?? "1er du mois"}.`,
        details: quotaCheck.details,
      })
    );
  }

  // 5) Rate-limit horaire (anti-abus, en plus du quota mensuel)
  let reservation;
  try {
    reservation = await consumeSynthesisLimit({
      userId: session.user.id,
      cabinetId: session.profile?.cabinetId ?? null,
      action: "synthesize",
      query: parsed.query,
      quotaMeta: {
        feature: "recherche_synthese",
        model: ANTHROPIC_MODEL,
        quotaVia: quotaCheck.via,
        packId: quotaCheck.packId ?? null,
        depassementGratuit: quotaCheck.via === "depassement_gratuit",
      },
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return sseResponse(
        errorStream({
          type: "error",
          code: "rate_limited",
          message: err.message,
          retryAfterMs: err.retryAfterMs,
        })
      );
    }
    console.error("[/api/search/synthesize] rate-limit indisponible :", err);
    return sseResponse(
      errorStream({
        type: "error",
        code: "unavailable",
        message:
          "Le suivi des appels IA est indisponible. Appliquez la migration `npm run db:ai-calls` puis réessayez.",
      })
    );
  }

  // 6) Client Anthropic
  let client;
  try {
    client = getAnthropicClient();
  } catch (err) {
    await finalizeAiCall(reservation.callId, {
      status: "error",
      meta: { reason: "anthropic_client_missing" },
    });
    return sseResponse(
      errorStream({
        type: "error",
        code: "unavailable",
        message:
          err instanceof Error ? err.message : "Configuration IA invalide.",
      })
    );
  }

  const userPrompt = buildSynthesisUserPrompt(parsed.query, eligible);
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let tokensIn: number | undefined;
      let tokensOut: number | undefined;
      let finalStatus: "ok" | "error" = "ok";
      let lastError: string | undefined;

      const send = (event: ServerEvent) => {
        try {
          controller.enqueue(ssePayload(event));
        } catch {
          /* connexion fermée côté client */
        }
      };

      send({
        type: "rate_limit",
        remaining: reservation.remaining,
        limit: reservation.limit,
      });
      send({
        type: "quota",
        restantMensuel: Math.max(
          0,
          quotaCheck.quotaMensuel - quotaCheck.consomme
        ),
        quotaMensuel: quotaCheck.quotaMensuel,
        packRestant: quotaCheck.via === "pack" ? quotaCheck.restant : 0,
        via: quotaCheck.via,
      });

      try {
        const completion = await client.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: SYNTHESIS_MAX_TOKENS,
          temperature: SYNTHESIS_TEMPERATURE,
          system: SYNTHESIS_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
          stream: true,
        });

        for await (const event of completion) {
          if (event.type === "message_start") {
            tokensIn = event.message.usage?.input_tokens ?? tokensIn;
            tokensOut = event.message.usage?.output_tokens ?? tokensOut;
          } else if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send({ type: "text", content: event.delta.text });
          } else if (event.type === "message_delta") {
            if (event.usage?.output_tokens != null) {
              tokensOut = event.usage.output_tokens;
            }
          } else if (event.type === "message_stop") {
            break;
          }
        }
        send({ type: "done" });
      } catch (err) {
        console.error("[/api/search/synthesize] erreur stream :", err);
        finalStatus = "error";
        lastError =
          err instanceof Error
            ? err.message
            : "Erreur inattendue pendant la synthèse.";
        send({
          type: "error",
          code: "unavailable",
          message: lastError,
        });
        send({ type: "done" });
      } finally {
        await finalizeAiCall(reservation.callId, {
          status: finalStatus,
          latencyMs: Date.now() - startedAt,
          tokensIn,
          tokensOut,
          model: ANTHROPIC_MODEL,
          meta: {
            model: ANTHROPIC_MODEL,
            quotaVia: quotaCheck.via,
            chunkIds: eligible.map((c) => c.chunkId),
            ...(lastError ? { error: lastError } : {}),
          },
        });
        await trackServerEvent({
          event_name: IA_EVENTS.AI_CALL,
          event_category: "ia",
          user_id: session.user.id,
          cabinet_id: session.profile?.cabinetId ?? undefined,
          properties: {
            success: finalStatus === "ok",
            feature: "recherche_synthese",
            model: ANTHROPIC_MODEL,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
          },
        });
        if (finalStatus === "ok") {
          await trackServerEvent({
            event_name: IA_EVENTS.SYNTHESIS_GENERATED,
            event_category: "ia",
            user_id: session.user.id,
            cabinet_id: session.profile?.cabinetId ?? undefined,
            properties: { query_length: parsed.query.length },
          });
        }
        controller.close();
      }
    },
  });

  return sseResponse(stream);
}
