"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AuthFormState } from "@/app/actions/auth";
import { signUpFromInvitation } from "@/app/actions/invitations";

const initialState: AuthFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      Créer mon compte et rejoindre
    </Button>
  );
}

type InvitationSignupFormProps = {
  token: string;
  email: string;
  redirectAfterLogin: string;
};

export function InvitationSignupForm({
  token,
  email,
  redirectAfterLogin,
}: InvitationSignupFormProps) {
  const [state, action] = useFormState(signUpFromInvitation, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const pwdId = useId();
  const acceptId = useId();
  const emailId = useId();

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <Label htmlFor={emailId}>Email professionnel</Label>
        <div className="relative">
          <Input
            id={emailId}
            name="email"
            type="email"
            value={email}
            readOnly
            aria-readonly
            className="h-11 cursor-not-allowed bg-muted/40 pr-10 text-foreground"
          />
          <Lock
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Adresse imposée par l&apos;invitation du cabinet.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Nom complet</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          placeholder="Maître…"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={pwdId}>Mot de passe</Label>
        <div className="relative">
          <Input
            id={pwdId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            className="h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={showPassword}
            aria-label={
              showPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
      </div>

      <div className="flex gap-3 rounded-lg border border-brand-justice/10 bg-muted/20 p-4">
        <input
          id={acceptId}
          name="acceptTerms"
          type="checkbox"
          value="yes"
          required
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input",
            "text-brand-justice accent-brand-justice",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        />
        <Label
          htmlFor={acceptId}
          className="cursor-pointer text-sm font-normal leading-relaxed text-foreground/90"
        >
          J&apos;accepte les{" "}
          <Link
            href="/conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-justice underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            conditions générales d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link
            href="/confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-justice underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            politique de confidentialité
          </Link>
          .
        </Label>
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

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link
          href={`/connexion?redirect=${encodeURIComponent(redirectAfterLogin)}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}
