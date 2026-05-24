import { addMonths } from "date-fns";

import { getPublicSiteUrl } from "@/lib/email/site-url";
import { sendEmail } from "@/lib/email/smtp";
import {
  etudiantRejeteeEmailHtml,
  etudiantRejeteeEmailText,
  etudiantValideeEmailHtml,
  etudiantValideeEmailText,
} from "@/lib/email/templates/etudiant-validation";
import { formatDashboardGreetingName } from "@/lib/users/display-name";

export type SendEtudiantValidationNoticeInput = {
  to: string;
  fullName: string | null;
  ecole: string;
  decision: "validee" | "rejetee";
  motifRejet?: string | null;
  /** Date de fin de validité (validation acceptée). */
  expireAt?: Date;
};

/**
 * Notification étudiant après décision admin (best-effort — n'échoue pas l'API).
 */
export async function sendEtudiantValidationNotice(
  input: SendEtudiantValidationNoticeInput
): Promise<void> {
  const site = getPublicSiteUrl();
  const displayName = formatDashboardGreetingName(
    input.fullName?.trim() || input.to.split("@")[0] || "Étudiant"
  );

  if (input.decision === "validee") {
    const expireAt = input.expireAt ?? addMonths(new Date(), 12);
    await sendEmail({
      to: input.to,
      subject: "Adili — Votre tarif étudiant est activé",
      html: etudiantValideeEmailHtml({
        displayName,
        ecole: input.ecole,
        expireAt,
        appUrl: `${site}/app`,
      }),
      text: etudiantValideeEmailText({
        displayName,
        ecole: input.ecole,
        expireAt,
        appUrl: `${site}/app`,
      }),
    });
    return;
  }

  const motif =
    input.motifRejet?.trim() ||
    "Le justificatif fourni ne permet pas de confirmer votre statut étudiant.";

  await sendEmail({
    to: input.to,
    subject: "Adili — Demande tarif étudiant non retenue",
    html: etudiantRejeteeEmailHtml({
      displayName,
      ecole: input.ecole,
      motifRejet: motif,
      onboardingUrl: `${site}/onboarding/etudiant?rejet=1`,
    }),
    text: etudiantRejeteeEmailText({
      displayName,
      ecole: input.ecole,
      motifRejet: motif,
      onboardingUrl: `${site}/onboarding/etudiant?rejet=1`,
    }),
  });
}
