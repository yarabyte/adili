import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { affaires, documents } from "@/lib/db/schema";
import {
  getEffectiveRole,
  hasPermission,
} from "@/lib/permissions/affaires";
import type { StatutDocument } from "@/lib/constants/statuts";

import { EditorAffaire } from "@/components/documents/editor-affaire";

export const dynamic = "force-dynamic";

export default async function DocumentEditorPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id: affaireId, docId } = await params;

  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    redirect("/connexion?next=/app");
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId))
    .limit(1);
  if (!doc || doc.affaireId !== affaireId) notFound();

  const [affaire] = await db
    .select({
      id: affaires.id,
      reference: affaires.reference,
      titre: affaires.intitule,
    })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);
  if (!affaire) notFound();

  const ctx = await getEffectiveRole(session, affaireId);
  if (!ctx || !hasPermission(ctx.role, "document", "voir")) {
    notFound();
  }

  const permissions = {
    canEdit: hasPermission(ctx.role, "document", "editer"),
    canSubmit: hasPermission(ctx.role, "document", "soumettre"),
    canValidate: hasPermission(ctx.role, "document", "valider"),
    canReopen: hasPermission(ctx.role, "document", "rouvrir"),
    canDelete: hasPermission(ctx.role, "document", "supprimer"),
  };

  return (
    <EditorAffaire
      document={{
        id: doc.id,
        affaireId: doc.affaireId,
        titre: doc.titre,
        typeDocument: doc.typeDocument,
        statut: doc.statut as StatutDocument,
        contenuTiptap: doc.contenuTiptap,
        contenuText: doc.contenuText,
        updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
      }}
      affaire={{
        id: affaire.id,
        reference: affaire.reference,
        titre: affaire.titre,
      }}
      permissions={permissions}
    />
  );
}
