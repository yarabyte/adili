import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaires, cabinets, documents, users } from "@/lib/db/schema";
import { LABELS_DOCUMENTS } from "@/lib/constants/types-documents";
import { STATUTS_DOCUMENT_LABEL } from "@/lib/constants/statuts";
import { tiptapToHtml } from "@/lib/documents/tiptap/serialize-html";
import { formatMemberDisplayName } from "@/lib/users/display-name";

import type { DocumentPrintModel } from "./document-print-model";

function formatLongDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function loadDocumentPrintData(
  docId: string,
  affaireId: string
): Promise<DocumentPrintModel | null> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId))
    .limit(1);
  if (!doc || doc.affaireId !== affaireId) return null;

  const [affaireRow] = await db
    .select({
      reference: affaires.reference,
      intitule: affaires.intitule,
      cabinetId: affaires.cabinetId,
    })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);
  if (!affaireRow) return null;

  const [cabinet] = await db
    .select({
      name: cabinets.name,
      city: cabinets.city,
      logoUrl: cabinets.logoUrl,
      address: cabinets.address,
      phone: cabinets.phone,
      registreCommerce: cabinets.registreCommerce,
      niu: cabinets.niu,
    })
    .from(cabinets)
    .where(eq(cabinets.id, affaireRow.cabinetId))
    .limit(1);

  const [author] = doc.auteurId
    ? await db
        .select({
          fullName: users.fullName,
          email: users.email,
          titre: users.titre,
        })
        .from(users)
        .where(eq(users.id, doc.auteurId))
        .limit(1)
    : [undefined];

  const [validator] = doc.validateurId
    ? await db
        .select({
          fullName: users.fullName,
          email: users.email,
          titre: users.titre,
        })
        .from(users)
        .where(eq(users.id, doc.validateurId))
        .limit(1)
    : [undefined];

  const typeLabel =
    LABELS_DOCUMENTS[doc.typeDocument as keyof typeof LABELS_DOCUMENTS] ??
    doc.typeDocument;
  const statutLabel =
    STATUTS_DOCUMENT_LABEL[doc.statut as keyof typeof STATUTS_DOCUMENT_LABEL] ??
    doc.statut;

  const bodyHtml = tiptapToHtml(doc.contenuTiptap);
  const isEmpty = bodyHtml.trim().length === 0;

  const authorName = author
    ? formatMemberDisplayName(author.fullName, author.email, author.titre)
    : null;
  const validatorName = validator
    ? formatMemberDisplayName(
        validator.fullName,
        validator.email,
        validator.titre
      )
    : null;
  const exportDate = formatLongDate(new Date());
  const validatedDate = doc.valideAt ? formatLongDate(doc.valideAt) : null;
  const signatureCity = cabinet?.city?.trim() || "—";

  const isDraftLike =
    doc.statut === "brouillon" ||
    doc.statut === "en_revue" ||
    doc.statut === "rejete";
  const isFinal = doc.statut === "valide" || doc.statut === "archive";

  const watermarkText =
    doc.statut === "brouillon"
      ? "Document de travail — Ne pas diffuser"
      : doc.statut === "en_revue"
        ? "Document en revue — Version non définitive"
        : doc.statut === "rejete"
          ? "Document rejeté — En attente de révision"
          : null;

  return {
    document: {
      id: doc.id,
      titre: doc.titre,
      typeLabel,
      statutLabel,
      statut: doc.statut,
    },
    affaire: {
      reference: affaireRow.reference,
      intitule: affaireRow.intitule,
    },
    cabinet: {
      name: cabinet?.name ?? "Cabinet Adili",
      city: signatureCity,
      logoUrl: cabinet?.logoUrl ?? null,
      address: cabinet?.address ?? null,
      phone: cabinet?.phone ?? null,
      registreCommerce: cabinet?.registreCommerce ?? null,
      niu: cabinet?.niu ?? null,
    },
    authorName,
    validatorName,
    exportDate,
    validatedDate,
    signatureCity,
    bodyHtml,
    isEmpty,
    watermarkText,
    isDraftLike,
    isFinal,
  };
}
