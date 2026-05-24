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

export type GrandCabinetLeadConfirmationParams = {
  nomCabinet: string;
  ville: string;
  nombreAvocats: number;
  telephone: string;
  /** Extrait du message (aperçu, pas le texte intégral). */
  messageExtrait: string;
};

export function grandCabinetLeadConfirmationHtml(
  p: GrandCabinetLeadConfirmationParams
): string {
  const cabinet = escape(p.nomCabinet);
  const ville = escape(p.ville);
  const tel = escape(p.telephone);
  const extrait = escape(p.messageExtrait);

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Demande reçue — Adili Grand Cabinet</title>
  </head>
  <body style="margin:0;padding:0;background:${C.bgPage};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${C.text};line-height:1.55;">
    ${preheader("Nous avons bien reçu votre demande Grand Cabinet — réponse sous 48 h ouvrées.")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bgPage};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:${C.ink};padding:20px 28px;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.18em;font-weight:600;color:#ffffff;">
                ADILI
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 28px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${C.gold};font-weight:700;">
                  Grand Cabinet
                </p>
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:${C.ink};">
                  Demande bien reçue
                </h1>
                <p style="margin:0 0 16px;font-size:15px;">
                  Merci pour l'intérêt porté à Adili. Notre équipe commerciale a enregistré
                  votre demande pour <strong>${cabinet}</strong>.
                </p>
                <p style="margin:0 0 20px;font-size:15px;color:${C.text};">
                  Nous vous recontactons sous <strong>48 h ouvrées</strong> à l'adresse
                  email utilisée pour ce formulaire, ou au numéro indiqué ci-dessous.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};border:1px solid ${C.parchmentDark};border-radius:12px;margin:0 0 16px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.justice};font-weight:700;">
                        Récapitulatif
                      </p>
                      <p style="margin:0 0 4px;font-size:14px;"><strong>Cabinet :</strong> ${cabinet}</p>
                      <p style="margin:0 0 4px;font-size:14px;"><strong>Ville :</strong> ${ville}</p>
                      <p style="margin:0 0 4px;font-size:14px;"><strong>Effectif :</strong> ${p.nombreAvocats} avocat(s)</p>
                      <p style="margin:0;font-size:14px;"><strong>Téléphone :</strong> ${tel}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};font-weight:600;">
                  Votre message
                </p>
                <p style="margin:0;font-size:14px;color:${C.muted};font-style:italic;white-space:pre-wrap;">«&nbsp;${extrait}&nbsp;»</p>
              </td>
            </tr>
            <tr>
              <td style="background:${C.parchment};padding:18px 28px;text-align:center;">
                <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${C.justice};font-weight:600;">
                  Adili — Offre Grand Cabinet
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-size:11px;color:${C.muted};max-width:560px;text-align:center;">
            Cet email confirme la réception de votre demande. Si vous n'êtes pas à l'origine
            de ce message, vous pouvez l'ignorer.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function grandCabinetLeadConfirmationText(
  p: GrandCabinetLeadConfirmationParams
): string {
  return [
    "ADILI — Grand Cabinet",
    "",
    "Demande bien reçue",
    "",
    `Merci — nous avons enregistré votre demande pour ${p.nomCabinet}.`,
    "Notre équipe vous recontacte sous 48 h ouvrées.",
    "",
    "Récapitulatif :",
    `- Cabinet : ${p.nomCabinet}`,
    `- Ville : ${p.ville}`,
    `- Effectif : ${p.nombreAvocats} avocat(s)`,
    `- Téléphone : ${p.telephone}`,
    "",
    "Votre message (extrait) :",
    p.messageExtrait,
    "",
    "— Équipe Adili",
  ].join("\n");
}

/** Aperçu court du message pour l'email (évite un corps trop long). */
export function excerptGrandCabinetMessage(message: string, maxLen = 280): string {
  const oneLine = message.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen - 1).trim()}…`;
}
