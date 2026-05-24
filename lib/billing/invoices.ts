import { eq } from "drizzle-orm";

import { generateInvoiceNumber } from "@/lib/billing/reference";
import { db } from "@/lib/db/client";
import {
  cabinets,
  factures,
  paiements,
  plans,
  subscriptions,
} from "@/lib/db/schema";

const TVA = 19.25;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function createProformaForPayment(
  tx: Tx,
  paiementId: string
): Promise<typeof factures.$inferSelect> {
  const [paiement] = await tx
    .select()
    .from(paiements)
    .where(eq(paiements.id, paiementId))
    .limit(1);

  if (!paiement) throw new Error("Paiement introuvable");

  let planNom = "Abonnement Adili";
  let cycle = "mensuel";
  if (paiement.subscriptionId) {
    const [row] = await tx
      .select({ plan: plans, sub: subscriptions })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.id, paiement.subscriptionId))
      .limit(1);
    if (row) {
      planNom = row.plan.nom;
      cycle = row.sub.cycle;
    }
  }

  const montantHt = Math.round(paiement.montantFcfa / (1 + TVA / 100));
  const numero = generateInvoiceNumber();
  const lignes = [
    {
      description: `${planNom} — ${cycle === "annuel" ? "12 mois" : "1 mois"}`,
      quantite: 1,
      prixUnitaire: montantHt,
      total: montantHt,
    },
  ];

  const [facture] = await tx
    .insert(factures)
    .values({
      numero,
      type: "proforma",
      cabinetId: paiement.cabinetId,
      subscriptionId: paiement.subscriptionId,
      paiementId: paiement.id,
      montantHtFcfa: montantHt,
      tvaPourcent: String(TVA),
      montantTtcFcfa: paiement.montantFcfa,
      lignes,
      dateEmission: new Date().toISOString().slice(0, 10),
      dateEcheance: new Date(Date.now() + 15 * 86400000)
        .toISOString()
        .slice(0, 10),
    })
    .returning();

  await tx
    .update(paiements)
    .set({
      factureProformaUrl: `/app/billing/factures/${facture.id}`,
      updatedAt: new Date(),
    })
    .where(eq(paiements.id, paiementId));

  return facture;
}

export async function markInvoicePaid(
  tx: Tx,
  paiementId: string
): Promise<void> {
  await tx
    .update(factures)
    .set({ datePaiement: new Date().toISOString().slice(0, 10) })
    .where(eq(factures.paiementId, paiementId));
}

export async function getCabinetBillingIdentity(cabinetId: string) {
  const [cabinet] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.id, cabinetId))
    .limit(1);
  return cabinet;
}
