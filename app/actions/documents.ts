"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documentVersions, documents } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { authorize } from "@/lib/permissions/affaires";
import { logAction } from "@/lib/audit/log";
import {
  forceReleaseLock,
  getCurrentLock,
} from "@/lib/documents/locking";
import { syncDocumentCitations } from "@/lib/documents/citations";
import {
  CreateDocumentZ,
  RejectDocumentZ,
  SaveDocumentZ,
} from "@/lib/validation/documents";

export type DocumentActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  documentId?: string;
  fieldErrors?: Record<string, string>;
};

function flatten(
  err: Record<string, string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(err)) {
    if (v && v[0]) out[k] = v[0];
  }
  return out;
}

/**
 * Document TipTap vide initial — un seul paragraphe vide.
 */
const EMPTY_TIPTAP_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;

// ─── Création ────────────────────────────────────────────────────
export async function createDocument(
  _prev: DocumentActionState,
  formData: FormData
): Promise<DocumentActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const parsed = CreateDocumentZ.safeParse({
    affaireId: String(formData.get("affaireId") ?? ""),
    typeDocument: String(formData.get("typeDocument") ?? ""),
    titre: String(formData.get("titre") ?? "").trim(),
  });
  if (!parsed.success) {
    return {
      error: "Vérifiez les champs en erreur.",
      fieldErrors: flatten(parsed.error.flatten().fieldErrors),
    };
  }
  const data = parsed.data;

  // Garde : autorisation `document.creer` sur l'affaire ciblée.
  const ctx = await authorize(session, data.affaireId, "document", "creer");
  if (!ctx) {
    return {
      error:
        "Action non autorisée — vous devez être responsable, contributeur ou admin du cabinet.",
    };
  }

  const [created] = await db
    .insert(documents)
    .values({
      affaireId: data.affaireId,
      typeDocument: data.typeDocument,
      titre: data.titre,
      contenuTiptap: EMPTY_TIPTAP_DOC,
      contenuText: "",
      statut: "brouillon",
      auteurId: session.user.id,
    })
    .returning({ id: documents.id });

  if (!created) return { error: "Création impossible." };

  await logAction({
    action: "document.cree",
    cabinetId: ctx.cabinetId,
    affaireId: data.affaireId,
    documentId: created.id,
    userId: session.user.id,
    metadata: { typeDocument: data.typeDocument, titre: data.titre },
  });

  revalidatePath(`/app/affaires/${data.affaireId}`);
  redirect(`/app/affaires/${data.affaireId}/documents/${created.id}`);
}

// ─── Sauvegarde (autosave ou manuel + snapshot) ──────────────────
export async function saveDocument(
  documentId: string,
  payload: { contenuTiptap: unknown; contenuText: string; createSnapshot?: boolean }
): Promise<DocumentActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  const parsed = SaveDocumentZ.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Charge utile invalide.",
      fieldErrors: flatten(parsed.error.flatten().fieldErrors),
    };
  }
  const data = parsed.data;

  const [doc] = await db
    .select({
      id: documents.id,
      affaireId: documents.affaireId,
      statut: documents.statut,
      verrouUserId: documents.verrouUserId,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return { error: "Document introuvable." };

  const ctx = await authorize(session, doc.affaireId, "document", "editer");
  if (!ctx) {
    return { error: "Action non autorisée — droits d'édition manquants." };
  }
  if (doc.statut === "valide" || doc.statut === "archive") {
    return {
      error: "Ce document est figé (validé ou archivé). Créez une nouvelle pièce.",
    };
  }
  if (doc.verrouUserId && doc.verrouUserId !== session.user.id) {
    return {
      error:
        "Le verrou est détenu par un autre rédacteur — vos modifications ne peuvent pas être enregistrées.",
    };
  }

  await db
    .update(documents)
    .set({
      contenuTiptap: data.contenuTiptap as object,
      contenuText: data.contenuText,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  // Resync de la table pivot citations (rapide : DELETE + INSERT)
  await syncDocumentCitations(documentId, data.contenuTiptap);

  if (data.createSnapshot) {
    await createVersionSnapshot({
      documentId,
      trigger: "manuel",
      userId: session.user.id,
      contenuTiptap: data.contenuTiptap,
      contenuText: data.contenuText,
    });
  }

  await logAction({
    action: data.createSnapshot ? "document.sauvegarde" : "document.edite",
    cabinetId: ctx.cabinetId,
    affaireId: doc.affaireId,
    documentId,
    userId: session.user.id,
  });

  revalidatePath(`/app/affaires/${doc.affaireId}/documents/${documentId}`);
  return { ok: true, documentId };
}

// ─── Soumission pour validation ──────────────────────────────────
export async function submitDocument(
  documentId: string
): Promise<DocumentActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const [doc] = await db
    .select({
      id: documents.id,
      affaireId: documents.affaireId,
      statut: documents.statut,
      contenuTiptap: documents.contenuTiptap,
      contenuText: documents.contenuText,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return { error: "Document introuvable." };

  const ctx = await authorize(session, doc.affaireId, "document", "soumettre");
  if (!ctx) return { error: "Action non autorisée." };
  if (doc.statut !== "brouillon" && doc.statut !== "rejete") {
    return {
      error: "Seuls les brouillons (ou pièces rejetées) peuvent être soumis.",
    };
  }

  await db
    .update(documents)
    .set({ statut: "en_revue", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  await forceReleaseLock(documentId);

  await createVersionSnapshot({
    documentId,
    trigger: "soumission",
    userId: session.user.id,
    contenuTiptap: doc.contenuTiptap,
    contenuText: doc.contenuText,
  });

  await logAction({
    action: "document.soumis",
    cabinetId: ctx.cabinetId,
    affaireId: doc.affaireId,
    documentId,
    userId: session.user.id,
  });

  revalidatePath(`/app/affaires/${doc.affaireId}/documents/${documentId}`);
  revalidatePath(`/app/affaires/${doc.affaireId}`);
  return { ok: true, documentId };
}

// ─── Validation (admin cabinet) ──────────────────────────────────
export async function validateDocument(
  documentId: string
): Promise<DocumentActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const [doc] = await db
    .select({
      id: documents.id,
      affaireId: documents.affaireId,
      statut: documents.statut,
      contenuTiptap: documents.contenuTiptap,
      contenuText: documents.contenuText,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return { error: "Document introuvable." };

  const ctx = await authorize(session, doc.affaireId, "document", "valider");
  if (!ctx) {
    return {
      error: "Seul un administrateur du cabinet peut valider une pièce.",
    };
  }
  if (doc.statut !== "en_revue") {
    return { error: "Seules les pièces en revue peuvent être validées." };
  }

  await db
    .update(documents)
    .set({
      statut: "valide",
      validateurId: session.user.id,
      valideAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  await forceReleaseLock(documentId);

  await createVersionSnapshot({
    documentId,
    trigger: "validation",
    userId: session.user.id,
    contenuTiptap: doc.contenuTiptap,
    contenuText: doc.contenuText,
  });

  await logAction({
    action: "document.valide",
    cabinetId: ctx.cabinetId,
    affaireId: doc.affaireId,
    documentId,
    userId: session.user.id,
  });

  revalidatePath(`/app/affaires/${doc.affaireId}/documents/${documentId}`);
  revalidatePath(`/app/affaires/${doc.affaireId}`);
  return { ok: true, documentId };
}

// ─── Rejet (admin cabinet) ───────────────────────────────────────
export async function rejectDocument(
  documentId: string,
  payload: { raison: string }
): Promise<DocumentActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const parsed = RejectDocumentZ.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Motif invalide.",
      fieldErrors: flatten(parsed.error.flatten().fieldErrors),
    };
  }

  const [doc] = await db
    .select({
      id: documents.id,
      affaireId: documents.affaireId,
      statut: documents.statut,
      contenuTiptap: documents.contenuTiptap,
      contenuText: documents.contenuText,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return { error: "Document introuvable." };

  const ctx = await authorize(session, doc.affaireId, "document", "rejeter");
  if (!ctx) {
    return {
      error: "Seul un administrateur du cabinet peut rejeter une pièce.",
    };
  }
  if (doc.statut !== "en_revue") {
    return { error: "Seules les pièces en revue peuvent être rejetées." };
  }

  await db
    .update(documents)
    .set({ statut: "rejete", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  await forceReleaseLock(documentId);

  await createVersionSnapshot({
    documentId,
    trigger: "rejet",
    userId: session.user.id,
    contenuTiptap: doc.contenuTiptap,
    contenuText: doc.contenuText,
  });

  await logAction({
    action: "document.rejete",
    cabinetId: ctx.cabinetId,
    affaireId: doc.affaireId,
    documentId,
    userId: session.user.id,
    metadata: { raison: parsed.data.raison },
  });

  revalidatePath(`/app/affaires/${doc.affaireId}/documents/${documentId}`);
  revalidatePath(`/app/affaires/${doc.affaireId}`);
  return { ok: true, documentId };
}

// ─── Rouvrir en brouillon (admin cabinet) ────────────────────────
/**
 * Permet à un administrateur de remettre un document `valide` ou `rejete`
 * au statut `brouillon` afin de le reprendre. Utile lorsqu'une validation
 * a été enregistrée sur une pièce vide ou incomplète, ou pour corriger
 * une erreur après coup.
 */
export async function reopenDocument(
  documentId: string
): Promise<DocumentActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const [doc] = await db
    .select({
      id: documents.id,
      affaireId: documents.affaireId,
      statut: documents.statut,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return { error: "Document introuvable." };

  const ctx = await authorize(session, doc.affaireId, "document", "rouvrir");
  if (!ctx) {
    return {
      error: "Seul un administrateur du cabinet peut rouvrir un document.",
    };
  }
  if (doc.statut !== "valide" && doc.statut !== "rejete") {
    return {
      error:
        "Seuls les documents validés ou rejetés peuvent être rouverts en brouillon.",
    };
  }

  await db
    .update(documents)
    .set({
      statut: "brouillon",
      validateurId: null,
      valideAt: null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  await forceReleaseLock(documentId);

  await logAction({
    action: "document.reouvert",
    cabinetId: ctx.cabinetId,
    affaireId: doc.affaireId,
    documentId,
    userId: session.user.id,
    metadata: { previous_statut: doc.statut },
  });

  revalidatePath(`/app/affaires/${doc.affaireId}/documents/${documentId}`);
  revalidatePath(`/app/affaires/${doc.affaireId}`);
  return { ok: true, documentId };
}

// ─── Suppression (admin cabinet) ─────────────────────────────────
export async function deleteDocument(
  documentId: string
): Promise<DocumentActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) return { error: "Session expirée." };

  const [doc] = await db
    .select({ id: documents.id, affaireId: documents.affaireId, titre: documents.titre })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return { error: "Document introuvable." };

  const ctx = await authorize(session, doc.affaireId, "document", "supprimer");
  if (!ctx) {
    return {
      error: "Seul un administrateur du cabinet peut supprimer une pièce.",
    };
  }

  await db.delete(documents).where(eq(documents.id, documentId));

  await logAction({
    action: "document.supprime",
    cabinetId: ctx.cabinetId,
    affaireId: doc.affaireId,
    documentId: null, // doc supprimé → FK perdue
    userId: session.user.id,
    metadata: { deleted_document_id: documentId, titre: doc.titre },
  });

  revalidatePath(`/app/affaires/${doc.affaireId}`);
  return { ok: true };
}

// ─── Helpers internes ────────────────────────────────────────────
async function createVersionSnapshot(opts: {
  documentId: string;
  trigger: "soumission" | "validation" | "rejet" | "manuel";
  userId: string;
  contenuTiptap: unknown;
  contenuText: string | null;
}): Promise<void> {
  // Numéro de version = max(version_num) + 1 par document.
  const [last] = await db
    .select({ next: sql<number>`coalesce(max(${documentVersions.versionNum}), 0)::int + 1` })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, opts.documentId));
  const nextNum = Number(last?.next ?? 1);

  await db
    .insert(documentVersions)
    .values({
      documentId: opts.documentId,
      contenuTiptap: opts.contenuTiptap as object,
      contenuText: opts.contenuText ?? null,
      versionNum: nextNum,
      trigger: opts.trigger,
      createdBy: opts.userId,
    })
    .onConflictDoNothing({
      target: [documentVersions.documentId, documentVersions.versionNum],
    });
}

// ─── (helper exporté pour la timeline éventuelle) ─────────────────
export async function listVersions(documentId: string) {
  return db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNum));
}

/**
 * "Demander la main" — quand le verrou est tenu par quelqu'un d'autre,
 * permet à un membre de signaler son besoin d'éditer.
 *
 * Au MVP, on se contente de logger l'événement dans `audit_log` (les
 * notifications email arriveront avec le module Échéances/Email, point 8/9
 * du brief).
 */
export async function requestLockHandover(
  documentId: string
): Promise<DocumentActionState> {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée." };
  }

  // Vérifier que l'utilisateur a au moins le droit d'éditer le document
  // (sinon, pas la peine de demander la main).
  const [doc] = await db
    .select({ id: documents.id, affaireId: documents.affaireId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) return { error: "Document introuvable." };

  const ctx = await authorize(session, doc.affaireId, "document", "editer");
  if (!ctx) {
    return {
      error:
        "Vous n'avez pas les droits pour éditer ce document — la demande de main est inutile.",
    };
  }

  const current = await getCurrentLock(documentId);
  if (!current || current.status === "free") {
    return {
      message:
        "Le verrou est déjà libre. Recharger la page pour le récupérer.",
    };
  }
  if (current.holder.userId === session.user.id) {
    return { message: "Vous détenez déjà le verrou." };
  }

  // TODO (point 8/9) : envoyer un email/notification au détenteur via Resend/SMTP.
  await logAction({
    action: "document.verrou_pris", // pas de clé dédiée → on réutilise avec metadata.kind
    cabinetId: ctx.cabinetId,
    affaireId: doc.affaireId,
    documentId,
    userId: session.user.id,
    metadata: {
      kind: "handover_request",
      requested_from: current.holder.userId,
      holder_since: current.since.toISOString(),
    },
  });

  return {
    ok: true,
    message: `Demande envoyée à ${current.holder.fullName ?? current.holder.email}. L'envoi par email arrivera bientôt — pour l'instant, contactez-le directement.`,
  };
}
