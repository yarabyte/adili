"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  affaireMembres,
  affaires,
  cabinets,
  clients,
  users,
} from "@/lib/db/schema";
import { getCurrentProfile, isCabinetAdmin } from "@/lib/auth/profile";
import { authorize, getEffectiveRole } from "@/lib/permissions/affaires";
import {
  CreateAffaireZ,
  CreateClientZ,
  UpdateAffaireZ,
} from "@/lib/validation/affaires";
import {
  generateAffaireReference,
  isReferenceAvailable,
} from "@/lib/affaires/reference";
import { logAction } from "@/lib/audit/log";

export type AffaireActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  affaireId?: string;
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

// ─── CREATE ───────────────────────────────────────────────────────
export async function createAffaire(
  _prev: AffaireActionState,
  formData: FormData
): Promise<AffaireActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée ou cabinet manquant." };
  }
  const cabinetId = session.profile.cabinetId;

  const adversairesRaw = String(formData.get("adversaires") ?? "").trim();
  let adversaires: unknown = [];
  if (adversairesRaw) {
    try {
      adversaires = JSON.parse(adversairesRaw);
    } catch {
      return {
        error: "Format des adversaires invalide.",
        fieldErrors: { adversaires: "JSON invalide." },
      };
    }
  }

  // Mode client : "existing" (clientId fourni) ou "new" (champs newClient.*)
  const clientMode = String(formData.get("clientMode") ?? "existing");
  let resolvedClientId = String(formData.get("clientId") ?? "");

  if (clientMode === "new") {
    const newClientRaw = {
      nom: String(formData.get("newClientNom") ?? "").trim(),
      type:
        (formData.get("newClientType") as string | null) || undefined,
      contact: {
        email:
          (formData.get("newClientEmail") as string | null) || undefined,
        tel: (formData.get("newClientTel") as string | null) || undefined,
        adresse:
          (formData.get("newClientAdresse") as string | null) || undefined,
        rccm:
          (formData.get("newClientRccm") as string | null) || undefined,
        nif: (formData.get("newClientNif") as string | null) || undefined,
      },
    };
    const parsedClient = CreateClientZ.safeParse(newClientRaw);
    if (!parsedClient.success) {
      return {
        error: "Vérifiez les informations du nouveau client.",
        fieldErrors: flattenFieldErrors(
          parsedClient.error.flatten().fieldErrors
        ),
      };
    }
    const [createdClient] = await db
      .insert(clients)
      .values({
        cabinetId,
        nom: parsedClient.data.nom,
        type: parsedClient.data.type ?? null,
        contact: parsedClient.data.contact ?? null,
      })
      .returning({ id: clients.id });
    if (!createdClient) {
      return { error: "Création du client impossible." };
    }
    resolvedClientId = createdClient.id;
  }

  const raw = {
    reference: (formData.get("reference") as string)?.trim() || undefined,
    intitule: String(formData.get("intitule") ?? "").trim(),
    typeContentieux: formData.get("typeContentieux") as string,
    juridiction: (formData.get("juridiction") as string)?.trim() || null,
    clientId: resolvedClientId,
    adversaires,
    dateOuverture:
      (formData.get("dateOuverture") as string)?.trim() || undefined,
    confidentialite: (formData.get("confidentialite") as string) || undefined,
    responsableId:
      String(formData.get("responsableId") ?? "") || session.user.id,
  };

  const parsed = CreateAffaireZ.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Vérifiez les champs en erreur.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  const data = parsed.data;

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, data.clientId), eq(clients.cabinetId, cabinetId)))
    .limit(1);
  if (!client) {
    return {
      error: "Client invalide.",
      fieldErrors: { clientId: "Client introuvable dans votre cabinet." },
    };
  }

  const [responsable] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, data.responsableId), eq(users.cabinetId, cabinetId)))
    .limit(1);
  if (!responsable) {
    return {
      error: "Responsable invalide.",
      fieldErrors: {
        responsableId: "Le responsable doit appartenir à votre cabinet.",
      },
    };
  }

  const reference = data.reference && data.reference.length > 0 ? data.reference : null;
  if (reference) {
    const free = await isReferenceAvailable(cabinetId, reference);
    if (!free) {
      return {
        error: "Référence déjà utilisée dans ce cabinet.",
        fieldErrors: { reference: "Cette référence est déjà prise." },
      };
    }
  }

  let created: { id: string } | undefined;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const ref = reference ?? (await generateAffaireReference(cabinetId));
    try {
      [created] = await db
        .insert(affaires)
        .values({
          cabinetId,
          reference: ref,
          intitule: data.intitule,
          typeContentieux: data.typeContentieux,
          juridiction: data.juridiction ?? null,
          clientId: data.clientId,
          adversaires: data.adversaires ?? [],
          dateOuverture: data.dateOuverture ?? new Date().toISOString().slice(0, 10),
          confidentialite: data.confidentialite ?? "standard",
          responsableId: data.responsableId,
          createdBy: session.user.id,
        })
        .returning({ id: affaires.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isDup =
        msg.includes("affaires_cabinet_reference_uniq") ||
        msg.includes("duplicate key");
      if (!isDup) throw err;
      // Collision (concurrence) → on régénère sauf si l'utilisateur a
      // explicitement fourni la référence.
      if (reference) {
        return {
          error: "Référence déjà utilisée dans ce cabinet.",
          fieldErrors: { reference: "Cette référence est déjà prise." },
        };
      }
    }
  }

  if (!created) {
    return { error: "Création impossible — réessayez." };
  }

  // Le responsable est automatiquement ajouté comme membre `responsable`.
  await db
    .insert(affaireMembres)
    .values({
      affaireId: created.id,
      userId: data.responsableId,
      role: "responsable",
      addedBy: session.user.id,
    })
    .onConflictDoNothing();

  await logAction({
    action: "affaire.creee",
    cabinetId,
    affaireId: created.id,
    userId: session.user.id,
    metadata: {
      intitule: data.intitule,
      typeContentieux: data.typeContentieux,
      confidentialite: data.confidentialite ?? "standard",
    },
  });

  revalidatePath("/app/affaires");
  // redirect() lance une exception NEXT_REDIRECT — la suite n'est jamais exécutée.
  redirect(`/app/affaires/${created.id}`);
}

// ─── UPDATE ───────────────────────────────────────────────────────
export async function updateAffaire(
  affaireId: string,
  patch: unknown
): Promise<AffaireActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée ou cabinet manquant." };
  }

  const ctx = await authorize(session, affaireId, "affaire", "modifier");
  if (!ctx) {
    return {
      error: "Action non autorisée sur cette affaire.",
    };
  }

  const parsed = UpdateAffaireZ.safeParse(patch);
  if (!parsed.success) {
    return {
      error: "Vérifiez les champs en erreur.",
      fieldErrors: flattenFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  const data = parsed.data;

  // Si on change le client, vérifier qu'il appartient au même cabinet.
  if (data.clientId) {
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, data.clientId),
          eq(clients.cabinetId, ctx.cabinetId)
        )
      )
      .limit(1);
    if (!client) {
      return {
        error: "Client invalide.",
        fieldErrors: { clientId: "Client introuvable dans votre cabinet." },
      };
    }
  }

  // Idem pour responsable.
  if (data.responsableId) {
    const [resp] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, data.responsableId),
          eq(users.cabinetId, ctx.cabinetId)
        )
      )
      .limit(1);
    if (!resp) {
      return {
        error: "Responsable invalide.",
        fieldErrors: {
          responsableId: "Le responsable doit appartenir à votre cabinet.",
        },
      };
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.intitule !== undefined) updates.intitule = data.intitule;
  if (data.typeContentieux !== undefined)
    updates.typeContentieux = data.typeContentieux;
  if (data.juridiction !== undefined) updates.juridiction = data.juridiction;
  if (data.clientId !== undefined) updates.clientId = data.clientId;
  if (data.adversaires !== undefined) updates.adversaires = data.adversaires;
  if (data.statut !== undefined) updates.statut = data.statut;
  if (data.confidentialite !== undefined)
    updates.confidentialite = data.confidentialite;
  if (data.responsableId !== undefined)
    updates.responsableId = data.responsableId;

  await db.update(affaires).set(updates).where(eq(affaires.id, affaireId));

  await logAction({
    action: "affaire.modifiee",
    cabinetId: ctx.cabinetId,
    affaireId,
    userId: session.user.id,
    metadata: { fields: Object.keys(updates).filter((k) => k !== "updatedAt") },
  });

  revalidatePath("/app/affaires");
  revalidatePath(`/app/affaires/${affaireId}`);
  return { ok: true, affaireId };
}

// ─── ARCHIVER / CLÔTURER (raccourcis de update) ───────────────────
async function setStatut(
  affaireId: string,
  statut: "archive" | "clos" | "ouvert" | "en_cours",
  auditAction: "affaire.archivee" | "affaire.cloturee" | "affaire.reouverte"
): Promise<AffaireActionState> {
  const session = await getCurrentProfile();
  if (!session) return { error: "Session expirée." };

  const ctx = await authorize(session, affaireId, "affaire", "modifier");
  if (!ctx) return { error: "Action non autorisée." };

  await db
    .update(affaires)
    .set({ statut, updatedAt: new Date() })
    .where(eq(affaires.id, affaireId));

  await logAction({
    action: auditAction,
    cabinetId: ctx.cabinetId,
    affaireId,
    userId: session.user.id,
  });

  revalidatePath("/app/affaires");
  revalidatePath(`/app/affaires/${affaireId}`);
  return { ok: true, affaireId };
}

export async function archiveAffaire(affaireId: string) {
  return setStatut(affaireId, "archive", "affaire.archivee");
}

export async function closeAffaire(affaireId: string) {
  return setStatut(affaireId, "clos", "affaire.cloturee");
}

export async function reopenAffaire(affaireId: string) {
  return setStatut(affaireId, "en_cours", "affaire.reouverte");
}

// ─── DELETE (admin cabinet seulement) ─────────────────────────────
export async function deleteAffaire(
  affaireId: string
): Promise<AffaireActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée ou cabinet manquant." };
  }

  // `supprimer` n'est autorisé qu'à `admin_cabinet`. On s'appuie sur la
  // matrice via authorize().
  const ctx = await authorize(session, affaireId, "affaire", "supprimer");
  if (!ctx) {
    return {
      error: "Seul un administrateur du cabinet peut supprimer une affaire.",
    };
  }

  // Double sécurité : vérifier que l'utilisateur est bien admin du cabinet
  // côté `users.role` ou `cabinets.ownerId` (cohérent avec isCabinetAdmin).
  const [cabinet] = await db
    .select({ id: cabinets.id, ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, ctx.cabinetId))
    .limit(1);
  if (!cabinet || !isCabinetAdmin(session, cabinet)) {
    return {
      error: "Seul un administrateur du cabinet peut supprimer une affaire.",
    };
  }

  await db.delete(affaires).where(eq(affaires.id, affaireId));

  await logAction({
    action: "affaire.archivee",
    cabinetId: ctx.cabinetId,
    affaireId: null, // affaire supprimée, on perd la FK
    userId: session.user.id,
    metadata: { hard_delete: true, deleted_id: affaireId },
  });

  revalidatePath("/app/affaires");
  return { ok: true };
}

// ─── Utilitaire pour récupérer le rôle effectif côté client/server ─
export { getEffectiveRole };
