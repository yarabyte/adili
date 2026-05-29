import { and, desc, eq, notInArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";
import { CORRESPONDANCE_TYPES } from "@/lib/documents/correspondance";
import type { StatutDocument } from "@/lib/constants/statuts";
import { formatMemberDisplayName } from "@/lib/users/display-name";

import {
  DocumentsPanelClient,
  type DocumentRow,
} from "./documents-panel-client";

export async function DocumentsPanel({
  affaireId,
  canCreate,
}: {
  affaireId: string;
  canCreate: boolean;
}) {
  const rows = await db
    .select({
      id: documents.id,
      titre: documents.titre,
      typeDocument: documents.typeDocument,
      statut: documents.statut,
      updatedAt: documents.updatedAt,
      auteurId: documents.auteurId,
      auteurName: users.fullName,
      auteurEmail: users.email,
      auteurTitre: users.titre,
    })
    .from(documents)
    .leftJoin(users, eq(users.id, documents.auteurId))
    .where(
      and(
        eq(documents.affaireId, affaireId),
        notInArray(documents.typeDocument, [...CORRESPONDANCE_TYPES])
      )
    )
    .orderBy(desc(documents.updatedAt));

  const list: DocumentRow[] = rows.map((doc) => ({
    id: doc.id,
    titre: doc.titre,
    typeDocument: doc.typeDocument,
    statut: doc.statut as StatutDocument,
    updatedAt: doc.updatedAt.toISOString(),
    auteurId: doc.auteurId,
    auteurName: doc.auteurName
      ? formatMemberDisplayName(
          doc.auteurName,
          doc.auteurEmail,
          doc.auteurTitre
        )
      : null,
    auteurEmail: doc.auteurEmail,
  }));

  return (
    <DocumentsPanelClient
      affaireId={affaireId}
      documents={list}
      canCreate={canCreate}
    />
  );
}
