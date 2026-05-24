import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  danger: "#991b1b",
  dangerBg: "#fef2f2",
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

function formatDateFr(d: Date): string {
  return format(d, "d MMMM yyyy", { locale: fr });
}

type BaseParams = {
  displayName: string;
  ecole: string;
};

export type EtudiantValideeEmailParams = BaseParams & {
  expireAt: Date;
  appUrl: string;
};

export type EtudiantRejeteeEmailParams = BaseParams & {
  motifRejet: string;
  onboardingUrl: string;
};

function emailShell(params: {
  preheaderText: string;
  kicker: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
}): string {
  const ctaBlock = params.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
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
      </p>`
    : "";

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
              <td style="background:${C.ink};padding:20px 28px;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.18em;font-weight:600;color:#ffffff;">
                ADILI
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 28px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${C.gold};font-weight:700;">
                  ${escape(params.kicker)}
                </p>
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:${C.ink};">
                  ${escape(params.title)}
                </h1>
                ${params.bodyHtml}
                ${ctaBlock}
              </td>
            </tr>
            <tr>
              <td style="background:${C.parchment};padding:18px 28px;text-align:center;">
                <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${C.justice};font-weight:600;">
                  Adili — Tarif étudiant
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

export function etudiantValideeEmailHtml(p: EtudiantValideeEmailParams): string {
  const name = escape(p.displayName);
  const ecole = escape(p.ecole);
  const expire = escape(formatDateFr(p.expireAt));
  const appUrl = p.appUrl;

  return emailShell({
    preheaderText: `Votre tarif étudiant Adili est activé jusqu'au ${formatDateFr(p.expireAt)}.`,
    kicker: "Demande validée",
    title: "Accès étudiant activé",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;">Bonjour ${name},</p>
      <p style="margin:0 0 16px;font-size:15px;">
        Votre justificatif pour <strong>${ecole}</strong> a été accepté.
        Votre accès au tarif étudiant Adili est maintenant <strong>actif</strong>.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.parchment};border:1px solid ${C.parchmentDark};border-radius:12px;margin:0 0 8px;">
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.justice};font-weight:700;">
              Validité
            </p>
            <p style="margin:0;font-size:15px;font-weight:600;color:${C.ink};">
              Jusqu'au ${expire}
            </p>
            <p style="margin:8px 0 0;font-size:13px;color:${C.muted};">
              Un renouvellement annuel avec justificatif sera demandé avant cette date.
            </p>
          </td>
        </tr>
      </table>`,
    cta: { label: "Ouvrir Adili", href: appUrl },
  });
}

export function etudiantValideeEmailText(p: EtudiantValideeEmailParams): string {
  return [
    "ADILI — Tarif étudiant",
    "",
    `Bonjour ${p.displayName},`,
    "",
    `Votre justificatif pour ${p.ecole} a été accepté.`,
    `Votre accès étudiant est actif jusqu'au ${formatDateFr(p.expireAt)}.`,
    "",
    "Ouvrir Adili :",
    p.appUrl,
    "",
    "Un renouvellement annuel avec justificatif sera demandé avant cette date.",
  ].join("\n");
}

export function etudiantRejeteeEmailHtml(p: EtudiantRejeteeEmailParams): string {
  const name = escape(p.displayName);
  const ecole = escape(p.ecole);
  const motif = escape(p.motifRejet);

  return emailShell({
    preheaderText: "Votre demande de tarif étudiant Adili n'a pas pu être acceptée.",
    kicker: "Demande non retenue",
    title: "Justificatif non accepté",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;">Bonjour ${name},</p>
      <p style="margin:0 0 16px;font-size:15px;">
        Après examen de votre dossier pour <strong>${ecole}</strong>, nous ne pouvons pas
        activer le tarif étudiant pour le moment.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.dangerBg};border:1px solid #fecaca;border-radius:12px;margin:0 0 8px;">
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.danger};font-weight:700;">
              Motif
            </p>
            <p style="margin:0;font-size:14px;color:${C.text};white-space:pre-wrap;">${motif}</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:14px;color:${C.muted};">
        Vous pouvez soumettre un nouveau justificatif conforme depuis votre espace Adili.
      </p>`,
    cta: { label: "Mettre à jour mon dossier", href: p.onboardingUrl },
  });
}

export function etudiantRejeteeEmailText(p: EtudiantRejeteeEmailParams): string {
  return [
    "ADILI — Tarif étudiant",
    "",
    `Bonjour ${p.displayName},`,
    "",
    `Votre demande pour ${p.ecole} n'a pas pu être acceptée.`,
    "",
    "Motif :",
    p.motifRejet,
    "",
    "Vous pouvez soumettre un nouveau justificatif :",
    p.onboardingUrl,
  ].join("\n");
}
