import { jsonError, jsonOk } from "@/lib/api/json";
import { requireCabinetOwnerApi } from "@/lib/billing/require-owner";
import { PACK_IA_100 } from "@/lib/billing/constants";
import { formatFcfa } from "@/lib/billing/format";
import {
  createPackPurchasePending,
  grantPackToUser,
} from "@/lib/billing/packs";

export const dynamic = "force-dynamic";

/**
 * Achat pack 100 requêtes — Mobile Money (CinetPay) à brancher.
 * En dev : `BILLING_DEV_GRANT_PACKS=true` accorde le pack immédiatement.
 */
export async function POST() {
  const owner = await requireCabinetOwnerApi();
  if (owner instanceof Response) return owner;
  const session = owner;

  const devGrant = process.env.BILLING_DEV_GRANT_PACKS === "true";

  if (devGrant) {
    const pack = await grantPackToUser({
      userId: session.user.id,
      cabinetId: session.profile.cabinetId,
    });
    return jsonOk({
      granted: true,
      pack,
      message: `Pack de ${PACK_IA_100.quantite} requêtes activé (mode dev).`,
    });
  }

  const payment = await createPackPurchasePending({
    userId: session.user.id,
    cabinetId: session.profile.cabinetId,
  });

  if (
    process.env.CINETPAY_API_KEY &&
    process.env.CINETPAY_SITE_ID
  ) {
    return jsonError(
      "Paiement Mobile Money : intégration CinetPay à finaliser.",
      501,
      { paiementId: payment.id }
    );
  }

  return jsonOk({
    granted: false,
    paiementId: payment.id,
    montant: PACK_IA_100.prixFcfa,
    montantLabel: formatFcfa(PACK_IA_100.prixFcfa),
    message:
      "Paiement Mobile Money bientôt disponible. Contactez support@adili.cloud ou activez BILLING_DEV_GRANT_PACKS en local.",
  });
}
