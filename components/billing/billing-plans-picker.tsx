"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

import { SubscribeFlow } from "@/components/billing/subscribe-flow";
import { formatFcfa } from "@/lib/billing/format";
import { cn } from "@/lib/utils";

import type { PlanCard } from "./pricing-cards";

export type BillingPlansPickerProps = {
  plans: PlanCard[];
  currentPlanId: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  highlightPlanId: string | null;
};

export function BillingPlansPicker({
  plans,
  currentPlanId,
  isTrial,
  trialEndsAt,
  highlightPlanId,
}: BillingPlansPickerProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="space-y-8">
      {isTrial && trialEndsAt && (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-brand-gold/35 bg-brand-gold/10 px-4 py-3 text-sm text-brand-ink"
        >
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold" aria-hidden />
          <p>
            <strong className="font-semibold">Essai gratuit en cours</strong> — jusqu&apos;au{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
              new Date(trialEndsAt)
            )}
            . Choisissez un plan payant ci-dessous pour continuer après l&apos;essai.
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <div
          className="inline-flex rounded-full border border-brand-justice/15 bg-card p-1 text-sm shadow-sm"
          role="group"
          aria-label="Cycle de facturation"
        >
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              !annual ? "bg-brand-justice text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              annual ? "bg-brand-justice text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Annuel <span className="text-brand-gold-soft">−17%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const price = annual ? plan.prixAnnuelFcfa : plan.prixMensuelFcfa;
          const isCurrent = currentPlanId === plan.id;
          const highlighted =
            isCurrent || plan.id === highlightPlanId || plan.id === "cabinet";
          const modes = Array.isArray(plan.modesPaiement)
            ? (plan.modesPaiement as string[])
            : [];
          const modules = Array.isArray(plan.modulesInclus)
            ? (plan.modulesInclus as string[])
            : [];

          return (
            <article
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
                highlighted
                  ? "border-brand-gold ring-1 ring-brand-gold/30"
                  : "border-brand-justice/10",
                isCurrent && "bg-brand-parchment/30"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-heading text-xl font-semibold text-brand-justice">
                  {plan.nom}
                </h2>
                {isCurrent && (
                  <span className="rounded-full bg-brand-justice px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    Plan actuel
                  </span>
                )}
              </div>

              {plan.description && (
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              )}

              <p className="mt-4 font-heading text-3xl font-bold text-foreground">
                {formatFcfa(price)}
                <span className="text-sm font-normal text-muted-foreground">
                  /{annual ? "an" : "mois"}
                </span>
              </p>

              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
                  {plan.quotaIaParUser} requêtes IA / mois / utilisateur
                </li>
                {plan.maxUsers != null && (
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
                    Jusqu&apos;à {plan.maxUsers} utilisateur
                    {plan.maxUsers > 1 ? "s" : ""}
                  </li>
                )}
                {modules.slice(0, 5).map((m) => (
                  <li key={m} className="flex items-start gap-2 capitalize">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
                    {m.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-border/60 pt-6">
                {isCurrent && !isTrial ? (
                  <p className="text-sm text-muted-foreground">
                    Vous êtes déjà sur ce plan. Pour changer de cycle ou de mode de
                    paiement, contactez{" "}
                    <a
                      href="mailto:support@adili.cloud"
                      className="font-medium text-brand-justice underline"
                    >
                      support@adili.cloud
                    </a>
                    .
                  </p>
                ) : (
                  <SubscribeFlow
                    planId={plan.id}
                    planNom={plan.nom}
                    defaultCycle={annual ? "annuel" : "mensuel"}
                    showCycleToggle={false}
                    supportsVirement={modes.includes("virement")}
                    supportsMobileMoney={modes.includes("mobile_money")}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Grand cabinet ou tarif négocié ?{" "}
        <a href="/grand-cabinet" className="font-medium text-brand-justice underline">
          Contactez notre équipe commerciale
        </a>
        .
      </p>
    </div>
  );
}
