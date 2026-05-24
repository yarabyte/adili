import { desc, eq } from "drizzle-orm";
import { GraduationCap } from "lucide-react";

import { AdminDecideForm } from "@/components/admin/admin-decide-form";
import { EtudiantJustificatifLink } from "@/components/admin/etudiant-justificatif-link";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { db } from "@/lib/db/client";
import { users, validationsEtudiants } from "@/lib/db/schema";

export const metadata = { title: "Étudiants · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminEtudiantsPage() {
  await requireAdminPage("etudiant_validation.decide");

  const rows = await db
    .select({
      v: validationsEtudiants,
      user: users,
    })
    .from(validationsEtudiants)
    .leftJoin(users, eq(validationsEtudiants.userId, users.id))
    .where(eq(validationsEtudiants.statut, "en_attente"))
    .orderBy(desc(validationsEtudiants.createdAt));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Validations étudiant"
        description={`${rows.length} demande(s) en attente de traitement`}
      />

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={<GraduationCap className="h-7 w-7" />}
          title="Rien à valider"
          description="Les demandes de tarif étudiant avec justificatif apparaîtront ici."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map(({ v, user }) => (
            <li key={v.id}>
              <AdminCard>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">
                    {user?.fullName ?? user?.email ?? "Utilisateur"}
                  </p>
                  <p className="text-sm font-medium text-brand-justice">
                    {v.ecole}
                  </p>
                  {v.numeroEtudiant && (
                    <p className="text-sm text-muted-foreground">
                      N° étudiant : {v.numeroEtudiant}
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  <EtudiantJustificatifLink
                    validationId={v.id}
                    hasFile={Boolean(v.justificatifUrl)}
                  />
                </div>
                <AdminDecideForm
                  actionUrl={`/api/admin/etudiants-validation/${v.id}/decide`}
                  decisions={[
                    { value: "validee", label: "Valider" },
                    { value: "rejetee", label: "Rejeter", variant: "destructive" },
                  ]}
                />
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
