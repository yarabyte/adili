import { addDays } from "date-fns";

import { PACK_IA_100 } from "@/lib/billing/constants";
import { db } from "@/lib/db/client";
import { packsAdditionnels, paiements } from "@/lib/db/schema";

export async function grantPackToUser(args: {
  userId: string;
  cabinetId: string | null;
  paiementId?: string;
}) {
  const expires = addDays(new Date(), PACK_IA_100.validiteJours);

  const [pack] = await db
    .insert(packsAdditionnels)
    .values({
      userId: args.userId,
      cabinetId: args.cabinetId,
      typePack: PACK_IA_100.type,
      prixFcfa: PACK_IA_100.prixFcfa,
      quantite: PACK_IA_100.quantite,
      dateExpiration: expires,
      paiementId: args.paiementId ?? null,
      statut: "actif",
    })
    .returning();

  return pack;
}

export async function createPackPurchasePending(args: {
  userId: string;
  cabinetId: string | null;
}) {
  const [payment] = await db
    .insert(paiements)
    .values({
      userId: args.userId,
      cabinetId: args.cabinetId,
      montantFcfa: PACK_IA_100.prixFcfa,
      methode: "mobile_money",
      statut: "en_attente",
      description: `Pack ${PACK_IA_100.quantite} requêtes IA`,
      metadata: { packPurchase: true },
    })
    .returning();

  return payment;
}
