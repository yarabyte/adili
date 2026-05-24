import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { EtudiantOnboardingForm } from "@/components/onboarding/etudiant-onboarding-form";
import { OnboardingStepBar } from "@/components/onboarding/onboarding-step-bar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getIntendedPlan } from "@/lib/onboarding/intended-plan";
import {
  getLatestStudentValidation,
  isStudentValidationActive,
} from "@/lib/onboarding/student";

export const metadata = { title: "Inscription étudiant · Adili" };
export const dynamic = "force-dynamic";

type Props = { searchParams: { rejet?: string; renouvel?: string } };

export default async function OnboardingEtudiantPage({ searchParams }: Props) {
  const session = await getCurrentProfile();
  if (!session) redirect("/inscription?plan=etudiant");

  if (getIntendedPlan(session) !== "etudiant") {
    redirect("/tarifs");
  }

  const validation = await getLatestStudentValidation(session.user.id);
  if (validation?.statut === "en_attente") redirect("/app/en-attente");
  if (isStudentValidationActive(validation)) redirect("/app");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-justice/10 bg-card p-8 shadow-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <AdiliLogo href="/" height={40} priority className="mx-auto" />
          <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/12">
            <GraduationCap className="h-7 w-7 text-brand-gold" aria-hidden />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-gold">
            Étape 2 — Programme étudiant
          </p>
          <h1 className="mt-1.5 font-heading text-2xl font-semibold text-brand-ink">
            Justificatif de scolarité
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accès bloqué jusqu&apos;à validation (sous 72 h). Renouvellement annuel.
          </p>
        </div>
        <OnboardingStepBar
          current={2}
          total={2}
          labels={["Compte", "Justificatif"]}
        />
        <div className="mt-2">
          <EtudiantOnboardingForm
            rejected={searchParams.rejet === "1"}
            renew={searchParams.renouvel === "1"}
          />
        </div>
        <form action={signOut} className="mt-6 text-center">
          <Button type="submit" variant="ghost" size="sm">
            Se déconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}
