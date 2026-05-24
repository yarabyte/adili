const C = {
  ink: "#0c1a2b",
  justice: "#1f3a6a",
  gold: "#b3811a",
  parchment: "#f4ede0",
  parchmentDark: "#e9dcc4",
  border: "#dcd2bb",
  text: "#1f2937",
  muted: "#6b7280",
  bgPage: "#f6f3eb",
} as const;

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${escape(text)}</div>`;
}

export type BetaPioneerAccountSetupEmailParams = {
  displayName: string;
  candidatureEmail: string;
  inscriptionUrl: string;
  onboardingCabinetUrl: string;
  connexionUrl: string;
};

function emailShell(params: {
  preheaderText: string;
  title: string;
  bodyHtml: string;
  cta: { label: string; href: string };
}): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escape(params.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${C.bgPage};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${C.text};line-height:1.55;">
    ${preheader(params.preheaderText)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bgPage};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${C.gold};font-weight:700;">Avocats pionniers</p>
                <h1 style="margin:12px 0 0;font-size:22px;color:${C.ink};font-weight:700;">${escape(params.title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;">
                ${params.bodyHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
                  <tr>
                    <td>
                      <a href="${params.cta.href}" style="display:inline-block;background:${C.ink};color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;">
                        ${escape(params.cta.label)}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;font-size:12px;color:${C.muted};word-break:break-all;">
                  <a href="${params.cta.href}" style="color:${C.justice};">${escape(params.cta.href)}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function betaPioneerAccountSetupEmailHtml(
  p: BetaPioneerAccountSetupEmailParams
): string {
  const name = escape(p.displayName);
  const email = escape(p.candidatureEmail);

  return emailShell({
    preheaderText:
      "Votre candidature Avocats pionniers : créez votre compte Adili avec le même email.",
    title: "Finalisez votre compte Adili",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;">Bonjour ${name},</p>
      <p style="margin:0 0 16px;font-size:15px;">
        Votre candidature au programme <strong>Avocats pionniers</strong> a été examinée.
        Pour activer votre accès beta (12 mois gratuits), nous devons rattacher votre abonnement
        à un <strong>cabinet Adili</strong> associé à votre compte.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};border:1px solid ${C.parchmentDark};border-radius:12px;margin:0 0 16px;">
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0 0 8px;font-size:13px;color:${C.muted};">
              Utilisez impérativement cette adresse email :
            </p>
            <p style="margin:0;font-size:15px;font-weight:600;color:${C.ink};">${email}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${C.ink};">Étapes</p>
      <ol style="margin:0;padding-left:20px;font-size:14px;color:${C.text};">
        <li style="margin-bottom:8px;">Créez votre compte (plan Individuel) avec l'email ci-dessus.</li>
        <li style="margin-bottom:8px;">Complétez votre profil, puis configurez votre cabinet.</li>
        <li style="margin-bottom:0;">Répondez à cet email ou contactez-nous une fois terminé — nous finaliserons l'activation beta.</li>
      </ol>
      <p style="margin:16px 0 0;font-size:13px;color:${C.muted};">
        Déjà inscrit ? Connectez-vous et terminez la configuration du cabinet :
        <a href="${escape(p.connexionUrl)}" style="color:${C.justice};">${escape(p.connexionUrl)}</a>
        puis
        <a href="${escape(p.onboardingCabinetUrl)}" style="color:${C.justice};">configuration cabinet</a>.
      </p>`,
    cta: { label: "Créer mon compte Adili", href: p.inscriptionUrl },
  });
}

export function betaPioneerAccountSetupEmailText(
  p: BetaPioneerAccountSetupEmailParams
): string {
  return [
    "ADILI — Avocats pionniers",
    "",
    `Bonjour ${p.displayName},`,
    "",
    "Votre candidature au programme Avocats pionniers a été examinée.",
    "Pour activer votre accès beta, créez ou complétez votre compte Adili avec le cabinet",
    "associé à la même adresse email que votre candidature.",
    "",
    `Email à utiliser : ${p.candidatureEmail}`,
    "",
    "1. Créer un compte (plan Individuel) :",
    p.inscriptionUrl,
    "",
    "2. Configurer votre cabinet :",
    p.onboardingCabinetUrl,
    "",
    "3. Si vous avez déjà un compte, connectez-vous :",
    p.connexionUrl,
    "",
    "Une fois ces étapes terminées, contactez-nous pour finaliser l'activation beta.",
  ].join("\n");
}
