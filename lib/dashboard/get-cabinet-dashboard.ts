import "server-only";

import { and, asc, desc, eq, exists, gte, lte, sql } from "drizzle-orm";

import { getRecentAffairesOpened } from "@/lib/affaires/recent-views";
import { toDate } from "@/lib/datetime";
import { formatMemberDisplayName } from "@/lib/users/display-name";
import type { CurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import {
  affaireMembres,
  affaires,
  clients,
  cabinets,
  comptesRendus,
  documents,
  echeances,
  users,
} from "@/lib/db/schema";
import {
  STATUTS_AFFAIRE_LABEL,
  type StatutDocument,
} from "@/lib/constants/statuts";
import { LABELS_DOCUMENTS } from "@/lib/constants/types-documents";
import type { DecisionAction } from "@/lib/validation/compte-rendu";
import { TYPES_ECHEANCE } from "@/lib/validation/echeances";

export type DashboardKpis = {
  totalAffaires: number;
  affairesActives: number;
  piecesEnRevue: number;
  echeancesSemaine: number;
  mesEcheances: number;
};

export type DashboardRecentAffaire = {
  id: string;
  reference: string;
  intitule: string;
  statut: keyof typeof STATUTS_AFFAIRE_LABEL;
  clientNom: string;
  updatedAt: Date;
};

export type DashboardUpcomingEcheance = {
  id: string;
  affaireId: string;
  affaireReference: string;
  affaireIntitule: string;
  titre: string;
  dateEcheance: Date;
  type: (typeof TYPES_ECHEANCE)[number] | null;
  isMine: boolean;
};

export type DashboardPendingDocument = {
  id: string;
  affaireId: string;
  affaireReference: string;
  affaireIntitule: string;
  titre: string;
  statut: StatutDocument;
  typeDocument: string;
  auteurLabel: string | null;
  updatedAt: Date;
};

export type CabinetDashboardData = {
  cabinetName: string | null;
  kpis: DashboardKpis;
  recentAffaires: DashboardRecentAffaire[];
  recentlyOpened: Awaited<ReturnType<typeof getRecentAffairesOpened>>;
  upcomingEcheances: DashboardUpcomingEcheance[];
  pendingDocuments: DashboardPendingDocument[];
  canValidateDocuments: boolean;
};

function parseCrUpcomingActions(
  decisionsActions: unknown
): Array<{ id: string; texte: string; deadline: Date; responsableId?: string }> {
  if (!Array.isArray(decisionsActions)) return [];
  const nowTs = Date.now();
  const items: Array<{ id: string; texte: string; deadline: Date; responsableId?: string }> = [];
  for (const raw of decisionsActions as DecisionAction[]) {
    if (!raw || raw.type !== "action" || raw.fait || !raw.deadline) continue;
    const d = new Date(raw.deadline);
    if (Number.isNaN(d.getTime()) || d.getTime() < nowTs) continue;
    items.push({
      id: raw.id,
      texte: raw.texte?.trim() || "Action de compte rendu",
      deadline: d,
      responsableId: raw.responsable_id,
    });
  }
  return items;
}

function visibleAffairesCondition(session: CurrentProfile) {
  const cabinetId = session.profile!.cabinetId!;
  const explicitMember = exists(
    db
      .select({ x: sql`1` })
      .from(affaireMembres)
      .where(
        and(
          eq(affaireMembres.affaireId, affaires.id),
          eq(affaireMembres.userId, session.user.id)
        )
      )
  );
  return and(
    eq(affaires.cabinetId, cabinetId),
    sql`(${affaires.confidentialite} = 'standard' OR ${explicitMember})`
  );
}

export async function getCabinetDashboard(
  session: CurrentProfile
): Promise<CabinetDashboardData | null> {
  const cabinetId = session.profile?.cabinetId;
  if (!cabinetId) return null;

  const visible = visibleAffairesCondition(session);
  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const canValidateDocuments = session.profile?.role === "admin";

  const [
    kpiRows,
    piecesEnRevueRow,
    recentAffaireRows,
    recentlyOpened,
    upcomingRows,
    crUpcomingRows,
    pendingDocRows,
    mesEcheancesRow,
    echeancesSemaineRow,
    cabinetRow,
  ] = await Promise.all([
    db
      .select({
        statut: affaires.statut,
        n: sql<number>`count(*)::int`,
      })
      .from(affaires)
      .where(visible)
      .groupBy(affaires.statut),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(documents)
      .innerJoin(affaires, eq(documents.affaireId, affaires.id))
      .where(and(visible, eq(documents.statut, "en_revue"))),
    db
      .select({
        id: affaires.id,
        reference: affaires.reference,
        intitule: affaires.intitule,
        statut: affaires.statut,
        updatedAt: affaires.updatedAt,
        clientNom: clients.nom,
      })
      .from(affaires)
      .innerJoin(clients, eq(affaires.clientId, clients.id))
      .where(visible)
      .orderBy(desc(affaires.updatedAt))
      .limit(5),
    getRecentAffairesOpened(session, 4),
    db
      .select({
        id: echeances.id,
        affaireId: echeances.affaireId,
        titre: echeances.titre,
        dateEcheance: echeances.dateEcheance,
        type: echeances.type,
        responsableId: echeances.responsableId,
        reference: affaires.reference,
        intitule: affaires.intitule,
      })
      .from(echeances)
      .innerJoin(affaires, eq(echeances.affaireId, affaires.id))
      .where(
        and(
          visible,
          eq(echeances.statut, "a_venir"),
          gte(echeances.dateEcheance, now)
        )
      )
      .orderBy(asc(echeances.dateEcheance))
      .limit(6),
    db
      .select({
        compteRenduId: comptesRendus.id,
        affaireId: comptesRendus.affaireId,
        titreCr: comptesRendus.titre,
        decisionsActions: comptesRendus.decisionsActions,
        reference: affaires.reference,
        intitule: affaires.intitule,
      })
      .from(comptesRendus)
      .innerJoin(affaires, eq(comptesRendus.affaireId, affaires.id))
      .where(
        and(
          visible,
          sql`${comptesRendus.statut} <> 'rejete'`,
          sql`jsonb_typeof(${comptesRendus.decisionsActions}) = 'array'`,
          sql`jsonb_array_length(${comptesRendus.decisionsActions}) > 0`
        )
      )
      .orderBy(desc(comptesRendus.updatedAt))
      .limit(30),
    canValidateDocuments
      ? db
          .select({
            id: documents.id,
            affaireId: documents.affaireId,
            titre: documents.titre,
            statut: documents.statut,
            typeDocument: documents.typeDocument,
            updatedAt: documents.updatedAt,
            reference: affaires.reference,
            intitule: affaires.intitule,
            auteurName: users.fullName,
            auteurEmail: users.email,
            auteurTitre: users.titre,
          })
          .from(documents)
          .innerJoin(affaires, eq(documents.affaireId, affaires.id))
          .leftJoin(users, eq(documents.auteurId, users.id))
          .where(and(visible, eq(documents.statut, "en_revue")))
          .orderBy(desc(documents.updatedAt))
          .limit(5)
      : Promise.resolve([]),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(echeances)
      .innerJoin(affaires, eq(echeances.affaireId, affaires.id))
      .where(
        and(
          visible,
          eq(echeances.statut, "a_venir"),
          eq(echeances.responsableId, session.user.id),
          gte(echeances.dateEcheance, now)
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(echeances)
      .innerJoin(affaires, eq(echeances.affaireId, affaires.id))
      .where(
        and(
          visible,
          eq(echeances.statut, "a_venir"),
          gte(echeances.dateEcheance, now),
          lte(echeances.dateEcheance, weekAhead)
        )
      ),
    db
      .select({ name: cabinets.name })
      .from(cabinets)
      .where(eq(cabinets.id, cabinetId))
      .limit(1),
  ]);

  let totalAffaires = 0;
  let affairesActives = 0;
  for (const row of kpiRows) {
    const n = Number(row.n ?? 0);
    totalAffaires += n;
    if (
      row.statut === "ouvert" ||
      row.statut === "en_cours" ||
      row.statut === "en_delibere"
    ) {
      affairesActives += n;
    }
  }

  const kpis: DashboardKpis = {
    totalAffaires,
    affairesActives,
    piecesEnRevue: Number(piecesEnRevueRow[0]?.n ?? 0),
    echeancesSemaine: Number(echeancesSemaineRow[0]?.n ?? 0),
    mesEcheances: Number(mesEcheancesRow[0]?.n ?? 0),
  };

  const upcomingClassic = upcomingRows.map((r) => ({
    id: r.id,
    affaireId: r.affaireId,
    affaireReference: r.reference,
    affaireIntitule: r.intitule,
    titre: r.titre,
    dateEcheance: toDate(r.dateEcheance) ?? new Date(),
    type:
      r.type && (TYPES_ECHEANCE as readonly string[]).includes(r.type)
        ? (r.type as (typeof TYPES_ECHEANCE)[number])
        : null,
    isMine: r.responsableId === session.user.id,
  }));

  const upcomingFromCr = crUpcomingRows.flatMap((row) =>
    parseCrUpcomingActions(row.decisionsActions).map((action) => ({
      id: `cr:${row.compteRenduId}:${action.id}`,
      affaireId: row.affaireId,
      affaireReference: row.reference,
      affaireIntitule: row.intitule,
      titre: `[CR] ${action.texte}`,
      dateEcheance: action.deadline,
      type: null,
      isMine: action.responsableId === session.user.id,
    }))
  );

  const upcomingMerged = [...upcomingClassic, ...upcomingFromCr]
    .sort((a, b) => a.dateEcheance.getTime() - b.dateEcheance.getTime())
    .slice(0, 6);

  return {
    cabinetName: cabinetRow[0]?.name ?? null,
    kpis,
    recentAffaires: recentAffaireRows.map((r) => ({
      id: r.id,
      reference: r.reference,
      intitule: r.intitule,
      statut: r.statut as keyof typeof STATUTS_AFFAIRE_LABEL,
      clientNom: r.clientNom,
      updatedAt: toDate(r.updatedAt) ?? new Date(),
    })),
    recentlyOpened,
    upcomingEcheances: upcomingMerged,
    pendingDocuments: pendingDocRows.map((r) => ({
      id: r.id,
      affaireId: r.affaireId,
      affaireReference: r.reference,
      affaireIntitule: r.intitule,
      titre: r.titre,
      statut: r.statut as StatutDocument,
      typeDocument: r.typeDocument,
      auteurLabel: r.auteurName
        ? formatMemberDisplayName(
            r.auteurName,
            r.auteurEmail,
            r.auteurTitre
          )
        : r.auteurEmail || "—",
      updatedAt: toDate(r.updatedAt) ?? new Date(),
    })),
    canValidateDocuments,
  };
}
export function documentTypeLabel(type: string): string {
  return LABELS_DOCUMENTS[type as keyof typeof LABELS_DOCUMENTS] ?? type;
}
