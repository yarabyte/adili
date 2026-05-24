"use client";

import { Loader2 } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";

import { startTrial, type TrialFormState } from "@/app/actions/onboarding-trial";
import { Button } from "@/components/ui/button";
import type { OnboardingPlan } from "@/lib/onboarding/plans";
import { cn } from "@/lib/utils";

const initial: TrialFormState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Démarrer l&apos;essai gratuit (30 jours)
    </Button>
  );
}

export function TrialForm({ plan }: { plan: OnboardingPlan }) {
  const [state, action] = useFormState(startTrial, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="plan" value={plan} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Cycle (après l&apos;essai)</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["mensuel", "annuel"] as const).map((c) => (
            <label
              key={c}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium",
                "has-[:checked]:border-brand-justice has-[:checked]:bg-brand-justice/10"
              )}
            >
              <input
                type="radio"
                name="cycle"
                value={c}
                defaultChecked={c === "mensuel"}
                className="sr-only"
              />
              {c === "mensuel" ? "Mensuel" : "Annuel (−17 %)"}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Aucune carte requise. À l&apos;issue des 30 jours, choisissez un mode de
        paiement dans Facturation.
      </p>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Submit />
    </form>
  );
}
