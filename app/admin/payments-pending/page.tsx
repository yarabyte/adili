import { desc, eq } from "drizzle-orm";
import { CheckCircle2, Clock, Landmark } from "lucide-react";

import { ValidateVirementForm } from "@/components/admin/validate-virement-form";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { formatFcfa } from "@/lib/billing/format";
import { db } from "@/lib/db/client";
import { cabinets, paiements, plans, subscriptions } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const metadata = { title: "Virements · Admin Adili" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPendingPage() {
  await requireAdminPage("payment.view");

  const rows = await db
    .select({
      paiement: paiements,
      cabinet: cabinets,
      plan: plans,
    })
    .from(paiements)
    .leftJoin(cabinets, eq(paiements.cabinetId, cabinets.id))
    .leftJoin(subscriptions, eq(paiements.subscriptionId, subscriptions.id))
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(paiements.statut, "en_attente"))
    .orderBy(desc(paiements.createdAt));

  const virements = rows.filter((r) => r.paiement.methode === "virement");
  const avecPreuve = virements.filter((r) => r.paiement.preuveVirementUrl).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Virements en attente"
        description={`${virements.length} virement(s) · ${avecPreuve} avec preuve · ${rows.length} paiement(s) au total`}
      />

      {virements.length === 0 ? (
        <AdminEmptyState
          icon={<Landmark className="h-7 w-7" />}
          title="Aucun virement en attente"
          description="Les nouvelles demandes apparaîtront ici dès qu'un cabinet aura initié un paiement par virement."
        />
      ) : (
        <ul className="space-y-4">
          {virements.map(({ paiement, cabinet, plan }) => {
            const hasProof = Boolean(paiement.preuveVirementUrl);
            return (
              <li key={paiement.id}>
                <AdminCard>
                  <AdminCardHeader
                    title={cabinet?.name ?? "Cabinet"}
                    subtitle={plan?.nom ?? paiement.description}
                    badge={
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                          hasProof
                            ? "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25"
                            : "bg-amber-500/15 text-amber-950 ring-amber-500/25"
                        )}
                      >
                        {hasProof ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Preuve reçue
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Sans preuve
                          </>
                        )}
                      </span>
                    }
                    meta={
                      <p className="font-semibold tabular-nums text-brand-justice">
                        {formatFcfa(paiement.montantFcfa)}
                      </p>
                    }
                  />
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    Réf. {paiement.referenceVirement ?? "—"}
                  </p>
                  {hasProof && (
                    <ValidateVirementForm
                      paiementId={paiement.id}
                      reference={paiement.referenceVirement}
                      montant={paiement.montantFcfa}
                    />
                  )}
                </AdminCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
