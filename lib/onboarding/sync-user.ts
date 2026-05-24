import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { isOnboardingPlan } from "@/lib/onboarding/plans";

/** Synchronise `public.users` après auth (metadata Supabase → intended_plan). */
export async function syncUserFromAuthMetadata(user: User) {
  const email = user.email;
  if (!email) return;

  const intendedRaw = user.user_metadata?.intended_plan;
  const intendedPlan =
    typeof intendedRaw === "string" && isOnboardingPlan(intendedRaw)
      ? intendedRaw
      : null;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? null;

  await db
    .insert(users)
    .values({
      id: user.id,
      email,
      fullName,
      intendedPlan,
      role: "avocat",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        ...(fullName ? { fullName } : {}),
        ...(intendedPlan ? { intendedPlan } : {}),
      },
    });
}
