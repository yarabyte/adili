import { eq } from "drizzle-orm";

import { jsonOk } from "@/lib/api/json";
import { parseCinetPayWebhook } from "@/lib/billing/cinetpay";
import { completePayment } from "@/lib/billing/complete-payment";
import { db } from "@/lib/db/client";
import { paiements } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonOk({ ok: false, reason: "invalid_json" });
  }

  const parsed = parseCinetPayWebhook(body);
  if (!parsed) {
    return jsonOk({ ok: false, reason: "unparsed" });
  }

  const [paiement] = await db
    .select()
    .from(paiements)
    .where(eq(paiements.cinetpayTransactionId, parsed.transactionId))
    .limit(1);

  if (!paiement) {
    return jsonOk({ ok: false, reason: "not_found" });
  }

  if (paiement.statut === "paye") {
    return jsonOk({ ok: true, idempotent: true });
  }

  const accepted =
    parsed.status === "ACCEPTED" ||
    parsed.status === "00" ||
    parsed.status === "SUCCES";

  if (!accepted) {
    await db
      .update(paiements)
      .set({ statut: "echec", updatedAt: new Date() })
      .where(eq(paiements.id, paiement.id));
    return jsonOk({ ok: true, status: "refused" });
  }

  await completePayment(paiement.id);
  return jsonOk({ ok: true });
}
