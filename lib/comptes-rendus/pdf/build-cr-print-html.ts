import {
  buildCabinetFooterRightHtml,
  buildCabinetLetterheadHtml,
} from "@/lib/documents/pdf/cabinet-print-identity";

import type { CompteRenduPrintModel } from "./compte-rendu-print-model";

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statutBadgeClass(statut: string): string {
  const known = ["finalise", "valide", "en_revue", "brouillon", "rejete"];
  if (known.includes(statut)) return `print-cr__badge--${statut}`;
  return "print-cr__badge--finalise";
}

/**
 * HTML complet pour Puppeteer — mise en page cabinet juridique.
 */
export function buildCompteRenduPrintHtml(
  model: CompteRenduPrintModel,
  printCss: string
): string {
  const {
    compteRendu: cr,
    affaire,
    cabinet,
    authorName,
    validatorName,
    validatedDate,
    exportDate,
    signatureCity,
    bodyHtml,
    isEmpty,
  } = model;

  const bodyContent = isEmpty
    ? '<p class="print-cr__body-empty">— Aucun développement rédigé —</p>'
    : bodyHtml;

  const authorLine = authorName
    ? `<p class="print-doc__meta print-cr__author">
        Rédacteur : <strong>${escapeHtmlText(authorName)}</strong>
      </p>`
    : "";

  const summaryItems = [
    `<li>
      <span class="print-cr__summary-label">Date de l&apos;événement</span>
      <span class="print-cr__summary-value">${escapeHtmlText(cr.dateEvenementLabel)}</span>
    </li>`,
    cr.dureeLabel
      ? `<li>
          <span class="print-cr__summary-label">Durée</span>
          <span class="print-cr__summary-value">${escapeHtmlText(cr.dureeLabel)}</span>
        </li>`
      : "",
    cr.lieu
      ? `<li class="print-cr__summary-full">
          <span class="print-cr__summary-label">Lieu</span>
          <span class="print-cr__summary-value">${escapeHtmlText(cr.lieu)}</span>
        </li>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const watermark =
    cr.confidentialite === "sensible"
      ? `<div class="print-doc__watermark"><strong>Document confidentiel</strong> — diffusion restreinte au cabinet</div>`
      : "";

  const validationLine =
    cr.statut === "valide" && validatorName && validatedDate
      ? `<div class="print-doc__signature-validated">
          <span class="print-doc__signature-validated-label">Validation interne</span>
          Validé le ${escapeHtmlText(validatedDate)} par ${escapeHtmlText(validatorName)}.
        </div>`
      : "";

  const signature = `<section class="print-doc__signature">
        ${validationLine}
        <p class="print-doc__signature-meta">Compte rendu établi — ${escapeHtmlText(signatureCity)}, le ${escapeHtmlText(exportDate)}.</p>
        ${
          authorName
            ? `<div class="print-doc__signature-block">
                <span class="print-doc__signature-name">
                  ${escapeHtmlText(authorName)}
                  <span class="print-doc__signature-role">Rédacteur</span>
                </span>
              </div>`
            : ""
        }
      </section>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtmlText(cr.titre)} — ${escapeHtmlText(cabinet.name)}</title>
  <style>${printCss}</style>
</head>
<body>
  <article class="print-shell">
    <header class="print-doc__header print-cr__header">
      ${buildCabinetLetterheadHtml(cabinet, escapeHtmlText)}
      <h1 class="print-doc__title">${escapeHtmlText(cr.titre)}</h1>
      <p class="print-cr__dossier">
        <span class="print-cr__dossier-ref">${escapeHtmlText(affaire.reference)}</span>
        — ${escapeHtmlText(affaire.intitule)}
      </p>
      <div class="print-cr__badges">
        <span class="print-cr__badge print-cr__badge--type">${escapeHtmlText(cr.typeLabel)}</span>
        <span class="print-cr__badge ${statutBadgeClass(cr.statut)}">${escapeHtmlText(cr.statutLabel)}</span>
      </div>
      ${authorLine}
    </header>

    <div class="print-cr__band" aria-hidden="true">
      <span class="print-cr__band-navy"></span>
      <span class="print-cr__band-gold"></span>
    </div>

    ${watermark}

    <section class="print-cr__summary" aria-label="Synthèse de l'événement">
      <ul class="print-cr__summary-grid">${summaryItems}</ul>
    </section>

    <section class="print-cr__sections" aria-label="Éléments structurés">
      <div class="print-cr__section">
        <h2 class="print-cr__section-title">Participants</h2>
        <div class="print-cr__section-body">${cr.participantsHtml}</div>
      </div>
      <div class="print-cr__section">
        <h2 class="print-cr__section-title">Décisions &amp; actions</h2>
        <div class="print-cr__section-body">${cr.decisionsActionsHtml}</div>
      </div>
      <div class="print-cr__section">
        <h2 class="print-cr__section-title">Pièces remises ou reçues</h2>
        <div class="print-cr__section-body">${cr.piecesHtml}</div>
      </div>
    </section>

    <h2 class="print-cr__body-heading">Développement</h2>
    <div class="print-doc__body">${bodyContent}</div>

    ${signature}

    <footer class="print-doc__footer">
      <span>${escapeHtmlText(affaire.reference)} · ${escapeHtmlText(cr.titre)} · généré le ${escapeHtmlText(exportDate)}</span>
      <span>${buildCabinetFooterRightHtml(cabinet, escapeHtmlText)}</span>
    </footer>
  </article>
</body>
</html>`;
}
