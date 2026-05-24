import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/json";
import { requireCabinetOwnerApi } from "@/lib/billing/require-owner";
import {
  createPendingSubscription,
  subscriptionAmount,
} from "@/lib/billing/subscribe";
export const dynamic = "force-dynamic";

const Body = z.object({
  planId: z.enum(["etudiant", "individuel", "cabinet", "grand_cabinet"]),
  cycle: z.enum(["mensuel", "annuel"]),
});

export async function POST(req: Request) {
  const owner = await requireCabinetOwnerApi();
  if (owner instanceof Response) return owner;
  const session = owner;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("Données invalides", 400);
  }

  try {
    const { subscription, plan } = await createPendingSubscription({
      cabinetId: session.profile.cabinetId,
      planId: body.planId,
      cycle: body.cycle,
    });

    const montant = subscriptionAmount(plan, body.cycle);
    const modes = Array.isArray(plan.modesPaiement)
      ? (plan.modesPaiement as string[])
      : [];

    return jsonOk({
      subscriptionId: subscription.id,
      montant,
      modesPaiement: modes,
      plan: { id: plan.id, nom: plan.nom },
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Impossible de créer l'abonnement",
      400
    );
  }
}
