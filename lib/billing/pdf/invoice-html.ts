import { formatFcfa } from "@/lib/billing/format";

export type InvoiceLine = {
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
};

export type InvoicePrintModel = {
  numero: string;
  type: string;
  dateEmission: string;
  dateEcheance: string | null;
  emetteur: {
    raisonSociale: string;
    adresse?: string | null;
    niu?: string | null;
    rib?: string | null;
  };
  destinataire: {
    nom: string;
    adresse?: string | null;
    niu?: string | null;
  };
  lignes: InvoiceLine[];
  montantHt: number;
  tvaPourcent: number;
  montantTva: number;
  montantTtc: number;
  referenceVirement?: string | null;
};

export function buildInvoicePrintHtml(model: InvoicePrintModel): string {
  const typeLabel =
    model.type === "proforma" ? "Facture pro forma" : "Facture";

  const lignesHtml = model.lignes
    .map(
      (l) => `
    <tr>
      <td>${escapeHtml(l.description)}</td>
      <td class="num">${l.quantite}</td>
      <td class="num">${formatFcfa(l.prixUnitaire)}</td>
      <td class="num">${formatFcfa(l.total)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(model.numero)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; color: #1a1a2e; line-height: 1.45; }
    h1 { font-size: 18pt; margin: 0 0 4px; color: #0f2744; }
    .meta { font-size: 10pt; color: #555; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .box h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
    th { background: #f5f0e8; font-size: 9pt; text-transform: uppercase; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-left: auto; width: 280px; }
    .totals td { border: none; padding: 4px 0; }
    .totals .total-ttc { font-weight: bold; font-size: 12pt; border-top: 2px solid #0f2744; padding-top: 8px; }
    .legal { margin-top: 32px; font-size: 8.5pt; color: #666; }
    .ref { margin-top: 16px; padding: 12px; background: #f5f0e8; border-left: 3px solid #c9a227; }
  </style>
</head>
<body>
  <h1>${typeLabel}</h1>
  <p class="meta">N° ${escapeHtml(model.numero)} · Émise le ${escapeHtml(model.dateEmission)}${model.dateEcheance ? ` · Échéance ${escapeHtml(model.dateEcheance)}` : ""}</p>

  <div class="grid">
    <div class="box">
      <h2>Émetteur</h2>
      <p><strong>${escapeHtml(model.emetteur.raisonSociale)}</strong></p>
      ${model.emetteur.adresse ? `<p>${escapeHtml(model.emetteur.adresse)}</p>` : ""}
      ${model.emetteur.niu ? `<p>NIU : ${escapeHtml(model.emetteur.niu)}</p>` : ""}
    </div>
    <div class="box">
      <h2>Destinataire</h2>
      <p><strong>${escapeHtml(model.destinataire.nom)}</strong></p>
      ${model.destinataire.adresse ? `<p>${escapeHtml(model.destinataire.adresse)}</p>` : ""}
      ${model.destinataire.niu ? `<p>NIU : ${escapeHtml(model.destinataire.niu)}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qté</th>
        <th>P.U. HT</th>
        <th>Total HT</th>
      </tr>
    </thead>
    <tbody>${lignesHtml}</tbody>
  </table>

  <table class="totals">
    <tr><td>Total HT</td><td class="num">${formatFcfa(model.montantHt)}</td></tr>
    <tr><td>TVA ${model.tvaPourcent}%</td><td class="num">${formatFcfa(model.montantTva)}</td></tr>
    <tr class="total-ttc"><td>Total TTC</td><td class="num">${formatFcfa(model.montantTtc)}</td></tr>
  </table>

  ${model.referenceVirement ? `<div class="ref"><strong>Référence virement obligatoire :</strong> ${escapeHtml(model.referenceVirement)}${model.emetteur.rib ? `<br/>RIB : ${escapeHtml(model.emetteur.rib)}` : ""}</div>` : ""}

  <p class="legal">
    Article 289 du Code général des impôts du Cameroun — exonération de TVA sur exportation de services selon régime applicable.
    Paiement par virement sous 15 jours à compter de la date d'émission.
  </p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
