"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { cabinets, users } from "@/lib/db/schema";
import { getCurrentProfile, isCabinetAdmin } from "@/lib/auth/profile";
import {
  isTitreProfessionnel,
  type TitreProfessionnel,
} from "@/lib/constants/titres-professionnels";
import { normalizeMemberFullName } from "@/lib/users/display-name";

export type MemberActionState = {
  error?: string;
  message?: string;
};

type Role = "admin" | "avocat" | "collaborateur";

const ROLES: ReadonlyArray<Role> = ["admin", "avocat", "collaborateur"];

/**
 * Récupère la session courante + le cabinet auquel elle est rattachée,
 * en vérifiant que l'utilisateur a les droits admin sur ce cabinet.
 * Renvoie `null` si l'utilisateur n'a pas le droit d'effectuer l'opération.
 */
async function requireCabinetAdmin() {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return null;

  const [cabinet] = await db
    .select({ id: cabinets.id, ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, session.profile.cabinetId))
    .limit(1);

  if (!cabinet || !isCabinetAdmin(session, cabinet)) return null;
  return { session, cabinet };
}

export async function updateMemberRole(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const ctx = await requireCabinetAdmin();
  if (!ctx) {
    return {
      error:
        "Seuls les administrateurs du cabinet peuvent modifier les rôles.",
    };
  }
  const { session, cabinet } = ctx;

  const targetId = String(formData.get("userId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as Role;

  if (!targetId) return { error: "Membre cible introuvable." };
  if (!ROLES.includes(role)) return { error: "Rôle invalide." };

  if (targetId === session.user.id) {
    return {
      error:
        "Vous ne pouvez pas modifier votre propre rôle. Demandez à un autre administrateur.",
    };
  }
  if (targetId === cabinet.ownerId) {
    return {
      error: "Le propriétaire du cabinet reste administrateur en permanence.",
    };
  }

  const [target] = await db
    .select({ id: users.id, cabinetId: users.cabinetId, email: users.email })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!target || target.cabinetId !== cabinet.id) {
    return { error: "Ce membre n'appartient pas à votre cabinet." };
  }

  await db.update(users).set({ role }).where(eq(users.id, targetId));

  revalidatePath("/app/cabinet");
  return { message: `Rôle mis à jour pour ${target.email}.` };
}

export async function updateMemberTitre(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const ctx = await requireCabinetAdmin();
  if (!ctx) {
    return {
      error: "Seuls les administrateurs du cabinet peuvent modifier les titres.",
    };
  }
  const { session, cabinet } = ctx;

  const targetId = String(formData.get("userId") ?? "").trim();
  const titreRaw = String(formData.get("titre") ?? "").trim();

  if (!targetId) return { error: "Membre cible introuvable." };

  const titre: TitreProfessionnel | null =
    titreRaw === "" ? null : isTitreProfessionnel(titreRaw) ? titreRaw : null;

  if (titreRaw !== "" && titre === null) {
    return { error: "Titre professionnel invalide." };
  }

  if (targetId === session.user.id) {
    return {
      error:
        "Modifiez votre propre titre depuis Mes paramètres ou demandez à un administrateur.",
    };
  }

  const [target] = await db
    .select({
      id: users.id,
      cabinetId: users.cabinetId,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!target || target.cabinetId !== cabinet.id) {
    return { error: "Ce membre n'appartient pas à votre cabinet." };
  }

  let fullName = target.fullName;
  if (fullName && titre) {
    const normalized = normalizeMemberFullName(fullName, titre);
    if (normalized !== fullName) {
      fullName = normalized;
      await db
        .update(users)
        .set({ titre, fullName: normalized })
        .where(eq(users.id, targetId));
    } else {
      await db.update(users).set({ titre }).where(eq(users.id, targetId));
    }
  } else {
    await db.update(users).set({ titre }).where(eq(users.id, targetId));
  }

  revalidatePath("/app/cabinet");
  revalidatePath("/app/parametres");
  return { message: `Titre mis à jour pour ${target.email}.` };
}

export async function updateMemberDetails(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const ctx = await requireCabinetAdmin();
  if (!ctx) {
    return {
      error:
        "Seuls les administrateurs du cabinet peuvent modifier un membre.",
    };
  }
  const { session, cabinet } = ctx;

  const targetId = String(formData.get("userId") ?? "").trim();
  const fullNameRaw = String(formData.get("fullName") ?? "").trim();
  const titreRaw = String(formData.get("titre") ?? "").trim();
  const barreauRaw = String(formData.get("barreau") ?? "").trim();

  if (!targetId) return { error: "Membre cible introuvable." };
  if (fullNameRaw.length < 2) {
    return { error: "Nom complet requis (2 caractères minimum)." };
  }
  if (fullNameRaw.length > 120) {
    return { error: "Nom trop long (120 caractères maximum)." };
  }

  const titre: TitreProfessionnel | null =
    titreRaw === "" ? null : isTitreProfessionnel(titreRaw) ? titreRaw : null;
  if (titreRaw !== "" && titre === null) {
    return { error: "Titre professionnel invalide." };
  }

  if (targetId === session.user.id) {
    return {
      error: "Modifiez votre propre profil depuis Mes paramètres.",
    };
  }
  if (targetId === cabinet.ownerId) {
    return {
      error:
        "Le propriétaire du cabinet modifie son profil depuis Mes paramètres.",
    };
  }

  const [target] = await db
    .select({ id: users.id, cabinetId: users.cabinetId, email: users.email })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!target || target.cabinetId !== cabinet.id) {
    return { error: "Ce membre n'appartient pas à votre cabinet." };
  }

  const fullName = normalizeMemberFullName(fullNameRaw, titre);

  await db
    .update(users)
    .set({
      fullName,
      titre,
      barreau: barreauRaw || null,
    })
    .where(eq(users.id, targetId));

  revalidatePath("/app/cabinet");
  revalidatePath("/app/parametres");
  return { message: `Profil de ${target.email} mis à jour.` };
}

export async function removeMember(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const ctx = await requireCabinetAdmin();
  if (!ctx) {
    return {
      error:
        "Seuls les administrateurs du cabinet peuvent retirer un membre.",
    };
  }
  const { session, cabinet } = ctx;

  const targetId = String(formData.get("userId") ?? "").trim();
  if (!targetId) return { error: "Membre cible introuvable." };

  if (targetId === session.user.id) {
    return {
      error:
        "Vous ne pouvez pas vous retirer vous-même. Demandez à un autre administrateur.",
    };
  }
  if (targetId === cabinet.ownerId) {
    return {
      error: "Impossible de retirer le propriétaire du cabinet.",
    };
  }

  const [target] = await db
    .select({ id: users.id, cabinetId: users.cabinetId, email: users.email })
    .from(users)
    .where(and(eq(users.id, targetId), eq(users.cabinetId, cabinet.id)))
    .limit(1);

  if (!target) {
    return { error: "Ce membre n'appartient pas à votre cabinet." };
  }

  // On détache l'utilisateur du cabinet : son compte Supabase reste valide
  // mais il n'a plus accès à l'espace cabinet (il sera redirigé vers
  // /onboarding/cabinet à sa prochaine connexion).
  await db
    .update(users)
    .set({ cabinetId: null, role: "avocat" })
    .where(eq(users.id, targetId));

  revalidatePath("/app/cabinet");
  return { message: `${target.email} a été retiré du cabinet.` };
}
