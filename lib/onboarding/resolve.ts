import { cache } from "react";
import { eq } from "drizzle-orm";

import type { CurrentProfile } from "@/lib/auth/profile";
import { getCurrentProfile } from "@/lib/auth/profile";
import { cabinetHasActiveOrTrial } from "@/lib/billing/subscription";
import { db } from "@/lib/db/client";
import { cabinets } from "@/lib/db/schema";
import { getIntendedPlan } from "@/lib/onboarding/intended-plan";
import type { OnboardingPlan } from "@/lib/onboarding/plans";
import {
  getLatestStudentValidation,
  isStudentValidationActive,
} from "@/lib/onboarding/student";

async function resolvePostAuthPathImpl(session: CurrentProfile): Promise<string> {
  const intended = getIntendedPlan(session);

  if (intended === "etudiant") {
    const validation = await getLatestStudentValidation(session.user.id);
    if (!validation) return "/onboarding/etudiant";
    if (validation.statut === "en_attente") return "/app/en-attente";
    if (validation.statut === "rejetee") {
      return "/onboarding/etudiant?rejet=1";
    }
    if (!isStudentValidationActive(validation)) {
      return "/onboarding/etudiant?renouvel=1";
    }
    return "/app";
  }

  const cabinetPlan: OnboardingPlan =
    intended === "cabinet" ? "cabinet" : "individuel";

  if (!session.profile?.cabinetId) {
    return `/onboarding/cabinet?plan=${cabinetPlan}`;
  }

  const [cabinet] = await db
    .select({ ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, session.profile.cabinetId))
    .limit(1);

  const isOwner = cabinet?.ownerId === session.user.id;

  if (!isOwner) {
    if (!session.profile.fullName || !session.profile.phone) {
      return "/onboarding/profil";
    }
    return "/app";
  }

  const hasSub = await cabinetHasActiveOrTrial(session.profile.cabinetId);
  if (!hasSub) {
    return `/onboarding/abonnement?plan=${cabinetPlan}`;
  }

  if (!session.profile.fullName || !session.profile.phone) {
    return "/onboarding/profil";
  }

  return "/app";
}

const resolvePostAuthPathCached = cache(async (userId: string) => {
  const session = await getCurrentProfile();
  if (!session || session.user.id !== userId) return "/connexion";
  return resolvePostAuthPathImpl(session);
});

/**
 * Prochaine URL après connexion / inscription (parcours forcé par plan).
 * Dédupliqué par requête (layout + garde d'accès).
 */
export async function resolvePostAuthPath(
  session: CurrentProfile
): Promise<string> {
  return resolvePostAuthPathCached(session.user.id);
}
