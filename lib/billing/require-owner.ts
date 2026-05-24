import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { jsonError } from "@/lib/api/json";
import {
  getCurrentProfile,
  isCabinetOwner,
  type CurrentProfile,
} from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { cabinets } from "@/lib/db/schema";

export async function getCabinetOwnerStatus(
  session: CurrentProfile
): Promise<boolean> {
  const cabinetId = session.profile?.cabinetId;
  if (!cabinetId) return false;

  const [cabinet] = await db
    .select({ ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, cabinetId))
    .limit(1);

  return Boolean(cabinet && isCabinetOwner(session, cabinet));
}

/** Pages `/app/billing/*` : réservées au propriétaire du cabinet. */
export async function requireCabinetOwnerPage(): Promise<CurrentProfile> {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  const isOwner = await getCabinetOwnerStatus(session);
  if (!isOwner) redirect("/app?erreur=facturation-proprietaire");

  return session;
}

export type CabinetOwnerSession = CurrentProfile & {
  profile: NonNullable<CurrentProfile["profile"]> & { cabinetId: string };
};

/** APIs facturation (souscription, paiements, packs). */
export async function requireCabinetOwnerApi(): Promise<
  CabinetOwnerSession | Response
> {
  const session = await getCurrentProfile();
  const cabinetId = session?.profile?.cabinetId;
  if (!session || !cabinetId) {
    return jsonError("Non authentifié", 401);
  }

  const isOwner = await getCabinetOwnerStatus(session);
  if (!isOwner) {
    return jsonError("Réservé au propriétaire du cabinet", 403);
  }

  return { ...session, profile: { ...session.profile!, cabinetId } };
}
