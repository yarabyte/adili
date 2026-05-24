"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaireMembres, users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { authorize } from "@/lib/permissions/affaires";
import {
  AddAffaireMembreZ,
  UpdateAffaireMembreZ,
} from "@/lib/validation/affaires";
import { logAction } from "@/lib/audit/log";

export type MembreActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function flattenFieldErrors(
  errors: Record<string, string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) {
    if (v && v[0]) out[k] = v[0];
  }
  return out;
}

export async function addAffaireMembre(
  affaireId: string,
  payload: unknown
): Promise<MembreActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const ctx = await authorize(session, affaireId, "affaire", "inviter");
  if (!ctx) {
    return {
      error: "Action non autorisée — seul un responsable ou admin peut ajouter un membre.",
    };
  }

  const parsed = AddAffaireMembreZ.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Données invalides.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  const { userId, role } = parsed.data;

  // Vérifier que le user appartient bien au cabinet.
  const [target] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.cabinetId, ctx.cabinetId)))
    .limit(1);
  if (!target) {
    return {
      error: "Utilisateur introuvable dans votre cabinet.",
      fieldErrors: { userId: "Cet utilisateur n'appartient pas au cabinet." },
    };
  }

  // Upsert : si déjà membre, on met juste à jour le rôle.
  await db
    .insert(affaireMembres)
    .values({
      affaireId,
      userId,
      role,
      addedBy: session.user.id,
    })
    .onConflictDoUpdate({
      target: [affaireMembres.affaireId, affaireMembres.userId],
      set: { role },
    });

  await logAction({
    action: "affaire.membre_ajoute",
    cabinetId: ctx.cabinetId,
    affaireId,
    userId: session.user.id,
    metadata: { target_user_id: userId, role },
  });

  revalidatePath(`/app/affaires/${affaireId}`);
  return { ok: true };
}

export async function updateAffaireMembreRole(
  affaireId: string,
  payload: unknown
): Promise<MembreActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const ctx = await authorize(session, affaireId, "affaire", "inviter");
  if (!ctx) {
    return { error: "Action non autorisée." };
  }

  const parsed = UpdateAffaireMembreZ.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Données invalides.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  const { userId, role } = parsed.data;

  if (userId === ctx.responsableId && role !== "responsable") {
    return {
      error:
        "Le responsable de l'affaire doit garder le rôle « responsable ». Désignez un nouveau responsable d'abord.",
    };
  }

  const result = await db
    .update(affaireMembres)
    .set({ role })
    .where(
      and(
        eq(affaireMembres.affaireId, affaireId),
        eq(affaireMembres.userId, userId)
      )
    )
    .returning({ id: affaireMembres.id });

  if (result.length === 0) {
    return { error: "Ce membre n'est pas affecté à cette affaire." };
  }

  await logAction({
    action: "affaire.role_change",
    cabinetId: ctx.cabinetId,
    affaireId,
    userId: session.user.id,
    metadata: { target_user_id: userId, new_role: role },
  });

  revalidatePath(`/app/affaires/${affaireId}`);
  return { ok: true };
}

export async function removeAffaireMembre(
  affaireId: string,
  userId: string
): Promise<MembreActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const ctx = await authorize(session, affaireId, "affaire", "inviter");
  if (!ctx) {
    return { error: "Action non autorisée." };
  }

  if (userId === ctx.responsableId) {
    return {
      error:
        "Impossible de retirer le responsable de l'affaire. Désignez d'abord un nouveau responsable.",
    };
  }

  const result = await db
    .delete(affaireMembres)
    .where(
      and(
        eq(affaireMembres.affaireId, affaireId),
        eq(affaireMembres.userId, userId)
      )
    )
    .returning({ id: affaireMembres.id });

  if (result.length === 0) {
    return { error: "Ce membre n'est pas affecté à cette affaire." };
  }

  await logAction({
    action: "affaire.membre_retire",
    cabinetId: ctx.cabinetId,
    affaireId,
    userId: session.user.id,
    metadata: { target_user_id: userId },
  });

  revalidatePath(`/app/affaires/${affaireId}`);
  return { ok: true };
}
