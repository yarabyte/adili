import type { CurrentProfile } from "@/lib/auth/profile";
import { cabinetHasActiveOrTrial } from "@/lib/billing/subscription";
import { getIntendedPlan } from "@/lib/onboarding/intended-plan";
import { db } from "@/lib/db/client";
import { cabinets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Utilisateur cabinet déjà configuré → accès direct /app sans resolvePostAuthPath complet.
 */
export async function canFastPathToApp(
  session: CurrentProfile
): Promise<boolean> {
  if (getIntendedPlan(session) === "etudiant") return false;

  const profile = session.profile;
  if (!profile?.cabinetId || !profile.fullName?.trim() || !profile.phone?.trim()) {
    return false;
  }

  const [cabinet] = await db
    .select({ ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, profile.cabinetId))
    .limit(1);

  if (!cabinet) return false;
  if (cabinet.ownerId !== session.user.id) return true;

  return cabinetHasActiveOrTrial(profile.cabinetId);
}
