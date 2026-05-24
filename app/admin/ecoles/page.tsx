import { asc } from "drizzle-orm";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EcolesAdminForm } from "@/components/admin/ecoles-admin-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { db } from "@/lib/db/client";
import { ecolesEtudiant } from "@/lib/db/schema";

export const metadata = { title: "Écoles · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminEcolesPage() {
  await requireAdminPage();

  const rows = await db
    .select()
    .from(ecolesEtudiant)
    .orderBy(asc(ecolesEtudiant.ordreAffichage), asc(ecolesEtudiant.nom));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Écoles étudiant"
        description="Liste affichée dans le formulaire d'onboarding étudiant."
      />
      <EcolesAdminForm />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="p-3">Nom</th>
              <th className="p-3">Ville</th>
              <th className="p-3">Actif</th>
              <th className="p-3">Ordre</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="p-3 font-medium">{r.nom}</td>
                <td className="p-3 text-muted-foreground">{r.ville ?? "—"}</td>
                <td className="p-3">{r.actif ? "Oui" : "Non"}</td>
                <td className="p-3 tabular-nums">{r.ordreAffichage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
