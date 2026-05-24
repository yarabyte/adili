import { jsonError, jsonOk } from "@/lib/api/json";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getActiveSubscriptionForUser } from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentProfile();
  if (!session) {
    return jsonError("Non authentifié", 401);
  }

  const sub = await getActiveSubscriptionForUser(session.user.id);
  if (!sub) {
    return jsonError("Aucun abonnement actif", 404);
  }

  return jsonOk({
    subscription: sub.subscription,
    plan: sub.plan,
  });
}
