import { redirect } from "next/navigation";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { safeAuthRedirectPath } from "@/lib/auth/redirect";
import { parsePrefillEmail } from "@/lib/onboarding/prefill-email";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ConnexionForm } from "./connexion-form";

export const metadata = { title: "Connexion · Adili" };

type ConnexionPageProps = {
  searchParams?: {
    erreur?: string;
    compte?: string;
    "mot-de-passe"?: string;
    redirect?: string;
    /** Alias historique (certaines pages utilisent ?next=) */
    next?: string;
    email?: string;
  };
};

export default async function ConnexionPage({
  searchParams,
}: ConnexionPageProps) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect(
      safeAuthRedirectPath(searchParams?.redirect ?? searchParams?.next, "/app")
    );
  }

  const afterLogin = safeAuthRedirectPath(
    searchParams?.redirect ?? searchParams?.next
  );

  const prefillEmail = parsePrefillEmail(searchParams?.email);

  const resetSuccess = searchParams?.["mot-de-passe"] === "reinitialise";
  const resetLinkError =
    searchParams?.erreur === "lien-reinitialisation" ||
    searchParams?.["mot-de-passe"] === "oublie";
  const emailConfirmed = searchParams?.compte === "confirme";
  const authLinkError = searchParams?.erreur === "lien-auth";
  const callbackError = searchParams?.erreur === "callback";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-justice/10 bg-card p-8 shadow-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <AdiliLogo href="/" height={40} priority className="mx-auto" />
          <h1 className="mt-6 font-heading text-3xl font-semibold text-brand-ink">
            Connexion
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Accédez à votre espace Adili — le copilote des avocats et
            praticiens du droit OHADA.
          </p>
        </div>
        <div className="mt-8">
          <ConnexionForm
            prefillEmail={prefillEmail}
            redirectAfterLogin={afterLogin}
            resetSuccess={resetSuccess}
            resetLinkError={resetLinkError}
            emailConfirmed={emailConfirmed}
            authLinkError={authLinkError || callbackError}
          />
        </div>
      </div>
    </div>
  );
}
