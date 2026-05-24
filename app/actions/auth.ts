"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { formatAuthError } from "@/lib/auth/messages";
import { safeAuthRedirectPath } from "@/lib/auth/redirect";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { parseInscriptionPlan } from "@/lib/onboarding/plans";
import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
  /** Navigation côté client (évite redirect() + useFormState → erreur « {} »). */
  redirectTo?: string;
};

export async function signIn(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: formatAuthError(error) };
  }

  const rawRedirect = String(formData.get("redirect") ?? "").trim();
  if (rawRedirect) {
    return { redirectTo: safeAuthRedirectPath(rawRedirect, "/app") };
  }

  const session = await getCurrentProfile();
  const redirectTo = session
    ? await resolvePostAuthPath(session)
    : "/app";
  return { redirectTo };
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const plan = parseInscriptionPlan(String(formData.get("plan") ?? ""));

  if (!plan) {
    return { error: "Choisissez d'abord une offre sur la page Tarifs." };
  }

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit comporter au moins 8 caractères." };
  }

  if (formData.get("acceptTerms") !== "yes") {
    return {
      error:
        "Vous devez accepter les conditions générales d'utilisation et la politique de confidentialité.",
    };
  }

  const supabase = createSupabaseServerClient();
  const origin =
    headers().get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/after`,
      data: { full_name: fullName || null, intended_plan: plan },
    },
  });

  if (error) {
    return { error: formatAuthError(error) };
  }

  if (data.session && data.user) {
    await db
      .insert(users)
      .values({
        id: data.user.id,
        email,
        fullName: fullName || null,
        intendedPlan: plan,
        role: "avocat",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          fullName: fullName || null,
          intendedPlan: plan,
        },
      });

    revalidatePath("/", "layout");
    const session = await getCurrentProfile();
    const redirectTo = session
      ? await resolvePostAuthPath(session)
      : "/app";
    return { redirectTo };
  }

  return {
    message:
      "Inscription enregistrée. Confirmez votre email pour activer le compte.",
  };
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

function authOrigin(): string {
  return (
    headers().get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

/** Envoie l’email Supabase de réinitialisation (lien → callback → nouveau mot de passe). */
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Indiquez l’adresse email de votre compte." };
  }

  const supabase = createSupabaseServerClient();
  const origin = authOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reinitialiser-mot-de-passe`,
  });

  if (error) {
    return { error: formatAuthError(error) };
  }

  return {
    message:
      "Si un compte existe pour cette adresse, un email de réinitialisation vous a été envoyé. Pensez à vérifier vos spams.",
  };
}

/** Définit le nouveau mot de passe après clic sur le lien de réinitialisation. */
export async function completePasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Le mot de passe doit comporter au moins 8 caractères." };
  }
  if (password !== confirm) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Lien expiré ou session invalide. Demandez un nouvel email depuis la page de connexion.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: formatAuthError(error) };
  }

  await supabase.auth.signOut();
  return { redirectTo: "/connexion?mot-de-passe=reinitialise" };
}
