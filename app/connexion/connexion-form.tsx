"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

import {
  requestPasswordReset,
  signIn,
  type AuthFormState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthFormState = {};

function SignInSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      Se connecter
    </Button>
  );
}

function ForgotSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      Envoyer le lien de réinitialisation
    </Button>
  );
}

type ConnexionFormProps = {
  prefillEmail?: string;
  /** Cible après connexion (ex. ?redirect=/app/affaires/…) */
  redirectAfterLogin?: string;
  resetSuccess?: boolean;
  resetLinkError?: boolean;
  /** Email confirmé mais session absente — inviter à se connecter */
  emailConfirmed?: boolean;
  authLinkError?: boolean;
};

export function ConnexionForm({
  prefillEmail,
  redirectAfterLogin = "/app",
  resetSuccess,
  resetLinkError,
  emailConfirmed,
  authLinkError,
}: ConnexionFormProps) {
  const [signInState, signInAction] = useFormState(signIn, initialState);

  useEffect(() => {
    if (!signInState.redirectTo) return;
    // Navigation document complète : les cookies posés par l’action serveur
    // ne sont pas toujours visibles avant un router.push + refresh (RSC).
    window.location.assign(signInState.redirectTo);
  }, [signInState.redirectTo]);
  const [forgotState, forgotAction] = useFormState(
    requestPasswordReset,
    initialState
  );
  const [mode, setMode] = useState<"signin" | "forgot">(
    resetLinkError ? "forgot" : "signin"
  );
  const [showPassword, setShowPassword] = useState(false);
  const pwdId = useId();
  const emailId = useId();
  const forgotEmailId = useId();

  if (mode === "forgot") {
    return (
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Saisissez l&apos;email de votre compte. Vous recevrez un lien pour
          choisir un nouveau mot de passe.
        </p>

        <form action={forgotAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={forgotEmailId}>Email</Label>
            <Input
              id={forgotEmailId}
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={prefillEmail}
              className="h-11"
            />
          </div>

          {forgotState.error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {forgotState.error}
            </p>
          )}
          {forgotState.message && (
            <p
              role="status"
              className="rounded-md border border-brand-sage/35 bg-brand-sage/10 px-3 py-2 text-sm text-brand-ink"
            >
              {forgotState.message}
            </p>
          )}

          <ForgotSubmitButton />

          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Retour à la connexion
            </button>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {emailConfirmed && (
        <p
          role="status"
          className="rounded-md border border-brand-sage/35 bg-brand-sage/10 px-3 py-2 text-sm text-brand-ink"
        >
          Votre adresse email est confirmée. Connectez-vous pour accéder à votre
          espace Adili.
        </p>
      )}
      {authLinkError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          Ce lien de confirmation est invalide ou a déjà été utilisé. Connectez-vous
          si votre compte est déjà actif, ou créez un nouveau compte.
        </p>
      )}
      {resetSuccess && (
        <p
          role="status"
          className="rounded-md border border-brand-sage/35 bg-brand-sage/10 px-3 py-2 text-sm text-brand-ink"
        >
          Votre mot de passe a été mis à jour. Connectez-vous avec votre nouveau
          mot de passe.
        </p>
      )}
      {resetLinkError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          Le lien de réinitialisation est invalide ou a expiré. Demandez un
          nouvel email ci-dessous.
        </p>
      )}

      <form action={signInAction} className="space-y-5">
        <input type="hidden" name="redirect" value={redirectAfterLogin} />
        <div className="space-y-2">
          <Label htmlFor={emailId}>Email</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={prefillEmail}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={pwdId}>Mot de passe</Label>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-xs font-medium text-brand-justice underline-offset-4 hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <Input
              id={pwdId}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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
        </div>

        {signInState.error && !signInState.redirectTo && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {signInState.error}
          </p>
        )}

        <SignInSubmitButton />

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </form>
    </div>
  );
}
