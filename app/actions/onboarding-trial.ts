"use server";

import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/profile";
import { startTrialSubscription } from "@/lib/billing/trial";
import { isOnboardingPlan } from "@/lib/onboarding/plans";

export type TrialFormState = { error?: string };

export async function startTrial(
  _prev: TrialFormState,
  formData: FormData
): Promise<TrialFormState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Cabinet introuvable." };
  }

  const planRaw = String(formData.get("plan") ?? "");
  if (!isOnboardingPlan(planRaw) || planRaw === "etudiant") {
    return { error: "Plan invalide." };
  }

  const cycleRaw = String(formData.get("cycle") ?? "mensuel");
  const cycle = cycleRaw === "annuel" ? "annuel" : "mensuel";

  try {
    await startTrialSubscription({
      cabinetId: session.profile.cabinetId,
      planId: planRaw,
      cycle,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Impossible de démarrer l'essai.",
    };
  }

  redirect("/app?welcome=trial-started");
}
