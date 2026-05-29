import { jsonError, jsonOk } from "@/lib/api/json";
import { getCurrentProfile } from "@/lib/auth/profile";
import { formatPeriodeFinLabel } from "@/lib/billing/period";
import { getQuotaSummaryCached } from "@/lib/quotas/cached";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentProfile();
  if (!session) {
    return jsonError("Non authentifié", 401);
  }

  const summary = await getQuotaSummaryCached(session.user.id);
  if (!summary) {
    return jsonError("Aucun abonnement actif", 402, { code: "no_subscription" });
  }

  return jsonOk({
    ...summary,
    periodeFinLabel: formatPeriodeFinLabel(summary.periodeFin),
    restantTotal: summary.restantMensuel + summary.packRestant,
  });
}
