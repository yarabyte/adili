import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { listSubscriptionsForAdmin } from "@/lib/admin/revenue";
import { monthlyRevenueFcfa } from "@/lib/admin/subscription-actions";
import { jsonOk } from "@/lib/api/json";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi("subscription.view", req);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const statut = url.searchParams.get("statut") ?? undefined;

  const rows = await listSubscriptionsForAdmin({ statut, limit: 200 });

  return jsonOk({
    subscriptions: rows.map((r) => ({
      ...r.subscription,
      planNom: r.plan.nom,
      planId: r.plan.id,
      cabinetNom: r.cabinet.name,
      mrrFcfa: monthlyRevenueFcfa(r.subscription, r.plan),
    })),
  });
}
