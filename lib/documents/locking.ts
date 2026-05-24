import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";

/**
 * Système de verrou collaboratif sur les documents (1 rédacteur à la fois).
 *
 * Règles (cf. §6 du brief Module Affaires) :
 *   - Verrou pris : `verrou_user_id`, `verrou_acquis_at`.
 *   - Timeout de validité : 2 minutes sans heartbeat → considéré stale et
 *     reprenable par n'importe quel autre utilisateur (auto-takeover).
 *     Le client envoie un heartbeat toutes les 60 s tant que l'onglet est
 *     visible, donc une seule respiration manquée + marge = takeover.
 *   - L'acquisition est atomique (UPDATE conditionnel) pour éviter les
 *     races concurrentes. Si le SELECT puis l'UPDATE rendent un résultat
 *     vide, on rebascule en "denied".
 *   - Heartbeat : appeler `acquireLock` tant que l'utilisateur édite.
 *     Le résultat précise `refreshed=true` quand c'est un simple
 *     rafraîchissement (pas de log audit nécessaire).
 */

export const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 min

export type LockHolder = {
  userId: string;
  fullName: string | null;
  email: string;
};

export type LockAcquireResult =
  | {
      status: "acquired";
      /** true si l'utilisateur détenait déjà le verrou (heartbeat). */
      refreshed: boolean;
      /** true si l'utilisateur a pris la main sur un verrou expiré. */
      staleTakeover: boolean;
      acquiredAt: Date;
    }
  | {
      status: "denied";
      holder: LockHolder;
      since: Date;
      /** true si le verrou est techniquement stale mais qu'on a perdu la course. */
      stale: boolean;
    };

export type CurrentLock =
  | { status: "free" }
  | {
      status: "active" | "stale";
      holder: LockHolder;
      since: Date;
    };

/**
 * Renvoie l'état courant du verrou sans tenter de l'acquérir.
 */
export async function getCurrentLock(
  documentId: string
): Promise<CurrentLock | null> {
  const [row] = await db
    .select({
      verrouUserId: documents.verrouUserId,
      verrouAcquisAt: documents.verrouAcquisAt,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!row) return null;
  if (!row.verrouUserId || !row.verrouAcquisAt) return { status: "free" };

  const [holder] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, row.verrouUserId))
    .limit(1);

  const stale = Date.now() - row.verrouAcquisAt.getTime() > LOCK_TIMEOUT_MS;
  return {
    status: stale ? "stale" : "active",
    holder: {
      userId: row.verrouUserId,
      fullName: holder?.fullName ?? null,
      email: holder?.email ?? "inconnu",
    },
    since: row.verrouAcquisAt,
  };
}

/**
 * Tente d'acquérir (ou de rafraîchir) le verrou sur un document.
 *
 * - Si le document est libre OU déjà détenu par `userId` OU le précédent
 *   verrou est expiré → on prend (UPDATE atomique).
 * - Sinon → "denied" avec les informations du détenteur actuel.
 */
export async function acquireLock(
  documentId: string,
  userId: string
): Promise<LockAcquireResult | null> {
  // 1. Lecture initiale pour calculer l'état et préparer le metadata
  const [current] = await db
    .select({
      verrouUserId: documents.verrouUserId,
      verrouAcquisAt: documents.verrouAcquisAt,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!current) return null;

  const now = Date.now();
  const wasFree = !current.verrouUserId;
  const wasSelf = current.verrouUserId === userId;
  const wasStale =
    !!current.verrouAcquisAt &&
    now - current.verrouAcquisAt.getTime() > LOCK_TIMEOUT_MS;

  // 2. Si verrou actif d'un autre utilisateur (non stale) → denied direct
  if (!wasFree && !wasSelf && !wasStale) {
    return buildDenied(current.verrouUserId!, current.verrouAcquisAt!, false);
  }

  // 3. Acquisition atomique (race-safe). La clause WHERE rejoue exactement
  //    la même éligibilité que ci-dessus, côté SQL.
  const updated = await db
    .update(documents)
    .set({
      verrouUserId: userId,
      verrouAcquisAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, documentId),
        sql`(${documents.verrouUserId} IS NULL
             OR ${documents.verrouUserId} = ${userId}
             OR ${documents.verrouAcquisAt} < now() - interval '2 minutes')`
      )
    )
    .returning({
      verrouAcquisAt: documents.verrouAcquisAt,
    });

  if (updated.length === 0 || !updated[0].verrouAcquisAt) {
    // Course perdue entre SELECT et UPDATE → rebasculer en denied
    const [refetch] = await db
      .select({
        verrouUserId: documents.verrouUserId,
        verrouAcquisAt: documents.verrouAcquisAt,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    if (!refetch || !refetch.verrouUserId || !refetch.verrouAcquisAt) {
      // Verrou ré-libéré entre temps : on n'a juste plus la main, on indique denied générique
      return {
        status: "denied",
        holder: { userId: "?", fullName: null, email: "inconnu" },
        since: new Date(now),
        stale: false,
      };
    }
    return buildDenied(refetch.verrouUserId, refetch.verrouAcquisAt, false);
  }

  return {
    status: "acquired",
    refreshed: wasSelf,
    staleTakeover: !wasFree && !wasSelf && wasStale,
    acquiredAt: updated[0].verrouAcquisAt,
  };
}

/**
 * Libère le verrou si — et seulement si — `userId` le détient encore.
 * Renvoie `true` si une ligne a été modifiée.
 */
export async function releaseLock(
  documentId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .update(documents)
    .set({ verrouUserId: null, verrouAcquisAt: null })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.verrouUserId, userId)
      )
    )
    .returning({ id: documents.id });
  return result.length > 0;
}

/**
 * Libère de force le verrou (admin / opération système : soumission,
 * validation, rejet, suppression). Renvoie `true` si une ligne a été
 * modifiée.
 */
export async function forceReleaseLock(documentId: string): Promise<boolean> {
  const result = await db
    .update(documents)
    .set({ verrouUserId: null, verrouAcquisAt: null })
    .where(eq(documents.id, documentId))
    .returning({ id: documents.id });
  return result.length > 0;
}

// ─── Helpers privés ───────────────────────────────────────────────

async function buildDenied(
  holderId: string,
  since: Date,
  stale: boolean
): Promise<LockAcquireResult> {
  const [holder] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, holderId))
    .limit(1);
  return {
    status: "denied",
    holder: {
      userId: holderId,
      fullName: holder?.fullName ?? null,
      email: holder?.email ?? "inconnu",
    },
    since,
    stale,
  };
}
