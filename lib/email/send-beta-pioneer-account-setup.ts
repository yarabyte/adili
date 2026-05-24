import { getPublicSiteUrl } from "@/lib/email/site-url";
import { sendEmail } from "@/lib/email/smtp";
import {
  betaPioneerAccountSetupEmailHtml,
  betaPioneerAccountSetupEmailText,
} from "@/lib/email/templates/beta-pioneer-account-setup";

export type SendBetaPioneerAccountSetupInput = {
  to: string;
  displayName: string;
};

/** Instructions compte + cabinet avant acceptation beta (best-effort). */
export async function sendBetaPioneerAccountSetupEmail(
  input: SendBetaPioneerAccountSetupInput
): Promise<void> {
  const site = getPublicSiteUrl();
  const candidatureEmail = input.to.trim().toLowerCase();
  const params = {
    displayName: input.displayName.trim() || candidatureEmail.split("@")[0],
    candidatureEmail,
    inscriptionUrl: `${site}/inscription?plan=individuel&email=${encodeURIComponent(candidatureEmail)}`,
    onboardingCabinetUrl: `${site}/onboarding/cabinet?plan=individuel`,
    connexionUrl: `${site}/connexion?email=${encodeURIComponent(candidatureEmail)}`,
  };

  await sendEmail({
    to: candidatureEmail,
    subject: "Adili — Avocats pionniers : créez votre compte pour activer l'accès",
    html: betaPioneerAccountSetupEmailHtml(params),
    text: betaPioneerAccountSetupEmailText(params),
  });
}
