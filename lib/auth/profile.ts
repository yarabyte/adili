import { eq } from "drizzle-orm";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { db } from "@/lib/db/client";
import { users, type cabinets } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = typeof users.$inferSelect;
export type Cabinet = typeof cabinets.$inferSelect;

export type CurrentProfile = {
  user: User;
  profile: Profile | null;
};

/**
 * Retourne l’utilisateur Supabase courant ainsi que sa ligne `public.users`
 * (créée par le trigger `handle_auth_user_upsert`). `null` si non connecté.
 *
 * `cache()` : une seule exécution par requête serveur (layout + page).
 */
export const getCurrentProfile = cache(
  async (): Promise<CurrentProfile | null> => {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    let profile: Profile | null = null;
    try {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      profile = row ?? null;
    } catch (err) {
      const cause =
        err && typeof err === "object" && "cause" in err ? err.cause : err;
      const message =
        cause && typeof cause === "object" && "message" in cause
          ? String((cause as { message: string }).message)
          : String(err);
      if (message.includes("EMAXCONNSESSION")) {
        console.error(
          "[getCurrentProfile] Pooler session saturé. Fermez les autres `npm run dev` / scripts, ou utilisez l’URI Postgres **directe** `db.*.supabase.co:5432` (sans pooler session) dans DATABASE_URL."
        );
        throw new Error(
          "Trop de connexions vers la base (limite du pooler Supabase). Arrêtez les autres terminaux qui utilisent DATABASE_URL, redémarrez `npm run dev`, ou passez à l’URI Postgres directe dans .env.local."
        );
      }
      throw err;
    }

    return { user, profile };
  }
);

/**
 * Renvoie `true` si l’utilisateur a les droits d’administration sur le
 * cabinet donné (gestion des membres, invitations, paramètres) :
 * - propriétaire du cabinet (`cabinets.ownerId === user.id`), OU
 * - rôle `admin` dans `public.users`.
 *
 * Les rôles `avocat` et `collaborateur` sont en lecture seule.
 */
export function isCabinetAdmin(
  session: CurrentProfile,
  cabinet: Pick<Cabinet, "ownerId">
): boolean {
  if (cabinet.ownerId === session.user.id) return true;
  return session.profile?.role === "admin";
}

/** Propriétaire légal du cabinet (seul habilité à modifier l'identité / logo). */
export function isCabinetOwner(
  session: CurrentProfile,
  cabinet: Pick<Cabinet, "ownerId">
): boolean {
  return cabinet.ownerId === session.user.id;
}
