type QuotaWarningParams = {
  displayName: string;
  consomme: number;
  quotaMensuel: number;
  resetDate: string;
  billingUrl: string;
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export function quotaWarningEmailHtml(p: QuotaWarningParams): string {
  const pct = Math.round((p.consomme / p.quotaMensuel) * 100);
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;color:#1a1a2e">
    <p>Bonjour ${esc(p.displayName)},</p>
    <p>Vous avez utilisé <strong>${pct}%</strong> de votre quota IA Adili ce mois
    (${p.consomme} / ${p.quotaMensuel} requêtes).</p>
    <p>Renouvellement le <strong>${esc(p.resetDate)}</strong>.</p>
    <p><a href="${esc(p.billingUrl)}" style="color:#0f2744">Gérer la facturation</a>
    ou acheter un pack additionnel si besoin.</p>
    <p style="color:#666;font-size:12px">— Équipe Adili</p>
  </div>`;
}
