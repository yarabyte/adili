"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatFcfa } from "@/lib/billing/format";
import { cn } from "@/lib/utils";

export type PlanCard = {
  id: string;
  nom: string;
  description: string | null;
  prixMensuelFcfa: number;
  prixAnnuelFcfa: number;
  quotaIaParUser: number;
  maxUsers: number | null;
  modesPaiement: unknown;
  modulesInclus: unknown;
};

type PricingCardsProps = {
  plans: PlanCard[];
  isAuthed?: boolean;
  highlightPlanId?: string;
};

export function PricingCards({
  plans,
  isAuthed = false,
  highlightPlanId,
}: PricingCardsProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <div
          className="inline-flex rounded-full border border-brand-justice/15 bg-card p-1 text-sm"
          role="group"
          aria-label="Cycle de facturation"
        >
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              !annual ? "bg-brand-justice text-white" : "text-muted-foreground"
            )}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              annual ? "bg-brand-justice text-white" : "text-muted-foreground"
            )}
          >
            Annuel <span className="text-brand-gold-soft">−17%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const price = annual ? plan.prixAnnuelFcfa : plan.prixMensuelFcfa;
          const highlighted = plan.id === highlightPlanId || plan.id === "cabinet";
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
                  : "border-brand-justice/10"
              )}
            >
              <h3 className="font-heading text-xl font-semibold text-brand-justice">
                {plan.nom}
              </h3>
              {plan.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {plan.description}
                </p>
              )}
              <p className="mt-4 font-heading text-2xl font-bold text-foreground">
                {price === 0 ? "Gratuit" : formatFcfa(price)}
                {price > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    /{annual ? "an" : "mois"}
                  </span>
                )}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  {plan.quotaIaParUser} requêtes IA / mois / utilisateur
                </li>
                {plan.maxUsers != null && (
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                    Jusqu&apos;à {plan.maxUsers} utilisateur
                    {plan.maxUsers > 1 ? "s" : ""}
                  </li>
                )}
                {modules.slice(0, 4).map((m) => (
                  <li key={m} className="flex items-start gap-2 capitalize">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                    {m.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-6 w-full"
                variant={highlighted ? "default" : "outline"}
              >
                <Link
                  href={
                    isAuthed
                      ? plan.id === "grand_cabinet"
                        ? "/grand-cabinet"
                        : "/app/billing/plans"
                      : plan.id === "grand_cabinet"
                        ? "/grand-cabinet"
                        : plan.id === "etudiant"
                          ? "/inscription?plan=etudiant"
                          : plan.id === "cabinet"
                            ? "/inscription?plan=cabinet"
                            : "/inscription?plan=individuel"
                  }
                >
                  {plan.id === "grand_cabinet"
                    ? "Nous contacter"
                    : isAuthed
                      ? "Gérer l'abonnement"
                      : "Commencer"}
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
