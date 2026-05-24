import Link from "next/link";
import { redirect } from "next/navigation";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { parsePrefillEmail } from "@/lib/onboarding/prefill-email";
import { planLabel, parseInscriptionPlan } from "@/lib/onboarding/plans";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { OnboardingStepBar } from "@/components/onboarding/onboarding-step-bar";
import { InscriptionForm } from "./inscription-form";

export const metadata = { title: "Inscription · Adili" };

type Props = {
  searchParams: { plan?: string; email?: string };
};

export default async function InscriptionPage({ searchParams }: Props) {
  const plan = parseInscriptionPlan(searchParams.plan);
  if (!plan) redirect("/tarifs");
  const prefillEmail = parsePrefillEmail(searchParams.email);

  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const session = await getCurrentProfile();
    if (session) redirect(await resolvePostAuthPath(session));
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-justice/10 bg-card p-8 shadow-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <AdiliLogo href="/" height={40} priority className="mx-auto" />
          <p className="mt-5 rounded-full bg-brand-gold/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-gold">
            Plan {planLabel(plan)}
          </p>
          <h1 className="mt-4 font-heading text-3xl font-semibold text-brand-ink">
            Créer un compte
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {plan === "etudiant"
              ? "Étape 1 — compte Adili, puis justificatif étudiant."
              : "Étape 1 — compte Adili, puis configuration de votre espace."}
          </p>
        </div>
        <OnboardingStepBar
          current={1}
          total={plan === "etudiant" ? 2 : 3}
          labels={
            plan === "etudiant"
              ? ["Compte", "Justificatif"]
              : ["Compte", "Cabinet", "Essai"]
          }
        />
        <div className="mt-4">
          <InscriptionForm plan={plan} prefillEmail={prefillEmail} />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/tarifs" className="underline hover:text-foreground">
            Changer d&apos;offre
          </Link>
        </p>
      </div>
    </div>
  );
}
