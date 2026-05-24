"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { echeances } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { authorize } from "@/lib/permissions/affaires";
import { logAction } from "@/lib/audit/log";
import { isUserOnAffaire } from "@/lib/echeances/affaire-members";
import { notifyEcheanceResponsable } from "@/lib/echeances/notify-responsable";
import { CreateEcheanceZ, UpdateEcheanceZ } from "@/lib/validation/echeances";

export type EcheanceActionState = {
  ok?: boolean;
  error?: string;
  warning?: string;
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

function parseDateEcheance(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createEcheance(
  affaireId: string,
  payload: unknown
): Promise<EcheanceActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const ctx = await authorize(session, affaireId, "echeance", "creer");
  if (!ctx) {
    return { error: "Vous ne pouvez pas créer d'échéance sur cette affaire." };
  }

  const parsed = CreateEcheanceZ.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Données invalides.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dateEcheance = parseDateEcheance(parsed.data.dateEcheance);
  if (!dateEcheance) {
    return { fieldErrors: { dateEcheance: "Date ou heure invalide." } };
  }

  const onAffaire = await isUserOnAffaire(
    affaireId,
    parsed.data.responsableId
  );
  if (!onAffaire) {
    return {
      fieldErrors: {
        responsableId: "Cette personne n'est pas membre du dossier.",
      },
    };
  }

  await db.insert(echeances).values({
    affaireId,
    titre: parsed.data.titre,
    description: parsed.data.description ?? null,
    dateEcheance,
    type: parsed.data.type ?? null,
    alerteJ7: parsed.data.alerteJ7 ?? true,
    alerteJ2: parsed.data.alerteJ2 ?? true,
    alerteJ1: parsed.data.alerteJ1 ?? true,
    responsableId: parsed.data.responsableId,
    createdBy: session.user.id,
  });

  await logAction({
    action: "echeance.creee",
    cabinetId: ctx.cabinetId,
    affaireId,
    userId: session.user.id,
    metadata: {
      titre: parsed.data.titre,
      responsable_id: parsed.data.responsableId,
    },
  });

  const mail = await notifyEcheanceResponsable({
    affaireId,
    cabinetId: ctx.cabinetId,
    responsableUserId: parsed.data.responsableId,
    assignerUserId: session.user.id,
    echeanceTitre: parsed.data.titre,
    description: parsed.data.description ?? null,
    dateEcheance,
    type: parsed.data.type ?? null,
    alerteJ7: parsed.data.alerteJ7 ?? true,
    alerteJ2: parsed.data.alerteJ2 ?? true,
    alerteJ1: parsed.data.alerteJ1 ?? true,
  });

  revalidatePath(`/app/affaires/${affaireId}`);
  if (!mail.sent) {
    return {
      ok: true,
      warning: `Échéance enregistrée, mais l'email n'a pas pu être envoyé : ${mail.reason}`,
    };
  }
  return { ok: true };
}

export async function updateEcheance(
  affaireId: string,
  payload: unknown
): Promise<EcheanceActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const ctx = await authorize(session, affaireId, "echeance", "modifier");
  if (!ctx) {
    return { error: "Vous ne pouvez pas modifier cette échéance." };
  }

  const parsed = UpdateEcheanceZ.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Données invalides.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const { id, ...rest } = parsed.data;
  const [existing] = await db
    .select({
      id: echeances.id,
      titre: echeances.titre,
      description: echeances.description,
      dateEcheance: echeances.dateEcheance,
      type: echeances.type,
      alerteJ7: echeances.alerteJ7,
      alerteJ2: echeances.alerteJ2,
      alerteJ1: echeances.alerteJ1,
      responsableId: echeances.responsableId,
    })
    .from(echeances)
    .where(and(eq(echeances.id, id), eq(echeances.affaireId, affaireId)))
    .limit(1);
  if (!existing) {
    return { error: "Échéance introuvable." };
  }

  if (rest.responsableId !== undefined) {
    const onAffaire = await isUserOnAffaire(affaireId, rest.responsableId);
    if (!onAffaire) {
      return {
        fieldErrors: {
          responsableId: "Cette personne n'est pas membre du dossier.",
        },
      };
    }
  }

  const setValues: {
    updatedAt: Date;
    titre?: string;
    description?: string | null;
    dateEcheance?: Date;
    type?: (typeof echeances.$inferSelect)["type"];
    alerteJ7?: boolean;
    alerteJ2?: boolean;
    alerteJ1?: boolean;
    responsableId?: string;
  } = { updatedAt: new Date() };

  if (rest.titre !== undefined) setValues.titre = rest.titre;
  if (rest.description !== undefined) setValues.description = rest.description;
  if (rest.type !== undefined) setValues.type = rest.type ?? null;
  if (rest.alerteJ7 !== undefined) setValues.alerteJ7 = rest.alerteJ7;
  if (rest.alerteJ2 !== undefined) setValues.alerteJ2 = rest.alerteJ2;
  if (rest.alerteJ1 !== undefined) setValues.alerteJ1 = rest.alerteJ1;
  if (rest.responsableId !== undefined) {
    setValues.responsableId = rest.responsableId;
  }
  if (rest.dateEcheance !== undefined) {
    const d = parseDateEcheance(rest.dateEcheance);
    if (!d) {
      return { fieldErrors: { dateEcheance: "Date ou heure invalide." } };
    }
    setValues.dateEcheance = d;
  }

  const keys = Object.keys(setValues).filter((k) => k !== "updatedAt");
  if (keys.length === 0) {
    return { error: "Aucune modification." };
  }

  await db
    .update(echeances)
    .set(setValues)
    .where(and(eq(echeances.id, id), eq(echeances.affaireId, affaireId)));

  await logAction({
    action: "echeance.modifiee",
    cabinetId: ctx.cabinetId,
    affaireId,
    userId: session.user.id,
    metadata: { echeance_id: id },
  });

  let warning: string | undefined;
  const newResponsableId =
    rest.responsableId !== undefined
      ? rest.responsableId
      : existing.responsableId;
  const responsableChanged =
    rest.responsableId !== undefined &&
    rest.responsableId !== existing.responsableId;

  if (newResponsableId && responsableChanged) {
    const mail = await notifyEcheanceResponsable({
      affaireId,
      cabinetId: ctx.cabinetId,
      responsableUserId: newResponsableId,
      assignerUserId: session.user.id,
      echeanceTitre: setValues.titre ?? existing.titre,
      description:
        rest.description !== undefined
          ? (rest.description ?? null)
          : existing.description,
      dateEcheance: setValues.dateEcheance ?? existing.dateEcheance,
      type:
        rest.type !== undefined ? (rest.type ?? null) : existing.type,
      alerteJ7: rest.alerteJ7 ?? existing.alerteJ7,
      alerteJ2: rest.alerteJ2 ?? existing.alerteJ2,
      alerteJ1: rest.alerteJ1 ?? existing.alerteJ1,
      isReassignment: true,
    });
    if (!mail.sent) {
      warning = `Modification enregistrée, mais l'email n'a pas pu être envoyé : ${mail.reason}`;
    }
  }

  revalidatePath(`/app/affaires/${affaireId}`);
  return warning ? { ok: true, warning } : { ok: true };
}

export async function deleteEcheance(
  affaireId: string,
  echeanceId: string
): Promise<EcheanceActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const ctx = await authorize(session, affaireId, "echeance", "supprimer");
  if (!ctx) {
    return { error: "Vous ne pouvez pas supprimer cette échéance." };
  }

  const res = await db
    .delete(echeances)
    .where(
      and(eq(echeances.id, echeanceId), eq(echeances.affaireId, affaireId))
    )
    .returning({ id: echeances.id });

  if (res.length === 0) {
    return { error: "Échéance introuvable." };
  }

  await logAction({
    action: "echeance.supprimee",
    cabinetId: ctx.cabinetId,
    affaireId,
    userId: session.user.id,
    metadata: { echeance_id: echeanceId },
  });

  revalidatePath(`/app/affaires/${affaireId}`);
  return { ok: true };
}
