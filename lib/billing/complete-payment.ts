import { addDays } from "date-fns";
import { eq } from "drizzle-orm";

import { activateSubscription } from "@/lib/billing/activate-subscription";
import { PACK_IA_100 } from "@/lib/billing/constants";
import { markInvoicePaid } from "@/lib/billing/invoices";
import { BUSINESS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { db } from "@/lib/db/client";
import { packsAdditionnels, paiements } from "@/lib/db/schema";

/** Idempotent : active abonnement ou pack selon le paiement. */
export async function completePayment(paiementId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [paiement] = await tx
      .select()
      .from(paiements)
      .where(eq(paiements.id, paiementId))
      .limit(1);

    if (!paiement || paiement.statut === "paye") return;

    await tx
      .update(paiements)
      .set({ statut: "paye", updatedAt: new Date() })
      .where(eq(paiements.id, paiementId));

    await markInvoicePaid(tx, paiementId);

    if (paiement.subscriptionId) {
      await activateSubscription(tx, paiement.subscriptionId);
    }

    if (paiement.metadata && typeof paiement.metadata === "object") {
      const meta = paiement.metadata as { packPurchase?: boolean };
      if (meta.packPurchase && paiement.userId) {
        const [pack] = await tx
          .insert(packsAdditionnels)
          .values({
            userId: paiement.userId,
            cabinetId: paiement.cabinetId,
            typePack: PACK_IA_100.type,
            prixFcfa: PACK_IA_100.prixFcfa,
            quantite: PACK_IA_100.quantite,
            dateExpiration: addDays(new Date(), PACK_IA_100.validiteJours),
            paiementId: paiement.id,
            statut: "actif",
          })
          .returning();
        await tx
          .update(paiements)
          .set({ packId: pack.id })
          .where(eq(paiements.id, paiementId));
      }
    }

    if (paiement.packId) {
      await tx
        .update(packsAdditionnels)
        .set({ statut: "actif", paiementId: paiement.id })
        .where(eq(packsAdditionnels.id, paiement.packId));
    }
  });

  const [paid] = await db
    .select()
    .from(paiements)
    .where(eq(paiements.id, paiementId))
    .limit(1);

  if (paid) {
    await trackServerEvent({
      event_name: BUSINESS_EVENTS.PAYMENT_COMPLETED,
      event_category: "payment",
      user_id: paid.userId ?? undefined,
      cabinet_id: paid.cabinetId ?? undefined,
      properties: {
        amount_fcfa: paid.montantFcfa,
        payment_id: paid.id,
        subscription_id: paid.subscriptionId,
      },
    });

    if (paid.subscriptionId) {
      await trackServerEvent({
        event_name: BUSINESS_EVENTS.SUBSCRIPTION_CREATED,
        event_category: "business",
        user_id: paid.userId ?? undefined,
        cabinet_id: paid.cabinetId ?? undefined,
        properties: { subscription_id: paid.subscriptionId },
      });
    }
  }
}
