import { desc, eq } from "drizzle-orm";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { jsonOk } from "@/lib/api/json";
import { db } from "@/lib/db/client";
import { cabinets, paiements, plans, subscriptions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi("payment.view", req);
  if (auth instanceof Response) return auth;

  const rows = await db
    .select({
      paiement: paiements,
      cabinet: cabinets,
      subscription: subscriptions,
      plan: plans,
    })
    .from(paiements)
    .leftJoin(cabinets, eq(paiements.cabinetId, cabinets.id))
    .leftJoin(subscriptions, eq(paiements.subscriptionId, subscriptions.id))
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(paiements.statut, "en_attente"))
    .orderBy(desc(paiements.createdAt));

  const withPreuve = rows.filter(
    (r) => r.paiement.methode === "virement" && r.paiement.preuveVirementUrl
  );

  return jsonOk({ pending: rows, virementsAValider: withPreuve });
}
