import {
  buildCabinetFooterRightHtml,
  buildCabinetLetterheadHtml,
} from "./cabinet-print-identity";
import type { DocumentPrintModel } from "./document-print-model";

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Document HTML complet (styles inclus) pour Puppeteer / impression.
 */
export function buildPrintHtml(
  model: DocumentPrintModel,
  printCss: string
): string {
  const {
    document: doc,
    affaire,
    cabinet,
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
  } = model;

  const bodyContent = isEmpty
    ? '<p style="text-align:center;color:#888;font-style:italic;">— Document sans contenu —</p>'
    : bodyHtml;

  const authorMeta = authorName
    ? `<span class="print-doc__meta-sep">·</span> Rédacteur : ${escapeHtmlText(authorName)}`
    : "";

  const watermark =
    isDraftLike && watermarkText
      ? `<div class="print-doc__watermark"><strong>${escapeHtmlText(watermarkText)}</strong></div>`
      : "";

  const signature =
    !isEmpty
      ? `<section class="print-doc__signature">
          ${
            isFinal && validatorName && validatedDate
              ? `<div class="print-doc__signature-validated">
                  <span class="print-doc__signature-validated-label">Validation interne</span>
                  Validé le ${escapeHtmlText(validatedDate)} par ${escapeHtmlText(validatorName)}${
                    doc.statut === "archive" ? " — Pièce archivée" : ""
                  }.
                </div>`
              : ""
          }
          <p class="print-doc__signature-meta">Fait à ${escapeHtmlText(signatureCity)}, le ${escapeHtmlText(exportDate)}.</p>
          ${
            authorName
              ? `<div class="print-doc__signature-block">
                  <span class="print-doc__signature-name">
                    ${escapeHtmlText(authorName)}
                    <span class="print-doc__signature-role">${
                      isFinal ? "Auteur du document" : "Rédacteur"
                    }</span>
                  </span>
                </div>`
              : ""
          }
        </section>`
      : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtmlText(doc.titre)} — Adili</title>
  <style>${printCss}</style>
</head>
<body>
  <article class="print-shell">
    <header class="print-doc__header">
      ${buildCabinetLetterheadHtml(cabinet, escapeHtmlText)}
      <h1 class="print-doc__title">${escapeHtmlText(doc.titre)}</h1>
      <p class="print-doc__meta">
        <strong>${escapeHtmlText(affaire.reference)}</strong>
        <span class="print-doc__meta-sep">·</span>
        ${escapeHtmlText(affaire.intitule)}
        <span class="print-doc__meta-sep">·</span>
        ${escapeHtmlText(doc.typeLabel)}
        <span class="print-doc__meta-sep">·</span>
        ${escapeHtmlText(doc.statutLabel)}
        ${authorMeta}
      </p>
    </header>
    ${watermark}
    <div class="print-doc__body">${bodyContent}</div>
    ${signature}
    <footer class="print-doc__footer">
      <span>Document généré le ${escapeHtmlText(exportDate)} via Adili — espace de production juridique</span>
      <span>${buildCabinetFooterRightHtml(cabinet, escapeHtmlText)}</span>
    </footer>
  </article>
</body>
</html>`;
}
