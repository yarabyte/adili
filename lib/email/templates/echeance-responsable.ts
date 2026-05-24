import { googleCalendarEventUrl } from "@/lib/email/calendar-links";

export type EcheanceResponsableEmailParams = {
  responsableName: string;
  assignerName: string;
  assignerEmail?: string | null;
  cabinetName: string;
  affaireReference: string;
  affaireIntitule: string;
  affaireStatutLabel?: string | null;
  clientNom?: string | null;
  juridiction?: string | null;
  typeContentieuxLabel?: string | null;
  echeanceTitre: string;
  description?: string | null;
  dateLabel: string;
  /** Ex. « Demain », « Dans 5 jours », « Aujourd'hui » */
  countdownLabel?: string | null;
  typeLabel?: string | null;
  alertesLabels?: string[];
  link: string;
  calendarUrl: string;
  isReassignment?: boolean;
};

const BRAND = {
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
  accent: "#1e4d8c",
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

function detailRow(
  icon: string,
  label: string,
  value: string,
  opts?: { strong?: boolean }
): string {
  const valueStyle = opts?.strong
    ? `font-size:14px;font-weight:600;color:${BRAND.ink};`
    : `font-size:14px;color:${BRAND.text};`;
  return `<tr>
    <td style="padding:10px 0;width:28px;vertical-align:top;font-size:16px;line-height:1.2;">${icon}</td>
    <td style="padding:10px 0 10px 4px;vertical-align:top;">
      <p style="margin:0 0 2px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.muted};font-weight:600;">${escape(label)}</p>
      <p style="margin:0;${valueStyle}">${value}</p>
    </td>
  </tr>`;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function buildEcheanceCalendarUrl(
  p: Pick<
    EcheanceResponsableEmailParams,
    | "echeanceTitre"
    | "affaireReference"
    | "affaireIntitule"
    | "dateLabel"
    | "link"
    | "juridiction"
    | "description"
  >,
  dateEcheance: Date
): string {
  const details = [
    p.description?.trim(),
    `Dossier ${p.affaireReference} — ${p.affaireIntitule}`,
    p.link,
  ]
    .filter(Boolean)
    .join("\n\n");

  return googleCalendarEventUrl({
    title: `${p.echeanceTitre} (${p.affaireReference})`,
    start: dateEcheance,
    details,
    location: p.juridiction?.trim() || undefined,
  });
}

export function echeanceResponsableEmailHtml(
  p: EcheanceResponsableEmailParams
): string {
  const intro = p.isReassignment
    ? "Vous avez été désigné·e comme <strong>personne responsable</strong> de l'échéance ci-dessous sur Adili."
    : "Une nouvelle échéance vous a été assignée sur Adili — vous en êtes la <strong>personne responsable</strong>.";

  const preview = p.countdownLabel
    ? `${p.echeanceTitre} · ${p.countdownLabel} · ${p.affaireReference}`
    : `${p.echeanceTitre} · ${p.affaireReference}`;

  const dossierValue = `<strong style="color:${BRAND.ink};">${escape(p.affaireReference)}</strong><br/><span style="color:${BRAND.text};">${escape(p.affaireIntitule)}</span>`;

  const metaChips: string[] = [];
  if (p.clientNom) metaChips.push(escape(p.clientNom));
  if (p.typeContentieuxLabel) metaChips.push(escape(p.typeContentieuxLabel));
  if (p.affaireStatutLabel) metaChips.push(escape(p.affaireStatutLabel));

  const metaLine =
    metaChips.length > 0
      ? `<p style="margin:0 0 20px;font-size:13px;color:${BRAND.muted};">${metaChips.join(" · ")}</p>`
      : "";

  const countdownBadge = p.countdownLabel
    ? `<span style="display:inline-block;margin:0 0 16px;padding:6px 12px;border-radius:999px;background:${BRAND.parchment};border:1px solid ${BRAND.parchmentDark};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${BRAND.justice};">${escape(p.countdownLabel)}</span>`
    : "";

  const descriptionBlock =
    p.description?.trim()
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background:#faf8f4;border:1px solid ${BRAND.border};border-radius:10px;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.gold};font-weight:700;">Notes</p>
              <p style="margin:0;font-size:14px;line-height:1.55;color:${BRAND.text};white-space:pre-wrap;">${escape(truncate(p.description, 600))}</p>
            </td>
          </tr>
        </table>`
      : "";

  const alertesBlock =
    p.alertesLabels && p.alertesLabels.length > 0
      ? detailRow(
          "🔔",
          "Rappels Adili",
          escape(p.alertesLabels.join(" · "))
        )
      : "";

  const typeRow = p.typeLabel
    ? detailRow("⚖️", "Type d'échéance", escape(p.typeLabel), { strong: true })
    : "";

  const juridictionRow = p.juridiction?.trim()
    ? detailRow("📍", "Juridiction", escape(p.juridiction.trim()))
    : "";

  const assignerContact = p.assignerEmail
    ? ` · <a href="mailto:${escape(p.assignerEmail)}" style="color:${BRAND.justice};text-decoration:none;">${escape(p.assignerEmail)}</a>`
    : "";

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>Échéance Adili</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.bgPage};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.text};line-height:1.55;">
    ${preheader(preview)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bgPage};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND.ink};padding:20px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.18em;font-weight:600;color:#ffffff;">ADILI</td>
                    <td align="right" style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.goldSoft};font-weight:600;">Échéance dossier</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:32px 28px 24px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.gold};font-weight:700;">${escape(p.cabinetName)}</p>
                <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:${BRAND.ink};">${escape(p.echeanceTitre)}</h1>
                ${countdownBadge}
                <p style="margin:0 0 8px;font-size:15px;color:${BRAND.text};">Bonjour ${escape(p.responsableName)},</p>
                <p style="margin:0 0 16px;font-size:15px;color:${BRAND.text};">${intro}</p>
                ${metaLine}

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.parchment};border:1px solid ${BRAND.parchmentDark};border-radius:12px;margin:0 0 20px;">
                  <tr>
                    <td style="padding:8px 18px 12px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${detailRow("📁", "Dossier", dossierValue, { strong: true })}
                        ${detailRow("📅", "Date et heure", escape(p.dateLabel), { strong: true })}
                        ${typeRow}
                        ${juridictionRow}
                        ${alertesBlock}
                      </table>
                    </td>
                  </tr>
                </table>

                ${descriptionBlock}

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
                  <tr>
                    <td style="padding-right:10px;">
                      <a href="${escape(p.link)}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:600;font-size:14px;border:1px solid ${BRAND.ink};">Voir les échéances</a>
                    </td>
                    <td>
                      <a href="${escape(p.calendarUrl)}" style="display:inline-block;background:#ffffff;color:${BRAND.justice};text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;border:1px solid ${BRAND.border};">Ajouter au calendrier</a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 6px;font-size:13px;color:${BRAND.muted};">Si les boutons ne fonctionnent pas :</p>
                <p style="margin:0 0 4px;font-size:12px;word-break:break-all;">
                  <a href="${escape(p.link)}" style="color:${BRAND.justice};">${escape(p.link)}</a>
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${BRAND.border};margin-top:22px;">
                  <tr>
                    <td style="padding:16px 0 0;">
                      <p style="margin:0;font-size:12px;color:${BRAND.muted};">
                        Assignée par <strong style="color:${BRAND.text};">${escape(p.assignerName)}</strong>${assignerContact}.
                      </p>
                      <p style="margin:8px 0 0;font-size:12px;color:${BRAND.muted};">
                        Vous n'êtes pas concerné·e ? Ignorez ce message ou contactez la personne qui vous a assigné cette échéance.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:${BRAND.parchment};padding:16px 28px;text-align:center;">
                <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.justice};font-weight:600;">Adili — Gestion des dossiers OHADA</p>
              </td>
            </tr>
          </table>

          <p style="margin:16px 0 0;font-size:11px;color:${BRAND.muted};max-width:580px;text-align:center;">
            Notification envoyée via Adili pour le cabinet ${escape(p.cabinetName)}.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function echeanceResponsableEmailText(
  p: EcheanceResponsableEmailParams
): string {
  const intro = p.isReassignment
    ? "Vous avez été désigné(e) responsable de l'échéance suivante."
    : "Une nouvelle échéance vous a été assignée.";

  const lines = [
    "ADILI — Échéance dossier",
    "",
    `Bonjour ${p.responsableName},`,
    "",
    intro,
    "",
    p.echeanceTitre,
    p.countdownLabel ? `(${p.countdownLabel})` : null,
    "",
    `Dossier : ${p.affaireReference} — ${p.affaireIntitule}`,
  ].filter((l): l is string => l != null && l !== "");

  if (p.clientNom) lines.push(`Client : ${p.clientNom}`);
  if (p.typeContentieuxLabel) lines.push(`Contentieux : ${p.typeContentieuxLabel}`);
  if (p.affaireStatutLabel) lines.push(`Statut dossier : ${p.affaireStatutLabel}`);
  if (p.juridiction?.trim()) lines.push(`Juridiction : ${p.juridiction.trim()}`);
  lines.push(`Date : ${p.dateLabel}`);
  if (p.typeLabel) lines.push(`Type : ${p.typeLabel}`);
  if (p.alertesLabels?.length) {
    lines.push(`Rappels : ${p.alertesLabels.join(", ")}`);
  }
  if (p.description?.trim()) {
    lines.push("", "Notes :", p.description.trim());
  }

  lines.push(
    "",
    `Assignée par ${p.assignerName}${p.assignerEmail ? ` (${p.assignerEmail})` : ""}.`,
    "",
    "Voir les échéances :",
    p.link,
    "",
    "Ajouter au calendrier :",
    p.calendarUrl
  );

  return lines.join("\n");
}
