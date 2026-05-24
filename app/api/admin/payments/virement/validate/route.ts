import { eq } from "drizzle-orm";
import { z } from "zod";

import { executeAdminAction } from "@/lib/admin/audit-action";
import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { jsonError, jsonOk } from "@/lib/api/json";
import { activateSubscription } from "@/lib/billing/activate-subscription";
import { formatFcfa } from "@/lib/billing/format";
import { markInvoicePaid } from "@/lib/billing/invoices";
import { db } from "@/lib/db/client";
import { paiements, plans, subscriptions, users } from "@/lib/db/schema";
import { paymentConfirmedEmailHtml } from "@/lib/email/templates/billing/payment-confirmed";
import { sendEmail } from "@/lib/email/smtp";

export const dynamic = "force-dynamic";

const Body = z.object({
  paiementId: z.string().uuid(),
  dateConstate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motif: z.string().min(10),
});

export async function POST(req: Request) {
  const auth = await requireAdminApi("payment.validate_virement", req);
  if (auth instanceof Response) return auth;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("Données invalides (motif min. 10 caractères)", 400);
  }

  const [before] = await db
    .select()
    .from(paiements)
    .where(eq(paiements.id, body.paiementId))
    .limit(1);

  if (!before) return jsonError("Paiement introuvable", 404);
  if (before.statut === "paye") {
    return jsonError("Paiement déjà validé", 409);
  }

  try {
    await executeAdminAction({
      admin: auth.admin,
      action: "payment.validate_virement",
      cibleType: "paiement",
      cibleId: body.paiementId,
      motif: body.motif,
      request: req,
      impactFinancierFcfa: before.montantFcfa,
      exec: async (tx) => {
        const [updated] = await tx
          .update(paiements)
          .set({
            statut: "paye",
            dateVirementConstate: body.dateConstate,
            validePar: auth.admin.userId,
            updatedAt: new Date(),
          })
          .where(eq(paiements.id, body.paiementId))
          .returning();

        if (updated.subscriptionId) {
          await activateSubscription(tx, updated.subscriptionId);
        }
        await markInvoicePaid(tx, body.paiementId);

        return { result: updated, etatAvant: before, etatApres: updated };
      },
    });

    if (before.subscriptionId) {
      const [row] = await db
        .select({
          email: users.email,
          fullName: users.fullName,
          plan: plans,
        })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .innerJoin(users, eq(users.cabinetId, subscriptions.cabinetId))
        .where(eq(subscriptions.id, before.subscriptionId))
        .limit(1);

      const to = row?.email;
      if (to) {
        try {
          await sendEmail({
            to,
            subject: "Adili — Paiement confirmé",
            html: paymentConfirmedEmailHtml({
              displayName: row.fullName ?? "Client",
              montantLabel: formatFcfa(before.montantFcfa),
              planNom: row.plan.nom,
              billingUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/app/billing`,
            }),
          });
        } catch (e) {
          console.error("[validate virement] email", e);
        }
      }
    }

    return jsonOk({ ok: true });
  } catch (err) {
    console.error("[admin validate virement]", err);
    return jsonError("Échec de la validation", 500);
  }
}
