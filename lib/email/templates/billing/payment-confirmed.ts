type PaymentConfirmedParams = {
  displayName: string;
  montantLabel: string;
  planNom: string;
  billingUrl: string;
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export function paymentConfirmedEmailHtml(p: PaymentConfirmedParams): string {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;color:#1a1a2e">
    <p>Bonjour ${esc(p.displayName)},</p>
    <p>Votre paiement de <strong>${esc(p.montantLabel)}</strong> pour
    <strong>${esc(p.planNom)}</strong> a été confirmé.</p>
    <p>Votre abonnement Adili est maintenant actif.</p>
    <p><a href="${esc(p.billingUrl)}" style="color:#0f2744">Voir la facturation</a></p>
    <p style="color:#666;font-size:12px">— Équipe Adili</p>
  </div>`;
}
