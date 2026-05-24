import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/json";
import { requireCabinetOwnerApi } from "@/lib/billing/require-owner";
import {
  initiateCinetPayPayment,
  isCinetPayConfigured,
} from "@/lib/billing/cinetpay";
import { PACK_IA_100 } from "@/lib/billing/constants";
import { subscriptionAmount } from "@/lib/billing/subscribe";
import { db } from "@/lib/db/client";
import { paiements, plans, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const Body = z.object({
  subscriptionId: z.string().uuid().optional(),
  packPurchase: z.boolean().optional(),
});

export async function POST(req: Request) {
  const owner = await requireCabinetOwnerApi();
  if (owner instanceof Response) return owner;
  const session = owner;

  if (!isCinetPayConfigured()) {
    return jsonError("Paiement Mobile Money non configuré", 503);
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("Données invalides", 400);
  }

  let montant: number;
  let description: string;
  let subscriptionId: string | null = null;
  let metadata: Record<string, unknown> | undefined;

  if (body.packPurchase) {
    montant = PACK_IA_100.prixFcfa;
    description = `Adili — Pack ${PACK_IA_100.quantite} requêtes IA`;
    metadata = { packPurchase: true };
  } else if (body.subscriptionId) {
    const [row] = await db
      .select({ sub: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.id, body.subscriptionId))
      .limit(1);

    if (!row || row.sub.cabinetId !== session.profile.cabinetId) {
      return jsonError("Abonnement introuvable", 404);
    }

    montant = subscriptionAmount(
      row.plan,
      row.sub.cycle as "mensuel" | "annuel",
      row.sub.prixNegocieFcfa
    );
    description = `Adili — ${row.plan.nom}`;
    subscriptionId = row.sub.id;
  } else {
    return jsonError("subscriptionId ou packPurchase requis", 400);
  }

  const transactionId = `ADL-${Date.now()}-${session.user.id.slice(0, 8)}`;

  const [paiement] = await db
    .insert(paiements)
    .values({
      userId: session.user.id,
      cabinetId: session.profile.cabinetId,
      subscriptionId,
      montantFcfa: montant,
      methode: "mobile_money",
      statut: "en_attente",
      cinetpayTransactionId: transactionId,
      description,
      metadata: metadata ?? null,
    })
    .returning();

  try {
    const cinet = await initiateCinetPayPayment({
      transactionId,
      amount: montant,
      description,
      customerName:
        session.profile.fullName ?? session.user.email ?? "Client",
      customerEmail: session.user.email ?? "",
      customerPhone: session.profile.phone ?? undefined,
    });

    await db
      .update(paiements)
      .set({
        cinetpayPaymentToken: cinet.paymentToken,
        cinetpayPaymentUrl: cinet.paymentUrl,
        updatedAt: new Date(),
      })
      .where(eq(paiements.id, paiement.id));

    return jsonOk({
      paiementId: paiement.id,
      paymentUrl: cinet.paymentUrl,
    });
  } catch (err) {
    await db
      .update(paiements)
      .set({ statut: "echec", updatedAt: new Date() })
      .where(eq(paiements.id, paiement.id));
    return jsonError(
      err instanceof Error ? err.message : "CinetPay indisponible",
      502
    );
  }
}
