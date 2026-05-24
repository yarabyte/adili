export const ONBOARDING_PLANS = [
  "etudiant",
  "individuel",
  "cabinet",
] as const;

export type OnboardingPlan = (typeof ONBOARDING_PLANS)[number];

export function isOnboardingPlan(value: string | null | undefined): value is OnboardingPlan {
  return ONBOARDING_PLANS.includes(value as OnboardingPlan);
}

export function planLabel(plan: OnboardingPlan): string {
  const labels: Record<OnboardingPlan, string> = {
    etudiant: "Étudiant",
    individuel: "Individuel",
    cabinet: "Cabinet",
  };
  return labels[plan];
}

/** Plans acceptés sur /inscription (pas grand_cabinet). */
export function parseInscriptionPlan(
  raw: string | null | undefined
): OnboardingPlan | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  return isOnboardingPlan(v) ? v : null;
}
