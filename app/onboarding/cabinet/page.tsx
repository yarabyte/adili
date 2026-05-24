import { redirect } from "next/navigation";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { Building2 } from "lucide-react";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { cabinets, invitations } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { signOut } from "@/app/actions/auth";

import { getIntendedPlan } from "@/lib/onboarding/intended-plan";
import { parseInscriptionPlan } from "@/lib/onboarding/plans";
import { cabinetHasActiveOrTrial } from "@/lib/billing/subscription";

import { OnboardingStepBar } from "@/components/onboarding/onboarding-step-bar";
import { OnboardingTabs } from "./onboarding-tabs";

export const metadata = { title: "Configurer votre cabinet · Adili" };
export const dynamic = "force-dynamic";

type Props = { searchParams: { plan?: string } };

export default async function OnboardingCabinetPage({ searchParams }: Props) {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");

  const intended = getIntendedPlan(session);
  if (intended === "etudiant") redirect("/onboarding/etudiant");

  const planRaw =
    parseInscriptionPlan(searchParams.plan) ??
    (intended === "cabinet" ? "cabinet" : "individuel");
  const plan: "individuel" | "cabinet" =
    planRaw === "cabinet" ? "cabinet" : "individuel";

  if (session.profile?.cabinetId) {
    if (await cabinetHasActiveOrTrial(session.profile.cabinetId)) {
      redirect("/app");
    }
    redirect(`/onboarding/abonnement?plan=${plan}`);
  }

  const defaultName =
    (session.user.user_metadata?.full_name as string | undefined) ?? undefined;

  // Garde-fou : si une invitation valide existe pour cet email, on l'expose
  // dans le premier onglet pour que l'utilisateur la rejoigne plutôt que de
  // créer un nouveau cabinet.
  const userEmail = session.user.email?.toLowerCase() ?? null;
  const pendingInvitation = userEmail
    ? (
        await db
          .select({
            token: invitations.token,
            role: invitations.role,
            cabinetName: cabinets.name,
          })
          .from(invitations)
          .innerJoin(cabinets, eq(invitations.cabinetId, cabinets.id))
          .where(
            and(
              eq(invitations.email, userEmail),
              isNull(invitations.acceptedAt),
              gt(invitations.expiresAt, new Date())
            )
          )
          .orderBy(desc(invitations.createdAt))
          .limit(1)
      )[0]
    : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-justice/10 bg-card p-8 shadow-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <AdiliLogo href="/" height={40} priority className="mx-auto" />
          <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/12">
            <Building2 className="h-7 w-7 text-brand-gold" aria-hidden />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-gold">
            Premier pas
          </p>
          <h1 className="mt-1.5 font-heading text-2xl font-semibold leading-tight text-brand-ink">
            {pendingInvitation
              ? "Rejoindre ou créer un cabinet"
              : "Configurer votre cabinet"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Adili est un espace de travail par cabinet. Rejoignez celui qui vous
            attend ou créez le vôtre.
          </p>
          {session.user.email && (
            <p className="mt-3 text-xs text-muted-foreground">
              Compte :{" "}
              <strong className="text-foreground">{session.user.email}</strong>
            </p>
          )}
        </div>

        <div className="mt-7">
          <OnboardingStepBar
            current={2}
            labels={["Compte", "Cabinet", "Essai gratuit"]}
          />
          {plan === "individuel" && (
            <p className="mb-4 rounded-lg border border-brand-justice/10 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Plan <strong>Individuel</strong> : votre espace est un cabinet à
              un seul utilisateur. Pour une équipe, choisissez l&apos;offre{" "}
              <a href="/tarifs" className="font-medium text-brand-justice underline">
                Cabinet
              </a>{" "}
              avant de créer le compte.
            </p>
          )}
          <OnboardingTabs
            defaultName={defaultName}
            plan={plan}
            pendingInvitation={pendingInvitation}
          />
        </div>

        <form action={signOut} className="mt-6 text-center">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Se déconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}
