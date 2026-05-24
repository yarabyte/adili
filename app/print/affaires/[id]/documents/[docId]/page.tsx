import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { affaires, cabinets, documents, users } from "@/lib/db/schema";
import {
  getEffectiveRole,
  hasPermission,
} from "@/lib/permissions/affaires";
import { logAction } from "@/lib/audit/log";
import { tiptapToHtml } from "@/lib/documents/tiptap/serialize-html";
import { LABELS_DOCUMENTS } from "@/lib/constants/types-documents";
import { STATUTS_DOCUMENT_LABEL } from "@/lib/constants/statuts";

import {
  CabinetPrintLetterhead,
  cabinetPrintFooterRight,
} from "@/components/documents/cabinet-print-letterhead";
import type { CabinetPrintIdentity } from "@/lib/documents/pdf/cabinet-print-identity";

import { PrintTrigger } from "./print-trigger";

export const dynamic = "force-dynamic";

function formatLongDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function PrintDocumentPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id: affaireId, docId } = await params;

  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    redirect(`/connexion?next=/print/affaires/${affaireId}/documents/${docId}`);
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId))
    .limit(1);
  if (!doc || doc.affaireId !== affaireId) notFound();

  const [affaireRow] = await db
    .select({
      id: affaires.id,
      reference: affaires.reference,
      intitule: affaires.intitule,
      cabinetId: affaires.cabinetId,
      responsableId: affaires.responsableId,
    })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);
  if (!affaireRow) notFound();

  const ctx = await getEffectiveRole(session, affaireId);
  if (!ctx || !hasPermission(ctx.role, "document", "voir")) {
    notFound();
  }

  // Données enrichies pour l'en-tête papier (cabinet, auteur, responsable).
  const [cabinetRow] = await db
    .select({
      id: cabinets.id,
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

  const signatureCity = cabinetRow?.city?.trim() || "—";
  const cabinet: CabinetPrintIdentity = {
    name: cabinetRow?.name ?? "Cabinet Adili",
    city: signatureCity,
    logoUrl: cabinetRow?.logoUrl ?? null,
    address: cabinetRow?.address ?? null,
    phone: cabinetRow?.phone ?? null,
    registreCommerce: cabinetRow?.registreCommerce ?? null,
    niu: cabinetRow?.niu ?? null,
  };

  const [author] = doc.auteurId
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, doc.auteurId))
        .limit(1)
    : [undefined];

  const [validator] = doc.validateurId
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, doc.validateurId))
        .limit(1)
    : [undefined];

  // Audit fire-and-forget : on trace l'export par utilisateur.
  void logAction({
    action: "document.exporte_pdf",
    cabinetId: ctx.cabinetId,
    affaireId,
    documentId: docId,
    userId: session.user.id,
    metadata: { titre: doc.titre, statut: doc.statut },
  });

  const typeLabel =
    LABELS_DOCUMENTS[doc.typeDocument as keyof typeof LABELS_DOCUMENTS] ??
    doc.typeDocument;
  const statutLabel =
    STATUTS_DOCUMENT_LABEL[doc.statut as keyof typeof STATUTS_DOCUMENT_LABEL] ??
    doc.statut;

  const bodyHtml = tiptapToHtml(doc.contenuTiptap);
  const isEmpty = bodyHtml.trim().length === 0;

  const authorName = author?.fullName || author?.email || null;
  const validatorName = validator?.fullName || validator?.email || null;
  const exportDate = formatLongDate(new Date());
  const validatedDate = doc.valideAt ? formatLongDate(doc.valideAt) : null;
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

  return (
    <>
      <PrintTrigger documentTitle={doc.titre} />

      <article className="print-shell">
        <header className="print-doc__header">
          <CabinetPrintLetterhead cabinet={cabinet} />
          <h1 className="print-doc__title">{doc.titre}</h1>
          <p className="print-doc__meta">
            <strong>{affaireRow.reference}</strong>
            <span className="print-doc__meta-sep">·</span>
            {affaireRow.intitule}
            <span className="print-doc__meta-sep">·</span>
            {typeLabel}
            <span className="print-doc__meta-sep">·</span>
            {statutLabel}
            {authorName && (
              <>
                <span className="print-doc__meta-sep">·</span>
                Rédacteur : {authorName}
              </>
            )}
          </p>
        </header>

        {isDraftLike && watermarkText && (
          <div className="print-doc__watermark">
            <strong>{watermarkText}</strong>
          </div>
        )}

        <div
          className="print-doc__body"
          dangerouslySetInnerHTML={{
            __html: isEmpty
              ? '<p style="text-align:center;color:#888;font-style:italic;">— Document sans contenu —</p>'
              : bodyHtml,
          }}
        />

        {!isEmpty && (
          <section className="print-doc__signature">
            {isFinal && validatorName && validatedDate && (
              <div className="print-doc__signature-validated">
                <span className="print-doc__signature-validated-label">
                  Validation interne
                </span>
                Validé le {validatedDate} par {validatorName}
                {doc.statut === "archive" ? " — Pièce archivée" : ""}.
              </div>
            )}

            <p className="print-doc__signature-meta">
              Fait à {signatureCity}, le {exportDate}.
            </p>

            {authorName && (
              <div className="print-doc__signature-block">
                <span className="print-doc__signature-name">
                  {authorName}
                  <span className="print-doc__signature-role">
                    {isFinal ? "Auteur du document" : "Rédacteur"}
                  </span>
                </span>
              </div>
            )}
          </section>
        )}

        <footer className="print-doc__footer">
          <span>
            Document généré le {exportDate} via Adili — espace de production
            juridique
          </span>
          <span>{cabinetPrintFooterRight(cabinet)}</span>
        </footer>
      </article>
    </>
  );
}
