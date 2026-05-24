import { desc, eq } from "drizzle-orm";
import { Building2 } from "lucide-react";

import { AdminCard } from "@/components/admin/admin-card";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminFilterPills } from "@/components/admin/admin-filter-pills";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { LeadGrandCabinetTraiterForm } from "@/components/admin/lead-grand-cabinet-traiter-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { db } from "@/lib/db/client";
import { leadsGrandCabinet } from "@/lib/db/schema";

export const metadata = { title: "Leads Grand Cabinet · Admin" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "", label: "Tous" },
  { value: "nouveau", label: "Nouveaux" },
  { value: "traite", label: "Traités" },
] as const;

type PageProps = {
  searchParams?: { statut?: string };
};

export default async function AdminLeadsGrandCabinetPage({
  searchParams,
}: PageProps) {
  await requireAdminPage("lead_grand_cabinet.traiter");

  const statutFilter = searchParams?.statut ?? "";
  const activeFilter =
    FILTERS.some((f) => f.value === statutFilter) ? statutFilter : "";

  const rows = await db
    .select()
    .from(leadsGrandCabinet)
    .where(
      activeFilter
        ? eq(leadsGrandCabinet.statut, activeFilter)
        : undefined
    )
    .orderBy(desc(leadsGrandCabinet.createdAt))
    .limit(100);

  const nouveauxCount = activeFilter
    ? rows.filter((r) => r.statut === "nouveau").length
    : (
        await db
          .select({ id: leadsGrandCabinet.id })
          .from(leadsGrandCabinet)
          .where(eq(leadsGrandCabinet.statut, "nouveau"))
      ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leads Grand Cabinet"
        description={
          activeFilter
            ? `${rows.length} lead(s) — filtre « ${activeFilter} »`
            : `${rows.length} lead(s) récent(s) · ${nouveauxCount} nouveau(x)`
        }
      />

      <AdminFilterPills
        items={FILTERS}
        activeValue={activeFilter}
        baseHref="/admin/leads-grand-cabinet"
      />

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={<Building2 className="h-7 w-7" />}
          title="Aucun lead"
          description={
            activeFilter === "nouveau"
              ? "Tous les leads ont été traités."
              : "Les demandes du formulaire Grand Cabinet apparaîtront ici."
          }
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((l) => (
            <li key={l.id}>
              <AdminCard>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{l.nomCabinet}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.ville} · {l.nombreAvocats} avocat(s)
                    </p>
                  </div>
                  <AdminStatusBadge statut={l.statut} />
                </div>
                <p className="mt-2 text-sm">
                  <a href={`tel:${l.telephone}`} className="text-brand-justice">
                    {l.telephone}
                  </a>
                  {" · "}
                  <a href={`mailto:${l.email}`} className="text-brand-justice">
                    {l.email}
                  </a>
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {l.message}
                </p>
                {l.notesInternes && (
                  <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">Notes : </span>
                    {l.notesInternes}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Reçu le{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(l.createdAt)}
                  {l.statut === "traite" && l.updatedAt > l.createdAt && (
                    <>
                      {" "}
                      · Traité le{" "}
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(l.updatedAt)}
                    </>
                  )}
                </p>
                {l.statut === "nouveau" && (
                  <LeadGrandCabinetTraiterForm leadId={l.id} />
                )}
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
