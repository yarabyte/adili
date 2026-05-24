import { Calendar } from "lucide-react";

import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { AdminFilterPills } from "@/components/admin/admin-filter-pills";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { SubscriptionRowActions } from "@/components/admin/subscription-row-actions";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listSubscriptionsForAdmin } from "@/lib/admin/revenue";
import { monthlyRevenueFcfa } from "@/lib/admin/subscription-actions";
import { formatFcfa } from "@/lib/billing/format";

export const metadata = { title: "Abonnements · Admin" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "Tous" },
  { value: "actif", label: "Actifs" },
  { value: "beta_gratuit", label: "Beta" },
  { value: "suspendu", label: "Suspendus" },
  { value: "en_attente_paiement", label: "En attente" },
  { value: "annule", label: "Annulés" },
] as const;

type Props = {
  searchParams: { statut?: string };
};

export default async function AdminSubscriptionsPage({
  searchParams,
}: Props) {
  await requireAdminPage("subscription.view");

  const statut = searchParams.statut || "";
  const rows = await listSubscriptionsForAdmin({
    statut: statut || undefined,
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Abonnements"
        description={`${rows.length} abonnement(s) affiché(s)`}
        actions={
          <AdminFilterPills
            items={FILTERS}
            activeValue={statut}
            baseHref="/admin/subscriptions"
          />
        }
      />

      <ul className="space-y-4">
        {rows.map(({ subscription: s, plan, cabinet }) => {
          const mrr = monthlyRevenueFcfa(s, plan);
          return (
            <li key={s.id}>
              <AdminCard>
                <AdminCardHeader
                  title={cabinet.name}
                  subtitle={`${plan.nom} · ${s.cycle}`}
                  badge={<AdminStatusBadge statut={s.statut} />}
                  meta={
                    <div>
                      <p className="font-medium tabular-nums text-brand-justice">
                        {formatFcfa(mrr)}
                        <span className="text-xs font-normal text-muted-foreground">
                          {" "}
                          / mois
                        </span>
                      </p>
                    </div>
                  }
                />
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    Fin{" "}
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "medium",
                    }).format(s.dateFin)}
                  </span>
                  {s.estBeta && (
                    <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-medium text-sky-800">
                      Beta
                    </span>
                  )}
                  <span className="font-mono text-[10px] opacity-70">
                    {s.id.slice(0, 8)}…
                  </span>
                </div>
                <SubscriptionRowActions
                  subscriptionId={s.id}
                  statut={s.statut}
                />
              </AdminCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
