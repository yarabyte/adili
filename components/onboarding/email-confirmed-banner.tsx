"use client";

import { CheckCircle2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export function EmailConfirmedBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const show = searchParams.get("email_confirme") === "1" && !dismissed;

  const dismiss = useCallback(() => {
    setDismissed(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("email_confirme");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }, [router, searchParams]);

  if (!show) return null;

  return (
    <div
      role="status"
      className="mb-6 flex gap-3 rounded-lg border border-brand-sage/40 bg-brand-sage/15 px-4 py-3 text-sm text-brand-ink"
    >
      <CheckCircle2
        className="mt-0.5 h-5 w-5 shrink-0 text-brand-sage"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Compte activé</p>
        <p className="mt-0.5 text-brand-ink/90">
          Votre adresse email est confirmée. Poursuivez la configuration de votre
          espace ci-dessous.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
