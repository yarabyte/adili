import { asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BillingPlansPicker } from "@/components/billing/billing-plans-picker";
import type { PlanCard } from "@/components/billing/pricing-cards";
import { Button } from "@/components/ui/button";
import { formatFcfa } from "@/lib/billing/format";
import { requireCabinetOwnerPage } from "@/lib/billing/require-owner";
import { getActiveSubscriptionForUser } from "@/lib/billing/subscription";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";
import { getIntendedPlan } from "@/lib/onboarding/intended-plan";

export const metadata = { title: "Changer de plan · Adili" };
export const dynamic = "force-dynamic";

const PAID_PLAN_IDS = ["individuel", "cabinet"] as const;

export default async function BillingPlansPage() {
  const session = await requireCabinetOwnerPage();
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  const [rows, sub] = await Promise.all([
    db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.ordreAffichage)),
    getActiveSubscriptionForUser(session.user.id),
  ]);

  const paidPlans = rows.filter((p) =>
    (PAID_PLAN_IDS as readonly string[]).includes(p.id)
  ) as PlanCard[];

  const intended = getIntendedPlan(session);
  const highlightPlanId =
    intended === "cabinet" || intended === "individuel" ? intended : "cabinet";

  const currentPlanId = sub?.plan.id ?? null;
  const isTrial = Boolean(
    sub?.subscription.estEssai &&
      sub.subscription.dateFinEssai &&
      sub.subscription.dateFinEssai > new Date()
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/app/billing">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Facturation
        </Link>
      </Button>

      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold text-brand-justice sm:text-3xl">
          Choisir un plan
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Comparez les offres Individuel et Cabinet, puis réglez par virement ou Mobile
          Money selon le plan. Les quotas IA sont renouvelés le 1<sup>er</sup> de chaque
          mois (fuseau Douala).
        </p>
        {sub && (
          <p className="text-sm text-brand-ink">
            Abonnement en cours :{" "}
            <strong>{sub.plan.nom}</strong>
            {sub.subscription.statut === "beta_gratuit"
              ? " (programme beta)"
              : sub.subscription.estEssai
                ? " (essai gratuit)"
                : ` — ${formatFcfa(
                    sub.subscription.cycle === "annuel"
                      ? sub.plan.prixAnnuelFcfa
                      : sub.plan.prixMensuelFcfa
                  )} / ${sub.subscription.cycle === "annuel" ? "an" : "mois"}`}
          </p>
        )}
      </header>

      <BillingPlansPicker
        plans={paidPlans}
        currentPlanId={currentPlanId}
        isTrial={isTrial}
        trialEndsAt={
          sub?.subscription.dateFinEssai?.toISOString() ?? null
        }
        highlightPlanId={highlightPlanId}
      />
    </div>
  );
}
