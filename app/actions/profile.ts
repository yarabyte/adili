"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { isTitreProfessionnel } from "@/lib/constants/titres-professionnels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeMemberFullName } from "@/lib/users/display-name";

export type ProfileFormState = {
  error?: string;
  message?: string;
};

/**
 * Met à jour les informations de profil (nom, téléphone, barreau) — utilisé
 * notamment par les membres invités juste après l'acceptation d'une invitation,
 * et par le menu profil de l'app shell.
 */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await getCurrentProfile();
  if (!session) {
    return { error: "Session expirée — reconnectez-vous." };
  }

  const fullNameRaw = String(formData.get("fullName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const barreau = String(formData.get("barreau") ?? "").trim();
  const titreRaw = String(formData.get("titre") ?? "").trim();
  const titre =
    titreRaw === ""
      ? null
      : isTitreProfessionnel(titreRaw)
        ? titreRaw
        : null;
  if (titreRaw !== "" && titre === null) {
    return { error: "Titre professionnel invalide." };
  }
  const fullName = normalizeMemberFullName(fullNameRaw, titre);

  if (fullNameRaw.length < 2) {
    return { error: "Renseignez votre nom complet (2 caractères minimum)." };
  }
  if (fullNameRaw.length > 120) {
    return { error: "Nom trop long (120 caractères maximum)." };
  }
  // Téléphone optionnel — validation souple : 6-20 caractères, chiffres + +, espaces, tirets, parenthèses, points.
  if (phoneRaw && !/^[+()\d\s.\-]{6,20}$/.test(phoneRaw)) {
    return {
      error:
        "Numéro de téléphone invalide. Format attendu : chiffres, espaces, +, -, parenthèses.",
    };
  }

  const userId = session.user.id;
  const email = session.user.email;
  if (!email) {
    return {
      error: "Email introuvable — reconnectez-vous puis réessayez.",
    };
  }

  await db
    .insert(users)
    .values({
      id: userId,
      email,
      fullName,
      phone: phoneRaw || null,
      barreau: barreau || null,
      titre,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        fullName,
        phone: phoneRaw || null,
        barreau: barreau || null,
        titre,
        email,
      },
    });

  revalidatePath("/app");
  revalidatePath("/app/parametres");
  revalidatePath("/onboarding/profil");

  const redirectTo = String(formData.get("redirect") ?? "").trim();
  if (redirectTo && redirectTo.startsWith("/")) {
    redirect(redirectTo);
  }
  return { message: "Profil mis à jour." };
}

/** Changement de mot de passe pour l'utilisateur connecté (Supabase Auth). */
export async function updatePassword(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await getCurrentProfile();
  if (!session) {
    return { error: "Session expirée — reconnectez-vous." };
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return {
      error: "Le mot de passe doit comporter au moins 8 caractères.",
    };
  }
  if (password !== confirm) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/parametres");
  return { message: "Mot de passe mis à jour." };
}
