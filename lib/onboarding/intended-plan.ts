import type { CurrentProfile } from "@/lib/auth/profile";
import type { OnboardingPlan } from "@/lib/onboarding/plans";
import { isOnboardingPlan } from "@/lib/onboarding/plans";

export function getIntendedPlan(session: CurrentProfile): OnboardingPlan | null {
  const fromProfile = session.profile?.intendedPlan;
  if (fromProfile && isOnboardingPlan(fromProfile)) return fromProfile;

  const meta = session.user.user_metadata?.intended_plan;
  if (typeof meta === "string" && isOnboardingPlan(meta)) return meta;

  return null;
}
