import Link from "next/link";
import { Sparkles } from "lucide-react";

import { formatPeriodeFinLabel } from "@/lib/billing/period";

export function TrialBanner({
  dateFinEssai,
}: {
  dateFinEssai: Date;
}) {
  const label = formatPeriodeFinLabel(
    dateFinEssai.toISOString().slice(0, 10)
  );

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-brand-ink">
          Essai gratuit en cours
        </p>
        <p className="mt-0.5 text-muted-foreground">
          Accès complet sans carte jusqu&apos;au{" "}
          <strong>{label}</strong>. Ensuite, activez un paiement dans
          Facturation.
        </p>
      </div>
      <Link
        href="/app/billing"
        className="shrink-0 text-sm font-medium text-brand-justice underline"
      >
        Facturation
      </Link>
    </div>
  );
}
