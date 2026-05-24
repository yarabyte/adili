import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { eq } from "drizzle-orm";

import { OnboardingStepBar } from "@/components/onboarding/onboarding-step-bar";
import { getCurrentProfile, isCabinetOwner } from "@/lib/auth/profile";
import { cabinetHasActiveOrTrial } from "@/lib/billing/subscription";
import { db } from "@/lib/db/client";
import { cabinets } from "@/lib/db/schema";
import { planLabel, parseInscriptionPlan } from "@/lib/onboarding/plans";

import { TrialForm } from "./trial-form";

export const metadata = { title: "Essai gratuit · Adili" };
export const dynamic = "force-dynamic";

type Props = { searchParams: { plan?: string } };

export default async function OnboardingAbonnementPage({ searchParams }: Props) {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  const [cabinet] = await db
    .select({ ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, session.profile.cabinetId))
    .limit(1);

  if (!cabinet || !isCabinetOwner(session, cabinet)) {
    redirect("/app");
  }

  const plan = parseInscriptionPlan(searchParams.plan);
  if (!plan || plan === "etudiant") redirect("/tarifs");

  if (await cabinetHasActiveOrTrial(session.profile.cabinetId)) {
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-justice/10 bg-card p-8 shadow-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <AdiliLogo href="/" height={40} priority className="mx-auto" />
          <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/12">
            <Sparkles className="h-7 w-7 text-brand-gold" aria-hidden />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-gold">
            Étape 3 — Plan {planLabel(plan)}
          </p>
          <h1 className="mt-1.5 font-heading text-2xl font-semibold text-brand-ink">
            Essai gratuit 30 jours
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sans carte bancaire. Le propriétaire du cabinet règlera l&apos;abonnement
            ensuite.
          </p>
        </div>
        <OnboardingStepBar
          current={3}
          labels={["Compte", "Cabinet", "Essai gratuit"]}
        />
        <div className="mt-2">
          <TrialForm plan={plan} />
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
