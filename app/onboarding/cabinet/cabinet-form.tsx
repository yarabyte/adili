"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createCabinet,
  type CabinetFormState,
} from "@/app/actions/onboarding";

const initialState: CabinetFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      Créer le cabinet
    </Button>
  );
}

export function CabinetForm({
  defaultName,
  plan = "individuel",
}: {
  defaultName?: string;
  plan?: "individuel" | "cabinet";
}) {
  const [state, action] = useFormState(createCabinet, initialState);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="plan" value={plan} />
      <div className="space-y-2">
        <Label htmlFor="name">Nom du cabinet</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={defaultName}
          placeholder="Cabinet Diop & Associés"
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            name="city"
            placeholder="Yaoundé"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Pays</Label>
          <div className="relative">
            <Input
              id="country"
              name="country"
              value="Cameroun"
              readOnly
              aria-readonly
              tabIndex={-1}
              className="h-11 cursor-not-allowed bg-muted/40 pr-10 text-foreground"
            />
            <Lock
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Adili démarre au Cameroun. Les autres pays OHADA seront ouverts
        progressivement — votre cabinet pourra changer de pays sans perdre ses
        données dès que la zone sera disponible.
      </p>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-xs text-muted-foreground">
        Vous pourrez inviter des collaborateurs depuis votre espace une fois le
        cabinet créé.
      </p>
    </form>
  );
}
