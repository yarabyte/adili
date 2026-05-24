"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  updateProfile,
  type ProfileFormState,
} from "@/app/actions/profile";
import { barreauFieldDefault, DEFAULT_BARREAU } from "@/lib/constants/barreau";
import {
  TITRES_PROFESSIONNELS,
  type TitreProfessionnel,
} from "@/lib/constants/titres-professionnels";

const initialState: ProfileFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full sm:w-auto sm:min-w-[12rem]" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {label}
    </Button>
  );
}

type ProfilFormProps = {
  defaultFullName?: string;
  defaultPhone?: string;
  defaultBarreau?: string;
  defaultTitre?: string;
  redirectTo?: string;
  submitLabel?: string;
};

export function ProfilForm({
  defaultFullName,
  defaultPhone,
  defaultBarreau,
  defaultTitre,
  redirectTo,
  submitLabel = "Enregistrer et continuer",
}: ProfilFormProps) {
  const storedName = (defaultFullName ?? "")
    .replace(/^(maître|maitre)\s+/i, "")
    .trim();
  const [state, action] = useFormState(updateProfile, initialState);

  return (
    <form action={action} className="space-y-5">
      {redirectTo ? (
        <input type="hidden" name="redirect" value={redirectTo} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="fullName">Nom complet</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={storedName || defaultFullName}
          placeholder="Prénom Nom"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Pour Avocat ou Huissier, le préfixe « Maître » est ajouté
          automatiquement à l&apos;affichage.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="titre">Titre professionnel</Label>
        <select
          id="titre"
          name="titre"
          defaultValue={defaultTitre ?? ""}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Non renseigné</option>
          {(Object.keys(TITRES_PROFESSIONNELS) as TitreProfessionnel[]).map(
            (t) => (
              <option key={t} value={t}>
                {TITRES_PROFESSIONNELS[t]}
              </option>
            )
          )}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Téléphone <span className="font-normal text-muted-foreground">(optionnel)</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={defaultPhone}
          placeholder="+221 77 123 45 67"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Pour les rappels d&apos;audience et la communication interne au
          cabinet. Visible uniquement par les membres du cabinet.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="barreau">
          Barreau d&apos;inscription{" "}
          <span className="font-normal text-muted-foreground">(optionnel)</span>
        </Label>
        <Input
          id="barreau"
          name="barreau"
          type="text"
          maxLength={120}
          defaultValue={barreauFieldDefault(defaultBarreau)}
          placeholder={DEFAULT_BARREAU}
          className="h-11"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-md border border-brand-sage/35 bg-brand-sage/10 px-3 py-2 text-sm text-brand-ink"
        >
          {state.message}
        </p>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
