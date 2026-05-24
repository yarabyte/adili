import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/json";
import { requireCabinetOwnerApi } from "@/lib/billing/require-owner";
import { createProformaForPayment } from "@/lib/billing/invoices";
import { generateVirementReference } from "@/lib/billing/reference";
import { subscriptionAmount } from "@/lib/billing/subscribe";
import { db } from "@/lib/db/client";
import { paiements, plans, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const Body = z.object({
  subscriptionId: z.string().uuid(),
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

  const [sub] = await db
    .select({ sub: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.id, body.subscriptionId))
    .limit(1);

  if (!sub || sub.sub.cabinetId !== session.profile.cabinetId) {
    return jsonError("Abonnement introuvable", 404);
  }

  const montant = subscriptionAmount(
    sub.plan,
    sub.sub.cycle as "mensuel" | "annuel",
    sub.sub.prixNegocieFcfa
  );

  if (montant <= 0) {
    return jsonError("Montant nul — contactez le support", 400);
  }

  const refVirement = generateVirementReference();

  const result = await db.transaction(async (tx) => {
    const [paiement] = await tx
      .insert(paiements)
      .values({
        cabinetId: session.profile!.cabinetId,
        userId: session.user.id,
        subscriptionId: sub.sub.id,
        montantFcfa: montant,
        methode: "virement",
        statut: "en_attente",
        referenceVirement: refVirement,
        description: `Abonnement ${sub.plan.nom} (${sub.sub.cycle})`,
      })
      .returning();

    const facture = await createProformaForPayment(tx, paiement.id);
    return { paiement, facture };
  });

  return jsonOk({
    reference: refVirement,
    paiementId: result.paiement.id,
    montant,
    factureId: result.facture.id,
    factureNumero: result.facture.numero,
    factureUrl: result.facture.pdfUrl,
    rib: process.env.ADILI_BANK_RIB ?? process.env.LEXAI_BANK_RIB,
    bankName: process.env.ADILI_BANK_NAME ?? process.env.LEXAI_BANK_NAME,
    titulaire:
      process.env.ADILI_BANK_TITULAIRE ?? process.env.LEXAI_BANK_TITULAIRE,
  });
}
