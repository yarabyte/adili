import { desc, eq } from "drizzle-orm";
import { Rocket } from "lucide-react";

import { AdminCabinetReferencePanel } from "@/components/admin/admin-cabinet-reference";
import { AdminDecideForm } from "@/components/admin/admin-decide-form";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CabinetIdField } from "@/components/admin/cabinet-id-field";
import { listCabinetsForAdmin } from "@/lib/admin/cabinet-reference";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { db } from "@/lib/db/client";
import { candidaturesBeta } from "@/lib/db/schema";

export const metadata = { title: "Candidatures beta · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBetaPage() {
  await requireAdminPage("beta_application.decide");

  const [rows, cabinets] = await Promise.all([
    db
      .select()
      .from(candidaturesBeta)
      .where(eq(candidaturesBeta.statut, "en_revue"))
      .orderBy(desc(candidaturesBeta.createdAt)),
    listCabinetsForAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Avocats pionniers"
        description={`${rows.length} candidature(s) en attente de décision`}
      />

      <AdminCabinetReferencePanel cabinets={cabinets} />

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={<Rocket className="h-7 w-7" />}
          title="Aucune candidature en revue"
          description="Les nouvelles candidatures du programme beta apparaîtront ici."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((c) => (
            <li key={c.id}>
              <AdminCard>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{c.nom}</p>
                  <p className="text-sm text-muted-foreground">{c.email}</p>
                  {c.barreau && (
                    <p className="text-sm text-muted-foreground">{c.barreau}</p>
                  )}
                </div>
                <blockquote className="mt-4 rounded-lg border-l-4 border-brand-gold/60 bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground">
                  {c.motivation}
                </blockquote>
                <AdminDecideForm
                  actionUrl={`/api/admin/beta-applications/${c.id}/decide`}
                  decisions={[
                    { value: "acceptee", label: "Accepter", variant: "default" },
                    {
                      value: "liste_attente",
                      label: "Liste d'attente",
                      variant: "outline",
                    },
                    { value: "rejetee", label: "Rejeter", variant: "destructive" },
                  ]}
                  extraFields={
                    <CabinetIdField
                      inputId={`cabinet-${c.id}`}
                      cabinets={cabinets}
                    />
                  }
                />
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
