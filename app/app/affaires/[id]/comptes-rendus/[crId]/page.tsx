import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";

import { CrEditLayout } from "@/components/comptes-rendus/cr-edit-layout";
import { CrEditor } from "@/components/comptes-rendus/cr-editor";
import { CrForm } from "@/components/comptes-rendus/cr-form";
import { CrWorkflowActions } from "@/components/comptes-rendus/cr-workflow-actions";
import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { affaires, comptesRendus } from "@/lib/db/schema";
import { listAffaireMembreOptions } from "@/lib/echeances/affaire-members";
import {
  getEffectiveRole,
  hasPermission,
} from "@/lib/permissions/affaires";
import { canViewCompteRenduDetail } from "@/lib/permissions/comptes-rendus";
import {
  STATUTS_CR_COLOR,
  STATUTS_CR_LABEL,
  type StatutCompteRendu,
} from "@/lib/constants/statuts-compte-rendu";
import { LABELS_CR } from "@/lib/constants/types-comptes-rendus";
import type { AdversaireAffaire } from "@/lib/comptes-rendus/types";
import type {
  DecisionAction,
  Participant,
  PieceRemise,
} from "@/lib/validation/compte-rendu";

export const dynamic = "force-dynamic";

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function CompteRenduDetailPage({
  params,
}: {
  params: Promise<{ id: string; crId: string }>;
}) {
  const { id: affaireId, crId } = await params;

  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    redirect("/connexion?next=/app");
  }

  const [row] = await db
    .select()
    .from(comptesRendus)
    .where(eq(comptesRendus.id, crId))
    .limit(1);
  if (!row || row.affaireId !== affaireId) notFound();

  const [affaire] = await db
    .select({
      id: affaires.id,
      reference: affaires.reference,
      intitule: affaires.intitule,
      responsableId: affaires.responsableId,
      adversaires: affaires.adversaires,
    })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);
  if (!affaire) notFound();

  const ctx = await getEffectiveRole(session, affaireId);
  if (!ctx || !hasPermission(ctx.role, "compte_rendu", "voir")) {
    notFound();
  }

  const canViewDetail = canViewCompteRenduDetail({
    confidentialite: row.confidentialite,
    auteurId: row.auteurId,
    affaireResponsableId: affaire.responsableId,
    userId: session.user.id,
    role: ctx.role,
  });

  if (!canViewDetail) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <Link
          href={`/app/affaires/${affaireId}?tab=comptes_rendus`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Link>
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-6 text-sm">
          Ce compte rendu est confidentiel. Seuls l&apos;auteur, le responsable
          du dossier et les administrateurs du cabinet peuvent consulter son
          contenu.
        </p>
      </div>
    );
  }

  const statut = row.statut as StatutCompteRendu;
  const isAuteur = row.auteurId === session.user.id;
  const canEditMetadata =
    (statut === "brouillon" || statut === "rejete") &&
    (isAuteur || ctx.role === "admin_cabinet");
  const readOnlyEditor =
    statut === "finalise" ||
    statut === "valide" ||
    statut === "en_revue" ||
    (!isAuteur && ctx.role !== "admin_cabinet");

  const membreOptions = await listAffaireMembreOptions(affaireId);
  const adversaires = (affaire.adversaires ?? []) as AdversaireAffaire[];

  const initial = {
    typeCr: row.typeCr,
    titre: row.titre,
    dateEvenement: toDatetimeLocal(row.dateEvenement),
    dureeMinutes: row.dureeMinutes,
    lieu: row.lieu ?? "",
    participants: (row.participants ?? []) as Participant[],
    decisionsActions: (row.decisionsActions ?? []) as DecisionAction[],
    piecesRemises: (row.piecesRemises ?? []) as PieceRemise[],
    soumisValidation: row.soumisValidation,
    confidentialite: row.confidentialite,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-3 border-b border-brand-justice/10 pb-5">
        <Link
          href={`/app/affaires/${affaireId}?tab=comptes_rendus`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {affaire.reference} · Comptes rendus
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUTS_CR_COLOR[statut]}`}
            >
              {STATUTS_CR_LABEL[statut]}
            </span>
            <h1 className="font-heading text-2xl font-semibold text-brand-ink">
              {row.titre}
            </h1>
            <p className="text-sm text-muted-foreground">
              {LABELS_CR[row.typeCr] ?? row.typeCr}
            </p>
          </div>
        </div>
        <CrWorkflowActions
          compteRenduId={crId}
          affaireId={affaireId}
          titre={row.titre}
          statut={statut}
          soumisValidation={row.soumisValidation}
          permissions={{
            canFinaliser: hasPermission(ctx.role, "compte_rendu", "finaliser"),
            canSoumettre: hasPermission(ctx.role, "compte_rendu", "soumettre"),
            canValider: hasPermission(ctx.role, "compte_rendu", "valider"),
            canRejeter: hasPermission(ctx.role, "compte_rendu", "rejeter"),
            canReopen: ctx.role === "admin_cabinet",
            canDelete: hasPermission(ctx.role, "compte_rendu", "supprimer"),
            isAuteur: isAuteur || ctx.role === "admin_cabinet",
          }}
        />
      </header>

      <CrEditLayout>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <CrForm
            mode="edit"
            affaireId={affaireId}
            compteRenduId={crId}
            initial={initial}
            disabled={!canEditMetadata}
            membreOptions={membreOptions}
            adversaires={adversaires}
          />
          <CrEditor
            compteRenduId={crId}
            initialContent={row.corpsTiptap}
            readOnly={readOnlyEditor}
          />
        </div>
      </CrEditLayout>
    </div>
  );
}
