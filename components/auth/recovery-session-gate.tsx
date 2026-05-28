"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { RESET_PASSWORD_PATH } from "@/lib/auth/recovery";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Phase = "loading" | "error";

/**
 * Établit la session recovery (hash URL ou ?code=) avant d'afficher le formulaire.
 */
export function RecoverySessionGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    let cancelled = false;
    let hadSession = false;

    const code = searchParams.get("code");
    if (code) {
      const next = encodeURIComponent(RESET_PASSWORD_PATH);
      window.location.replace(
        `/auth/callback?code=${encodeURIComponent(code)}&next=${next}`
      );
      return;
    }

    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session) {
        hadSession = true;
        if (
          event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED"
        ) {
          router.refresh();
        }
        return;
      }
      if (event === "SIGNED_OUT" && hadSession) {
        window.location.replace("/connexion?mot-de-passe=reinitialise");
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        hadSession = true;
        router.refresh();
      }
    });

    const timeout = window.setTimeout(() => {
      if (!cancelled && !hadSession) setPhase("error");
    }, 4000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [router, searchParams]);

  if (phase === "loading") {
    return (
      <div
        className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-8 w-8 animate-spin text-brand-justice" aria-hidden />
        <p>Validation du lien sécurisé…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <p
        role="alert"
        className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
      >
        Ce lien de réinitialisation est invalide, expiré ou déjà utilisé.
      </p>
      <p className="text-sm text-muted-foreground">
        Demandez un nouvel email depuis la page de connexion (rubrique « Mot de
        passe oublié »).
      </p>
      <Link
        href="/connexion?mot-de-passe=oublie"
        className="inline-flex text-sm font-medium text-brand-justice underline-offset-4 hover:underline"
      >
        Demander un nouveau lien
      </Link>
    </div>
  );
}
