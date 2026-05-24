"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";

import { db } from "@/lib/db/client";
import { cabinets, users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { slugify } from "@/lib/slug";

export type CabinetFormState = { error?: string };

const shortId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "cabinet";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${shortId()}`;
    const [existing] = await db
      .select({ id: cabinets.id })
      .from(cabinets)
      .where(eq(cabinets.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `${root}-${shortId()}`;
}

export async function createCabinet(
  _prev: CabinetFormState,
  formData: FormData
): Promise<CabinetFormState> {
  const session = await getCurrentProfile();
  if (!session) {
    return { error: "Session expirée, reconnectez-vous." };
  }
  if (session.profile?.cabinetId) {
    redirect("/app");
  }

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  // Pays figé pendant la phase de lancement : Adili démarre au Cameroun.
  // On ignore toute valeur envoyée par le client et on force "Cameroun".
  const country = "Cameroun";

  if (name.length < 2) {
    return { error: "Renseignez le nom du cabinet (2 caractères minimum)." };
  }

  const slug = await uniqueSlug(name);

  const [created] = await db
    .insert(cabinets)
    .values({
      name,
      slug,
      ownerId: session.user.id,
      city: city || null,
      country: country || null,
    })
    .returning({ id: cabinets.id });

  if (!created) {
    return { error: "Création du cabinet impossible." };
  }

  // Garantit que la ligne `public.users` existe (le trigger n’a pas forcément
  // été appliqué pour les comptes créés avant) et lie le cabinet.
  const email = session.user.email;
  const fullName =
    (session.user.user_metadata?.full_name as string | undefined) ?? null;

  if (!email) {
    return {
      error: "Adresse e-mail introuvable — reconnectez-vous puis réessayez.",
    };
  }

  await db
    .insert(users)
    .values({
      id: session.user.id,
      email,
      fullName,
      cabinetId: created.id,
      role: "admin", // Le créateur du cabinet est admin par défaut.
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        cabinetId: created.id,
        email,
        fullName,
        role: "admin",
      },
    });

  const planRaw = String(formData.get("plan") ?? "individuel");
  const plan = planRaw === "cabinet" ? "cabinet" : "individuel";
  redirect(`/onboarding/abonnement?plan=${plan}`);
}
