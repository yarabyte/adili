type Role = "admin" | "avocat" | "collaborateur";

type InvitationEmailParams = {
  cabinetName: string;
  inviterName: string;
  inviterEmail?: string | null;
  role: Role;
  expiresInDays: number;
  link: string;
};

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  avocat: "Avocat",
  collaborateur: "Collaborateur",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin:
    "Accès complet : membres, paramètres du cabinet, facturation et données.",
  avocat:
    "Recherche OHADA, dossiers et notes du cabinet — rôle prévu pour les avocats inscrits.",
  collaborateur:
    "Recherche et consultation des dossiers, sans accès aux paramètres du cabinet.",
};

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Bloc invisible (Gmail/Outlook) lu en aperçu sous l'objet du mail. */
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">${escape(text)}</div>`;
}

export function invitationEmailHtml(params: InvitationEmailParams): string {
  const cabinet = escape(params.cabinetName);
  const inviter = escape(params.inviterName);
  const inviterEmail = params.inviterEmail
    ? escape(params.inviterEmail)
    : null;
  const roleLabel = ROLE_LABELS[params.role];
  const roleDesc = ROLE_DESCRIPTIONS[params.role];
  const link = params.link;
  const days = params.expiresInDays;

  // Si l'inviteur a le même nom que le cabinet (ex. cabinet individuel
  // « Maitre Nana Marcel »), on évite la répétition.
  const sameName =
    params.inviterName.trim().toLowerCase() ===
    params.cabinetName.trim().toLowerCase();

  const sentence = sameName
    ? `Vous avez été invité·e à rejoindre le cabinet <strong>${cabinet}</strong> sur Adili.`
    : `<strong>${inviter}</strong> vous invite à rejoindre <strong>${cabinet}</strong> sur Adili.`;

  const preview = sameName
    ? `Rejoignez ${params.cabinetName} sur Adili en tant que ${roleLabel}.`
    : `${params.inviterName} vous invite à rejoindre ${params.cabinetName} en tant que ${roleLabel}.`;

  // Palette dérivée des tokens brand-* du design system (HSL → hex).
  const C = {
    ink: "#0c1a2b",
    justice: "#1f3a6a",
    gold: "#b3811a",
    goldSoft: "#e6c474",
    parchment: "#f4ede0",
    parchmentDark: "#e9dcc4",
    border: "#dcd2bb",
    text: "#1f2937",
    muted: "#6b7280",
    bgPage: "#f6f3eb",
  };

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>Invitation Adili</title>
  </head>
  <body style="margin:0;padding:0;background:${C.bgPage};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${C.text};line-height:1.55;">
    ${preheader(preview)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bgPage};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
            <!-- Bandeau marque -->
            <tr>
              <td style="background:${C.ink};padding:20px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.18em;font-weight:600;color:#ffffff;">
                      ADILI
                    </td>
                    <td align="right" style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.goldSoft};font-weight:600;">
                      LegalTech OHADA
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Corps -->
            <tr>
              <td style="padding:36px 32px 28px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${C.gold};font-weight:700;">
                  Invitation à rejoindre un cabinet
                </p>
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;color:${C.ink};">
                  ${cabinet}
                </h1>
                <p style="margin:0 0 18px;font-size:15px;color:${C.text};">
                  ${sentence}
                </p>

                <!-- Carte rôle -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};border:1px solid ${C.parchmentDark};border-radius:12px;margin:0 0 24px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.justice};font-weight:700;">
                        Rôle proposé
                      </p>
                      <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:${C.ink};">
                        ${escape(roleLabel)}
                      </p>
                      <p style="margin:0;font-size:13px;color:${C.muted};">
                        ${escape(roleDesc)}
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
                  <tr>
                    <td>
                      <a href="${link}" style="display:inline-block;background:${C.ink};color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;border:1px solid ${C.ink};">
                        Accepter l'invitation
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 6px;font-size:13px;color:${C.muted};">
                  Si le bouton ne fonctionne pas, copiez-collez ce lien :
                </p>
                <p style="margin:0 0 24px;font-size:12px;word-break:break-all;">
                  <a href="${link}" style="color:${C.justice};text-decoration:underline;">${escape(link)}</a>
                </p>

                <!-- Encart sécurité -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.border};margin-top:8px;">
                  <tr>
                    <td style="padding:18px 0 0;">
                      <p style="margin:0 0 6px;font-size:12px;color:${C.muted};">
                        Ce lien est <strong style="color:${C.text};">personnel</strong> et expire dans
                        <strong style="color:${C.text};">${days}&nbsp;jour${days > 1 ? "s" : ""}</strong>.
                      </p>
                      <p style="margin:0;font-size:12px;color:${C.muted};">
                        Vous n'attendiez pas cette invitation ? Ignorez ce message${
                          inviterEmail
                            ? ` ou contactez directement <a href="mailto:${inviterEmail}" style="color:${C.justice};">${inviterEmail}</a>`
                            : ""
                        }.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Pied -->
            <tr>
              <td style="background:${C.parchment};padding:18px 28px;text-align:center;">
                <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${C.justice};font-weight:600;">
                  Adili — Recherche OHADA assistée par IA
                </p>
              </td>
            </tr>
          </table>

          <p style="margin:18px 0 0;font-size:11px;color:${C.muted};">
            Vous recevez cet email parce qu'une invitation a été envoyée à cette adresse via Adili.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function invitationEmailText(params: InvitationEmailParams): string {
  const sameName =
    params.inviterName.trim().toLowerCase() ===
    params.cabinetName.trim().toLowerCase();
  const lead = sameName
    ? `Vous avez été invité(e) à rejoindre le cabinet ${params.cabinetName} sur Adili.`
    : `${params.inviterName} vous invite à rejoindre ${params.cabinetName} sur Adili.`;

  const lines = [
    "ADILI — LegalTech OHADA",
    "",
    lead,
    "",
    `Rôle proposé : ${ROLE_LABELS[params.role]}`,
    ROLE_DESCRIPTIONS[params.role],
    "",
    "Accepter l'invitation :",
    params.link,
    "",
    `Ce lien personnel expire dans ${params.expiresInDays} jour${
      params.expiresInDays > 1 ? "s" : ""
    }.`,
  ];
  if (params.inviterEmail) {
    lines.push(
      "",
      `Vous n'attendiez pas cette invitation ? Ignorez ce message ou contactez ${params.inviterEmail}.`
    );
  }
  return lines.join("\n");
}
