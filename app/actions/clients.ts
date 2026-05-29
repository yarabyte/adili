"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { cabinets, clients } from "@/lib/db/schema";
import { getCurrentProfile, isCabinetOwner } from "@/lib/auth/profile";
import { CreateClientZ, UpdateClientZ } from "@/lib/validation/affaires";

export type ClientActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  clientId?: string;
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

function revalidateClientPaths(clientId?: string) {
  revalidatePath("/app/clients");
  revalidatePath("/app/affaires/nouvelle");
  if (clientId) revalidatePath(`/app/clients/${clientId}`);
}

async function assertCabinetOwnerCanDelete(
  session: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>
): Promise<ClientActionState | null> {
  const cabinetId = session.profile?.cabinetId;
  if (!cabinetId) return { error: "Session expirée ou cabinet manquant." };

  const [cabinet] = await db
    .select({ ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, cabinetId))
    .limit(1);

  if (!cabinet || !isCabinetOwner(session, cabinet)) {
    return {
      error: "Seul le propriétaire du cabinet peut supprimer un client.",
    };
  }

  return null;
}

export async function createClient(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée ou cabinet manquant." };
  }

  const raw = {
    nom: String(formData.get("nom") ?? "").trim(),
    type: (formData.get("type") as string) || undefined,
    contact: {
      email: (formData.get("contact.email") as string) || undefined,
      tel: (formData.get("contact.tel") as string) || undefined,
      adresse: (formData.get("contact.adresse") as string) || undefined,
      rccm: (formData.get("contact.rccm") as string) || undefined,
      nif: (formData.get("contact.nif") as string) || undefined,
    },
  };

  const parsed = CreateClientZ.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Vérifiez les champs en erreur.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const [created] = await db
    .insert(clients)
    .values({
      cabinetId: session.profile.cabinetId,
      nom: parsed.data.nom,
      type: parsed.data.type ?? null,
      contact: parsed.data.contact ?? null,
    })
    .returning({ id: clients.id });

  if (!created) return { error: "Création du client impossible." };

  revalidateClientPaths(created.id);
  return { ok: true, clientId: created.id };
}

export async function updateClient(
  clientId: string,
  patch: unknown
): Promise<ClientActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée ou cabinet manquant." };
  }

  const parsed = UpdateClientZ.safeParse(patch);
  if (!parsed.success) {
    return {
      error: "Données invalides.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const result = await db
    .update(clients)
    .set({
      ...(parsed.data.nom !== undefined ? { nom: parsed.data.nom } : {}),
      ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
      ...(parsed.data.contact !== undefined
        ? { contact: parsed.data.contact }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.cabinetId, session.profile.cabinetId)
      )
    )
    .returning({ id: clients.id });

  if (result.length === 0) {
    return { error: "Client introuvable dans votre cabinet." };
  }

  revalidateClientPaths(clientId);
  return { ok: true, clientId };
}

export async function deleteClient(
  clientId: string
): Promise<ClientActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée ou cabinet manquant." };
  }

  const ownerError = await assertCabinetOwnerCanDelete(session);
  if (ownerError) return ownerError;

  try {
    const result = await db
      .delete(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.cabinetId, session.profile.cabinetId)
        )
      )
      .returning({ id: clients.id });

    if (result.length === 0) {
      return { error: "Client introuvable dans votre cabinet." };
    }
  } catch (err) {
    // FK contrainte (affaires liées) → on bloque la suppression.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("violates foreign key")) {
      return {
        error:
          "Impossible : ce client est rattaché à au moins une affaire. Archivez plutôt les affaires.",
      };
    }
    return { error: "Suppression impossible." };
  }

  revalidateClientPaths();
  return { ok: true };
}
