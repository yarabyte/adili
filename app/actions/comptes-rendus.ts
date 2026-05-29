"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { comptesRendus } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { logAction } from "@/lib/audit/log";
import {
  authorizeCompteRendu,
  canEditCompteRenduContent,
  isCompteRenduAuteur,
  isCompteRenduLocked,
} from "@/lib/comptes-rendus/authorize";
import { createCompteRenduVersionSnapshot } from "@/lib/comptes-rendus/versions";
import { authorize } from "@/lib/permissions/affaires";
import {
  DUREE_DEFAUT_CR,
  TYPES_CR_CONFIDENTIELS,
  titreCompteRenduAuto,
} from "@/lib/constants/types-comptes-rendus";
import {
  CreateCompteRenduZ,
  EMPTY_TIPTAP_DOC,
  RejectCompteRenduZ,
  SaveCompteRenduCorpsZ,
  UpdateCompteRenduZ,
  type DecisionAction,
} from "@/lib/validation/compte-rendu";

export type CompteRenduActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  compteRenduId?: string;
  fieldErrors?: Record<string, string>;
};

function flattenFieldErrors(
  errors: Record<string, string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) {
    if (v?.[0]) out[k] = v[0];
  }
  return out;
}

function parseDateEvenement(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeDecisionsActions(
  items: DecisionAction[]
): DecisionAction[] {
  return items.map((item) => ({
    ...item,
    id: item.id || randomUUID(),
    // Rappel actif uniquement pour une action non faite avec échéance.
    rappelActif: Boolean(
      item.type === "action" && !item.fait && item.deadline
    ),
  }));
}

function formulaireSnapshotFromRow(row: {
  typeCr: string;
  titre: string;
  dateEvenement: Date;
  dureeMinutes: number | null;
  lieu: string | null;
  participants: unknown;
  decisionsActions: unknown;
  piecesRemises: unknown;
  soumisValidation: boolean;
  confidentialite: string;
}) {
  return {
    typeCr: row.typeCr,
    titre: row.titre,
    dateEvenement: row.dateEvenement.toISOString(),
    dureeMinutes: row.dureeMinutes,
    lieu: row.lieu,
    participants: row.participants,
    decisionsActions: row.decisionsActions,
    piecesRemises: row.piecesRemises,
    soumisValidation: row.soumisValidation,
    confidentialite: row.confidentialite,
  };
}

function revalidateAffaireCr(affaireId: string, compteRenduId?: string) {
  revalidatePath(`/app/affaires/${affaireId}`);
  if (compteRenduId) {
    revalidatePath(
      `/app/affaires/${affaireId}/comptes-rendus/${compteRenduId}`
    );
    revalidatePath(`/app/affaires/${affaireId}/comptes-rendus/nouveau`);
  }
}

/** Invalidation légère après mise à jour des métadonnées (sans recharger toute l'affaire). */
function revalidateCompteRenduPage(affaireId: string, compteRenduId: string) {
  revalidatePath(
    `/app/affaires/${affaireId}/comptes-rendus/${compteRenduId}`
  );
}

// ─── Création ────────────────────────────────────────────────────
export async function createCompteRendu(
  affaireId: string,
  payload: unknown
): Promise<CompteRenduActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const ctx = await authorize(session, affaireId, "compte_rendu", "creer");
  if (!ctx) {
    return { error: "Vous ne pouvez pas créer de compte rendu sur cette affaire." };
  }

  const parsed = CreateCompteRenduZ.safeParse(
    typeof payload === "object" && payload !== null
      ? { ...(payload as Record<string, unknown>), affaireId }
      : { affaireId }
  );
  if (!parsed.success) {
    return {
      error: "Données invalides.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dateEvenement = parseDateEvenement(parsed.data.dateEvenement);
  if (!dateEvenement) {
    return { fieldErrors: { dateEvenement: "Date ou heure invalide." } };
  }

  const confidentialite =
    parsed.data.confidentialite ??
    (TYPES_CR_CONFIDENTIELS.has(parsed.data.typeCr) ? "sensible" : "standard");

  const titre =
    parsed.data.titre?.trim() ||
    titreCompteRenduAuto(parsed.data.typeCr, dateEvenement);

  const dureeMinutes =
    parsed.data.dureeMinutes ??
    DUREE_DEFAUT_CR[parsed.data.typeCr] ??
    60;

  const decisionsActions = normalizeDecisionsActions(
    parsed.data.decisionsActions ?? []
  );

  const [created] = await db
    .insert(comptesRendus)
    .values({
      affaireId,
      typeCr: parsed.data.typeCr,
      titre,
      dateEvenement,
      dureeMinutes,
      lieu: parsed.data.lieu ?? null,
      participants: parsed.data.participants ?? [],
      corpsTiptap: parsed.data.corpsTiptap ?? EMPTY_TIPTAP_DOC,
      corpsText: "",
      decisionsActions,
      piecesRemises: parsed.data.piecesRemises ?? [],
      soumisValidation: parsed.data.soumisValidation ?? false,
      confidentialite,
      statut: "brouillon",
      auteurId: session.user.id,
    })
    .returning({ id: comptesRendus.id });

  if (!created) return { error: "Création impossible." };

  await logAction({
    action: "compte_rendu.cree",
    cabinetId: ctx.cabinetId,
    affaireId,
    compteRenduId: created.id,
    userId: session.user.id,
    metadata: { typeCr: parsed.data.typeCr, titre },
  });

  revalidateAffaireCr(affaireId);
  redirect(`/app/affaires/${affaireId}/comptes-rendus/${created.id}`);
}

// ─── Mise à jour métadonnées (formulaire) ────────────────────────
export async function updateCompteRendu(
  affaireId: string,
  payload: unknown
): Promise<CompteRenduActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const parsed = UpdateCompteRenduZ.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Données invalides.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { id, ...rest } = parsed.data;
  const auth = await authorizeCompteRendu(session, id, "modifier");
  if (!auth || auth.affaireId !== affaireId) {
    return { error: "Action non autorisée." };
  }
  if (!canEditCompteRenduContent(session, auth)) {
    return { error: "Ce compte rendu n'est plus modifiable." };
  }

  const [existing] = await db
    .select({
      statut: comptesRendus.statut,
      confidentialite: comptesRendus.confidentialite,
    })
    .from(comptesRendus)
    .where(eq(comptesRendus.id, id))
    .limit(1);
  if (!existing) return { error: "Compte rendu introuvable." };

  const setValues: Partial<typeof comptesRendus.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (rest.typeCr !== undefined) setValues.typeCr = rest.typeCr;
  if (rest.titre !== undefined) setValues.titre = rest.titre;
  if (rest.lieu !== undefined) setValues.lieu = rest.lieu ?? null;
  if (rest.dureeMinutes !== undefined) {
    setValues.dureeMinutes = rest.dureeMinutes ?? null;
  }
  if (rest.participants !== undefined) {
    setValues.participants = rest.participants;
  }
  if (rest.decisionsActions !== undefined) {
    setValues.decisionsActions = normalizeDecisionsActions(rest.decisionsActions);
  }
  if (rest.piecesRemises !== undefined) {
    setValues.piecesRemises = rest.piecesRemises;
  }
  if (rest.soumisValidation !== undefined) {
    setValues.soumisValidation = rest.soumisValidation;
  }
  if (rest.confidentialite !== undefined) {
    const prev = existing.confidentialite;
    setValues.confidentialite = rest.confidentialite;
    if (prev !== rest.confidentialite) {
      await logAction({
        action: "compte_rendu.confidentialite_changee",
        cabinetId: auth.cabinetId,
        affaireId,
        compteRenduId: id,
        userId: session.user.id,
        metadata: { from: prev, to: rest.confidentialite },
      });
    }
  }
  if (rest.dateEvenement !== undefined) {
    const d = parseDateEvenement(rest.dateEvenement);
    if (!d) {
      return { fieldErrors: { dateEvenement: "Date ou heure invalide." } };
    }
    setValues.dateEvenement = d;
  }
  if (rest.corpsTiptap !== undefined) {
    setValues.corpsTiptap = rest.corpsTiptap as object;
  }

  const keys = Object.keys(setValues).filter((k) => k !== "updatedAt");
  if (keys.length === 0) {
    return { error: "Aucune modification." };
  }

  if (existing.statut === "rejete") {
    setValues.statut = "brouillon";
  }

  await db.update(comptesRendus).set(setValues).where(eq(comptesRendus.id, id));

  void logAction({
    action: "compte_rendu.edite",
    cabinetId: auth.cabinetId,
    affaireId,
    compteRenduId: id,
    userId: session.user.id,
  });

  revalidateCompteRenduPage(affaireId, id);
  return { ok: true, compteRenduId: id };
}

// ─── Sauvegarde corps (autosave éditeur) ─────────────────────────
export async function saveCompteRenduCorps(
  compteRenduId: string,
  payload: unknown
): Promise<CompteRenduActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const parsed = SaveCompteRenduCorpsZ.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Charge utile invalide.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const auth = await authorizeCompteRendu(session, compteRenduId, "modifier");
  if (!auth) return { error: "Action non autorisée." };
  if (!canEditCompteRenduContent(session, auth)) {
    return { error: "Ce compte rendu est en lecture seule." };
  }

  const data = parsed.data;
  const setValues: Partial<typeof comptesRendus.$inferInsert> = {
    corpsTiptap: data.corpsTiptap as object,
    corpsText: data.corpsText,
    updatedAt: new Date(),
  };

  if (data.participants !== undefined) setValues.participants = data.participants;
  if (data.decisionsActions !== undefined) {
    setValues.decisionsActions = normalizeDecisionsActions(data.decisionsActions);
  }
  if (data.piecesRemises !== undefined) {
    setValues.piecesRemises = data.piecesRemises;
  }
  if (data.dureeMinutes !== undefined) {
    setValues.dureeMinutes = data.dureeMinutes ?? null;
  }
  if (data.lieu !== undefined) setValues.lieu = data.lieu ?? null;
  if (data.dateEvenement !== undefined) {
    const d = parseDateEvenement(data.dateEvenement);
    if (!d) {
      return { fieldErrors: { dateEvenement: "Date ou heure invalide." } };
    }
    setValues.dateEvenement = d;
  }

  if (auth.compteRendu.statut === "rejete") {
    setValues.statut = "brouillon";
  }

  await db
    .update(comptesRendus)
    .set(setValues)
    .where(eq(comptesRendus.id, compteRenduId));

  if (data.createSnapshot) {
    const [row] = await db
      .select({
        typeCr: comptesRendus.typeCr,
        titre: comptesRendus.titre,
        dateEvenement: comptesRendus.dateEvenement,
        dureeMinutes: comptesRendus.dureeMinutes,
        lieu: comptesRendus.lieu,
        participants: comptesRendus.participants,
        decisionsActions: comptesRendus.decisionsActions,
        piecesRemises: comptesRendus.piecesRemises,
        soumisValidation: comptesRendus.soumisValidation,
        confidentialite: comptesRendus.confidentialite,
      })
      .from(comptesRendus)
      .where(eq(comptesRendus.id, compteRenduId))
      .limit(1);
    if (row) {
      const snap = formulaireSnapshotFromRow({
        ...row,
        ...setValues,
        dateEvenement:
          (setValues.dateEvenement as Date | undefined) ?? row.dateEvenement,
      });
      await createCompteRenduVersionSnapshot({
        compteRenduId,
        trigger: "manuel",
        userId: session.user.id,
        corpsTiptap: data.corpsTiptap,
        corpsText: data.corpsText,
        formulaireSnapshot: snap,
      });
    }
    await logAction({
      action: "compte_rendu.edite",
      cabinetId: auth.cabinetId,
      affaireId: auth.affaireId,
      compteRenduId,
      userId: session.user.id,
    });
    revalidateAffaireCr(auth.affaireId, compteRenduId);
  }

  return { ok: true, compteRenduId };
}

// ─── Finaliser (sans validation admin) ───────────────────────────
export async function finaliserCompteRendu(
  compteRenduId: string
): Promise<CompteRenduActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const auth = await authorizeCompteRendu(session, compteRenduId, "finaliser");
  if (!auth) return { error: "Action non autorisée." };
  if (!isCompteRenduAuteur(session, auth)) {
    return { error: "Seul l'auteur du compte rendu peut le finaliser." };
  }
  if (auth.compteRendu.statut !== "brouillon") {
    return { error: "Seuls les brouillons peuvent être finalisés." };
  }
  if (auth.compteRendu.soumisValidation) {
    return {
      error:
        "Ce compte rendu est marqué pour validation — utilisez « Soumettre ».",
    };
  }

  const [row] = await db
    .select()
    .from(comptesRendus)
    .where(eq(comptesRendus.id, compteRenduId))
    .limit(1);
  if (!row) return { error: "Compte rendu introuvable." };

  await db
    .update(comptesRendus)
    .set({ statut: "finalise", updatedAt: new Date() })
    .where(eq(comptesRendus.id, compteRenduId));

  await createCompteRenduVersionSnapshot({
    compteRenduId,
    trigger: "finalisation",
    userId: session.user.id,
    corpsTiptap: row.corpsTiptap,
    corpsText: row.corpsText,
    formulaireSnapshot: formulaireSnapshotFromRow(row),
  });

  await logAction({
    action: "compte_rendu.finalise",
    cabinetId: auth.cabinetId,
    affaireId: auth.affaireId,
    compteRenduId,
    userId: session.user.id,
  });

  revalidateAffaireCr(auth.affaireId, compteRenduId);
  return { ok: true, compteRenduId, message: "Compte rendu finalisé." };
}

// ─── Soumettre pour validation ───────────────────────────────────
export async function soumettreCompteRendu(
  compteRenduId: string
): Promise<CompteRenduActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const auth = await authorizeCompteRendu(session, compteRenduId, "soumettre");
  if (!auth) return { error: "Action non autorisée." };
  if (!isCompteRenduAuteur(session, auth)) {
    return { error: "Seul l'auteur peut soumettre ce compte rendu." };
  }
  if (auth.compteRendu.statut !== "brouillon") {
    return { error: "Seuls les brouillons peuvent être soumis." };
  }

  const [row] = await db
    .select()
    .from(comptesRendus)
    .where(eq(comptesRendus.id, compteRenduId))
    .limit(1);
  if (!row) return { error: "Compte rendu introuvable." };

  await db
    .update(comptesRendus)
    .set({
      statut: "en_revue",
      soumisValidation: true,
      updatedAt: new Date(),
    })
    .where(eq(comptesRendus.id, compteRenduId));

  await createCompteRenduVersionSnapshot({
    compteRenduId,
    trigger: "soumission",
    userId: session.user.id,
    corpsTiptap: row.corpsTiptap,
    corpsText: row.corpsText,
    formulaireSnapshot: formulaireSnapshotFromRow({
      ...row,
      soumisValidation: true,
    }),
  });

  await logAction({
    action: "compte_rendu.soumis",
    cabinetId: auth.cabinetId,
    affaireId: auth.affaireId,
    compteRenduId,
    userId: session.user.id,
  });

  revalidateAffaireCr(auth.affaireId, compteRenduId);
  return { ok: true, compteRenduId, message: "Compte rendu soumis pour validation." };
}

// ─── Valider (admin cabinet) ─────────────────────────────────────
export async function validerCompteRendu(
  compteRenduId: string
): Promise<CompteRenduActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const auth = await authorizeCompteRendu(session, compteRenduId, "valider");
  if (!auth) {
    return { error: "Seul un administrateur du cabinet peut valider." };
  }
  if (auth.compteRendu.statut !== "en_revue") {
    return { error: "Seuls les comptes rendus en revue peuvent être validés." };
  }

  const [row] = await db
    .select()
    .from(comptesRendus)
    .where(eq(comptesRendus.id, compteRenduId))
    .limit(1);
  if (!row) return { error: "Compte rendu introuvable." };

  await db
    .update(comptesRendus)
    .set({
      statut: "valide",
      validateurId: session.user.id,
      valideAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(comptesRendus.id, compteRenduId));

  await createCompteRenduVersionSnapshot({
    compteRenduId,
    trigger: "validation",
    userId: session.user.id,
    corpsTiptap: row.corpsTiptap,
    corpsText: row.corpsText,
    formulaireSnapshot: formulaireSnapshotFromRow(row),
  });

  await logAction({
    action: "compte_rendu.valide",
    cabinetId: auth.cabinetId,
    affaireId: auth.affaireId,
    compteRenduId,
    userId: session.user.id,
  });

  revalidateAffaireCr(auth.affaireId, compteRenduId);
  return { ok: true, compteRenduId };
}

// ─── Rejeter (admin cabinet) ─────────────────────────────────────
export async function rejeterCompteRendu(
  compteRenduId: string,
  payload: { raison: string }
): Promise<CompteRenduActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const parsed = RejectCompteRenduZ.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Motif invalide.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const auth = await authorizeCompteRendu(session, compteRenduId, "rejeter");
  if (!auth) {
    return { error: "Seul un administrateur du cabinet peut rejeter." };
  }
  if (auth.compteRendu.statut !== "en_revue") {
    return { error: "Seuls les comptes rendus en revue peuvent être rejetés." };
  }

  const [row] = await db
    .select()
    .from(comptesRendus)
    .where(eq(comptesRendus.id, compteRenduId))
    .limit(1);
  if (!row) return { error: "Compte rendu introuvable." };

  await db
    .update(comptesRendus)
    .set({ statut: "rejete", updatedAt: new Date() })
    .where(eq(comptesRendus.id, compteRenduId));

  await createCompteRenduVersionSnapshot({
    compteRenduId,
    trigger: "rejet",
    userId: session.user.id,
    corpsTiptap: row.corpsTiptap,
    corpsText: row.corpsText,
    formulaireSnapshot: formulaireSnapshotFromRow(row),
  });

  await logAction({
    action: "compte_rendu.rejete",
    cabinetId: auth.cabinetId,
    affaireId: auth.affaireId,
    compteRenduId,
    userId: session.user.id,
    metadata: { raison: parsed.data.raison },
  });

  revalidateAffaireCr(auth.affaireId, compteRenduId);
  return { ok: true, compteRenduId };
}

// ─── Rouvrir en brouillon (admin) ────────────────────────────────
export async function rouvrirCompteRendu(
  compteRenduId: string
): Promise<CompteRenduActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const auth = await authorizeCompteRendu(session, compteRenduId, "modifier");
  if (!auth || auth.role !== "admin_cabinet") {
    return { error: "Seul un administrateur peut rouvrir un compte rendu." };
  }
  if (!isCompteRenduLocked(auth.compteRendu.statut)) {
    return { error: "Ce compte rendu est déjà modifiable." };
  }

  const [row] = await db
    .select()
    .from(comptesRendus)
    .where(eq(comptesRendus.id, compteRenduId))
    .limit(1);
  if (!row) return { error: "Compte rendu introuvable." };

  await createCompteRenduVersionSnapshot({
    compteRenduId,
    trigger: "manuel",
    userId: session.user.id,
    corpsTiptap: row.corpsTiptap,
    corpsText: row.corpsText,
    formulaireSnapshot: formulaireSnapshotFromRow(row),
  });

  await db
    .update(comptesRendus)
    .set({
      statut: "brouillon",
      validateurId: null,
      valideAt: null,
      updatedAt: new Date(),
    })
    .where(eq(comptesRendus.id, compteRenduId));

  await logAction({
    action: "compte_rendu.edite",
    cabinetId: auth.cabinetId,
    affaireId: auth.affaireId,
    compteRenduId,
    userId: session.user.id,
    metadata: { reopened_from: row.statut },
  });

  revalidateAffaireCr(auth.affaireId, compteRenduId);
  return { ok: true, compteRenduId, message: "Compte rendu rouvert en brouillon." };
}

// ─── Suppression ─────────────────────────────────────────────────
export async function deleteCompteRendu(
  compteRenduId: string
): Promise<CompteRenduActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const auth = await authorizeCompteRendu(session, compteRenduId, "supprimer");
  if (!auth) {
    return { error: "Seul un administrateur peut supprimer un compte rendu." };
  }

  const titre = auth.compteRendu.titre;
  const affaireId = auth.affaireId;

  await db.delete(comptesRendus).where(eq(comptesRendus.id, compteRenduId));

  await logAction({
    action: "compte_rendu.supprime",
    cabinetId: auth.cabinetId,
    affaireId,
    compteRenduId: null,
    userId: session.user.id,
    metadata: { deleted_compte_rendu_id: compteRenduId, titre },
  });

  revalidateAffaireCr(affaireId);
  return { ok: true };
}
