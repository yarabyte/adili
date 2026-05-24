"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { headers } from "next/headers";

import { db } from "@/lib/db/client";
import { cabinets, invitations, users } from "@/lib/db/schema";
import { getCurrentProfile, isCabinetAdmin } from "@/lib/auth/profile";
import { sendEmail } from "@/lib/email/smtp";
import {
  invitationEmailHtml,
  invitationEmailText,
} from "@/lib/email/templates/invitation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthFormState } from "@/app/actions/auth";

const INVITATION_TTL_DAYS = 7;

export type InvitationFormState = {
  error?: string;
  message?: string;
};

function siteUrlFromHeaders(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    headers().get("origin") ||
    "http://localhost:3000"
  );
}

export async function createInvitation(
  _prev: InvitationFormState,
  formData: FormData
): Promise<InvitationFormState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Cabinet introuvable pour votre compte." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "avocat") as
    | "admin"
    | "avocat"
    | "collaborateur";

  if (!email || !email.includes("@")) {
    return { error: "Adresse email invalide." };
  }
  if (!["admin", "avocat", "collaborateur"].includes(role)) {
    return { error: "Rôle invalide." };
  }

  const [cabinet] = await db
    .select({ id: cabinets.id, name: cabinets.name, ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, session.profile.cabinetId))
    .limit(1);

  if (!cabinet) {
    return { error: "Cabinet introuvable." };
  }
  if (!isCabinetAdmin(session, cabinet)) {
    return {
      error:
        "Seuls les administrateurs du cabinet peuvent envoyer des invitations.",
    };
  }

  const token = nanoid(32);
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(invitations).values({
    cabinetId: cabinet.id,
    email,
    role,
    token,
    expiresAt,
  });

  const inviterName =
    session.profile.fullName ||
    (session.user.user_metadata?.full_name as string | undefined) ||
    session.user.email ||
    "Un collaborateur";

  const link = `${siteUrlFromHeaders()}/invitations/${token}`;

  const inviterEmail = session.user.email ?? null;
  const templateParams = {
    cabinetName: cabinet.name,
    inviterName,
    inviterEmail,
    role,
    expiresInDays: INVITATION_TTL_DAYS,
    link,
  } as const;

  const sameName =
    inviterName.trim().toLowerCase() === cabinet.name.trim().toLowerCase();
  const subject = sameName
    ? `Invitation à rejoindre ${cabinet.name} sur Adili`
    : `${inviterName} vous invite à rejoindre ${cabinet.name} sur Adili`;

  try {
    await sendEmail({
      to: email,
      subject,
      html: invitationEmailHtml(templateParams),
      text: invitationEmailText(templateParams),
      replyTo: inviterEmail ?? undefined,
    });
  } catch (err) {
    console.error("[invitations] envoi email échoué :", err);
    const reason = err instanceof Error ? err.message : String(err);
    return {
      error: `Invitation enregistrée mais l'email n'a pas pu partir : ${reason}`,
    };
  }

  revalidatePath("/app/cabinet");
  return { message: `Invitation envoyée à ${email}.` };
}

export async function revokeInvitation(formData: FormData) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Garde admin : seul un propriétaire ou un rôle `admin` peut révoquer.
  const [cabinet] = await db
    .select({ id: cabinets.id, ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, session.profile.cabinetId))
    .limit(1);
  if (!cabinet || !isCabinetAdmin(session, cabinet)) return;

  await db
    .delete(invitations)
    .where(
      and(
        eq(invitations.id, id),
        eq(invitations.cabinetId, session.profile.cabinetId),
        isNull(invitations.acceptedAt)
      )
    );

  revalidatePath("/app/cabinet");
}

export type AcceptInvitationResult = {
  status: "ok" | "invalid" | "expired" | "already-used" | "auth-required";
  cabinetName?: string;
  email?: string;
};

export async function acceptInvitation(
  token: string
): Promise<AcceptInvitationResult> {
  const [invitation] = await db
    .select({
      id: invitations.id,
      cabinetId: invitations.cabinetId,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      cabinetName: cabinets.name,
    })
    .from(invitations)
    .innerJoin(cabinets, eq(invitations.cabinetId, cabinets.id))
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invitation) return { status: "invalid" };
  if (invitation.acceptedAt)
    return {
      status: "already-used",
      cabinetName: invitation.cabinetName,
      email: invitation.email,
    };
  if (invitation.expiresAt.getTime() < Date.now())
    return {
      status: "expired",
      cabinetName: invitation.cabinetName,
      email: invitation.email,
    };

  const session = await getCurrentProfile();
  if (!session) {
    return {
      status: "auth-required",
      cabinetName: invitation.cabinetName,
      email: invitation.email,
    };
  }

  const userEmail = session.user.email;
  const fullName =
    (session.user.user_metadata?.full_name as string | undefined) ?? null;

  await db
    .insert(users)
    .values({
      id: session.user.id,
      email: userEmail ?? invitation.email,
      fullName,
      cabinetId: invitation.cabinetId,
      role: invitation.role,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        cabinetId: invitation.cabinetId,
        role: invitation.role,
        ...(userEmail ? { email: userEmail } : {}),
      },
    });

  await db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invitation.id));

  // L'utilisateur a déjà un compte — on lui propose de compléter son profil
  // (téléphone, barreau) avant de basculer sur l'app.
  redirect("/onboarding/profil");
}

export async function acceptInvitationFromForm(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) return;
  await acceptInvitation(token);
}

/**
 * Inscription depuis le lien d'invitation (mail) :
 * - l'email est imposé par l'invitation (pas modifiable côté formulaire)
 * - si Supabase ouvre une session immédiate, on accepte l'invitation et on
 *   redirige sur /app
 * - sinon, on retourne un message indiquant qu'un email de confirmation a
 *   été envoyé ; après confirmation, l'utilisateur revient sur la page de
 *   l'invitation (via `next=`) pour finaliser l'acceptation.
 */
export async function signUpFromInvitation(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!token) {
    return { error: "Lien d'invitation manquant ou invalide." };
  }
  if (!password) {
    return { error: "Mot de passe requis." };
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

  const [invitation] = await db
    .select({
      id: invitations.id,
      cabinetId: invitations.cabinetId,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
    })
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  if (!invitation) {
    return { error: "Invitation introuvable. Demandez un nouveau lien." };
  }
  if (invitation.acceptedAt) {
    return {
      error:
        "Cette invitation a déjà été acceptée. Connectez-vous pour rejoindre le cabinet.",
    };
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    return {
      error:
        "Lien d'invitation expiré (7 jours). Demandez un nouvel envoi au cabinet.",
    };
  }

  const supabase = createSupabaseServerClient();
  const origin =
    headers().get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const next = `/invitations/${token}`;

  const { data, error } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { full_name: fullName || null },
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("registered") || lower.includes("exists")) {
      return {
        error:
          "Un compte existe déjà avec cet email. Connectez-vous pour accepter l'invitation.",
      };
    }
    return { error: error.message };
  }

  // Pas de session immédiate → confirmation email obligatoire.
  if (!data.session) {
    return {
      message:
        "Compte créé. Confirmez votre email via le lien que nous venons de vous envoyer pour finaliser l'accès au cabinet.",
    };
  }

  // Session ouverte → on attache l'utilisateur au cabinet et on marque
  // l'invitation comme acceptée.
  const userId = data.user?.id ?? data.session.user.id;
  const userEmail = data.user?.email ?? invitation.email;

  await db
    .insert(users)
    .values({
      id: userId,
      email: userEmail,
      fullName: fullName || null,
      cabinetId: invitation.cabinetId,
      role: invitation.role,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        cabinetId: invitation.cabinetId,
        role: invitation.role,
        email: userEmail,
        ...(fullName ? { fullName } : {}),
      },
    });

  await db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invitation.id));

  // Compte fraîchement créé via invitation : on enchaîne sur l'écran de
  // profil pour collecter téléphone et barreau avant l'entrée sur /app.
  redirect("/onboarding/profil");
}
