import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft,
  Gavel,
  History,
  ShieldAlert,
  UserRound,
  CalendarDays,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseAffaireTabParam } from "@/lib/affaires/detail-tabs";
import { AffaireDetailTabs } from "./affaire-detail-tabs";

import { db } from "@/lib/db/client";
import {
  affaireMembres,
  affaires,
  auditLog,
  clients,
  comptesRendus,
  documents,
  echeances,
  users,
} from "@/lib/db/schema";
import { CORRESPONDANCE_TYPES } from "@/lib/documents/correspondance";
import { recordAffaireView } from "@/lib/affaires/recent-views";
import { getCurrentProfile } from "@/lib/auth/profile";
import { authorize, hasPermission } from "@/lib/permissions/affaires";
import { LABELS_CONTENTIEUX } from "@/lib/constants/types-contentieux";
import {
  STATUTS_AFFAIRE_COLOR,
  STATUTS_AFFAIRE_LABEL,
} from "@/lib/constants/statuts";

import { MembresPanel } from "./membres-panel";
import { HistoriquePanel } from "./historique-panel";
import { ComptesRendusPanel } from "./comptes-rendus-panel";
import { CorrespondancesPanel } from "./correspondances-panel";
import { DocumentsPanel } from "./documents-panel";
import { EcheancesPanel, type EcheanceListItem } from "./echeances-panel";
import { AffaireStatusActions } from "./affaire-status-actions";
import { TabCountBadge } from "./tab-count-badge";
import { listAffaireMembreOptions } from "@/lib/echeances/affaire-members";
import { formatMemberDisplayName } from "@/lib/users/display-name";
import { TYPES_ECHEANCE } from "@/lib/validation/echeances";

const echeanceCreator = alias(users, "echeance_creator");
const echeanceResponsable = alias(users, "echeance_responsable");

export const dynamic = "force-dynamic";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

type Adversaire = { nom: string; qualite?: string | null; conseil?: string | null };

type AffaireSearchParams = {
  tab?: string;
  docCat?: string;
  docStatut?: string;
  docAuteur?: string;
  docPage?: string;
  histPage?: string;
};

export default async function AffaireDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: AffaireSearchParams;
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  const ctx = await authorize(session, params.id, "affaire", "voir");
  if (!ctx) notFound();

  void recordAffaireView(session, params.id, ctx.cabinetId);

  const [row] = await db
    .select({
      id: affaires.id,
      reference: affaires.reference,
      intitule: affaires.intitule,
      typeContentieux: affaires.typeContentieux,
      juridiction: affaires.juridiction,
      adversaires: affaires.adversaires,
      dateOuverture: affaires.dateOuverture,
      statut: affaires.statut,
      confidentialite: affaires.confidentialite,
      createdAt: affaires.createdAt,
      updatedAt: affaires.updatedAt,
      clientId: clients.id,
      clientNom: clients.nom,
      responsableId: users.id,
      responsableNom: users.fullName,
      responsableEmail: users.email,
      responsableTitre: users.titre,
    })
    .from(affaires)
    .innerJoin(clients, eq(affaires.clientId, clients.id))
    .innerJoin(users, eq(affaires.responsableId, users.id))
    .where(eq(affaires.id, params.id))
    .limit(1);
  if (!row) notFound();

  const membres = await db
    .select({
      userId: affaireMembres.userId,
      role: affaireMembres.role,
      addedAt: affaireMembres.addedAt,
      userFullName: users.fullName,
      userEmail: users.email,
      userTitre: users.titre,
    })
    .from(affaireMembres)
    .innerJoin(users, eq(affaireMembres.userId, users.id))
    .where(eq(affaireMembres.affaireId, params.id))
    .orderBy(asc(affaireMembres.addedAt));

  // Membres du cabinet non encore affectés (pour le sélecteur d'ajout)
  const cabinetUsers = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      titre: users.titre,
      role: users.role,
    })
    .from(users)
    .where(eq(users.cabinetId, ctx.cabinetId))
    .orderBy(asc(users.fullName));
  const affectedIds = new Set(membres.map((m) => m.userId));
  const addableUsers = cabinetUsers.filter((u) => !affectedIds.has(u.id));

  const [
    [{ documentCount }],
    [{ comptesRendusCount }],
    [{ correspondancesCount }],
    [{ historiqueCount }],
  ] = await Promise.all([
    db
      .select({ documentCount: sql<number>`count(*)::int` })
      .from(documents)
      .where(
        and(
          eq(documents.affaireId, params.id),
          notInArray(documents.typeDocument, [...CORRESPONDANCE_TYPES])
        )
      ),
    db
      .select({ comptesRendusCount: sql<number>`count(*)::int` })
      .from(comptesRendus)
      .where(eq(comptesRendus.affaireId, params.id)),
    db
      .select({ correspondancesCount: sql<number>`count(*)::int` })
      .from(documents)
      .where(
        and(
          eq(documents.affaireId, params.id),
          inArray(documents.typeDocument, [...CORRESPONDANCE_TYPES])
        )
      ),
    db
      .select({ historiqueCount: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(eq(auditLog.affaireId, params.id)),
  ]);

  const membreOptions = await listAffaireMembreOptions(params.id);
  const defaultResponsableId =
    membreOptions.find((m) => m.userId === session.user.id)?.userId ??
    membreOptions[0]?.userId ??
    "";

  const echeanceRows = await db
    .select({
      id: echeances.id,
      titre: echeances.titre,
      description: echeances.description,
      dateEcheance: echeances.dateEcheance,
      type: echeances.type,
      alerteJ7: echeances.alerteJ7,
      alerteJ2: echeances.alerteJ2,
      alerteJ1: echeances.alerteJ1,
      statut: echeances.statut,
      responsableId: echeances.responsableId,
      createdAt: echeances.createdAt,
      creatorName: echeanceCreator.fullName,
      creatorEmail: echeanceCreator.email,
      creatorTitre: echeanceCreator.titre,
      responsableName: echeanceResponsable.fullName,
      responsableEmail: echeanceResponsable.email,
      responsableTitre: echeanceResponsable.titre,
    })
    .from(echeances)
    .leftJoin(echeanceCreator, eq(echeances.createdBy, echeanceCreator.id))
    .leftJoin(
      echeanceResponsable,
      eq(echeances.responsableId, echeanceResponsable.id)
    )
    .where(eq(echeances.affaireId, params.id))
    .orderBy(asc(echeances.dateEcheance));

  const echeancesList: EcheanceListItem[] = echeanceRows.map((r) => ({
    id: r.id,
    titre: r.titre,
    description: r.description,
    dateEcheance: r.dateEcheance.toISOString(),
    type:
      r.type && (TYPES_ECHEANCE as readonly string[]).includes(r.type)
        ? r.type
        : null,
    alerteJ7: r.alerteJ7,
    alerteJ2: r.alerteJ2,
    alerteJ1: r.alerteJ1,
    statut: r.statut,
    responsableId: r.responsableId,
    responsableLabel: r.responsableName
      ? formatMemberDisplayName(
          r.responsableName,
          r.responsableEmail,
          r.responsableTitre
        )
      : null,
    createdByLabel: r.creatorName
      ? formatMemberDisplayName(
          r.creatorName,
          r.creatorEmail,
          r.creatorTitre
        )
      : r.creatorEmail,
    createdAt: r.createdAt.toISOString(),
  }));

  const canManageStatus =
    ctx.role === "responsable" || ctx.role === "admin_cabinet";
  const canManageMembers =
    ctx.role === "responsable" || ctx.role === "admin_cabinet";

  const adversaires = (row.adversaires ?? []) as Adversaire[];

  return (
    <div className="space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 self-start text-muted-foreground"
      >
        <Link href="/app/affaires">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Toutes les affaires
        </Link>
      </Button>

      <header className="space-y-5 border-b border-brand-justice/10 pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12.5px] font-medium tabular-nums text-brand-justice">
                {row.reference}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STATUTS_AFFAIRE_COLOR[row.statut]}`}
              >
                {STATUTS_AFFAIRE_LABEL[row.statut]}
              </span>
              {row.confidentialite === "sensible" && (
                <span
                  title="Affaire sensible — accès restreint aux membres explicitement ajoutés"
                  className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-200"
                >
                  <ShieldAlert className="h-3 w-3" aria-hidden />
                  Sensible
                </span>
              )}
            </div>
            <h1 className="font-heading text-3xl font-semibold leading-tight text-brand-ink sm:text-4xl">
              {row.intitule}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 text-muted-foreground"
            >
              <Link href={`/app/affaires/${row.id}?tab=historique`}>
                <History className="h-4 w-4" aria-hidden />
                Historique
                <TabCountBadge count={Number(historiqueCount ?? 0)} />
              </Link>
            </Button>
            {canManageStatus && (
              <AffaireStatusActions affaireId={row.id} statut={row.statut} />
            )}
          </div>
        </div>

        <dl className="grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <InfoCell
            icon={Briefcase}
            label="Client"
            value={
              <Link
                href="#"
                className="text-foreground hover:text-brand-justice"
              >
                {row.clientNom}
              </Link>
            }
          />
          <InfoCell
            icon={Gavel}
            label="Juridiction"
            value={row.juridiction ?? <em className="text-muted-foreground/70">Non renseignée</em>}
          />
          <InfoCell
            icon={UserRound}
            label="Responsable"
            value={formatMemberDisplayName(
              row.responsableNom,
              row.responsableEmail,
              row.responsableTitre
            )}
          />
          <InfoCell
            icon={CalendarDays}
            label="Ouverte le"
            value={formatDate(row.dateOuverture)}
          />
        </dl>

        <div className="flex flex-wrap gap-2 text-[12px]">
          <span className="rounded-full border border-brand-justice/15 bg-card px-2.5 py-0.5 uppercase tracking-wider text-muted-foreground">
            {LABELS_CONTENTIEUX[row.typeContentieux]}
          </span>
          {adversaires.length > 0 && (
            <span className="rounded-full border border-brand-justice/15 bg-card px-2.5 py-0.5 uppercase tracking-wider text-muted-foreground">
              {adversaires.length} partie{adversaires.length > 1 ? "s" : ""} adverse{adversaires.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </header>

      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="h-14 animate-pulse rounded-xl bg-muted/60" />
            <div className="min-h-[200px] animate-pulse rounded-xl bg-muted/40" />
          </div>
        }
      >
        <AffaireDetailTabs
          className="space-y-5"
          initialTab={parseAffaireTabParam(searchParams?.tab)}
        >
          <TabsList className="grid w-full grid-cols-2 gap-1 p-1 sm:grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="documents">
              Documents
              <TabCountBadge count={Number(documentCount ?? 0)} />
            </TabsTrigger>
            <TabsTrigger value="comptes_rendus">
              Comptes rendus
              <TabCountBadge count={Number(comptesRendusCount ?? 0)} />
            </TabsTrigger>
            <TabsTrigger value="correspondances">
              Correspondances
              <TabCountBadge count={Number(correspondancesCount ?? 0)} />
            </TabsTrigger>
            <TabsTrigger value="membres">
              Membres
              <TabCountBadge count={membres.length} />
            </TabsTrigger>
            <TabsTrigger value="echeances">
              Échéances
              <TabCountBadge count={echeancesList.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <DocumentsPanel
              affaireId={row.id}
              canCreate={ctx.role !== "lecteur" && ctx.role !== null}
            />
          </TabsContent>

          <TabsContent value="comptes_rendus">
            <ComptesRendusPanel
              affaireId={row.id}
              canCreate={hasPermission(ctx.role, "compte_rendu", "creer")}
            />
          </TabsContent>

          <TabsContent value="correspondances">
            <CorrespondancesPanel
              affaireId={row.id}
              canCreate={ctx.role !== "lecteur" && ctx.role !== null}
            />
          </TabsContent>

          <TabsContent value="membres">
            <MembresPanel
              affaireId={row.id}
              responsableId={row.responsableId}
              membres={membres}
              addableUsers={addableUsers}
              canManage={canManageMembers}
              currentUserId={session.user.id}
              adversaires={adversaires}
            />
          </TabsContent>

          <TabsContent value="echeances">
            <EcheancesPanel
              affaireId={row.id}
              echeances={echeancesList}
              membreOptions={membreOptions}
              defaultResponsableId={defaultResponsableId}
              canCreate={hasPermission(ctx.role, "echeance", "creer")}
              canModify={hasPermission(ctx.role, "echeance", "modifier")}
              canDelete={hasPermission(ctx.role, "echeance", "supprimer")}
            />
          </TabsContent>

          <TabsContent value="historique">
            <HistoriquePanel
              affaireId={row.id}
              page={Math.max(1, parseInt(searchParams?.histPage ?? "1", 10) || 1)}
            />
          </TabsContent>
        </AffaireDetailTabs>
      </Suspense>
    </div>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-brand-justice/10 bg-card px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-justice/70" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </dt>
        <dd className="truncate text-foreground">{value}</dd>
      </div>
    </div>
  );
}
