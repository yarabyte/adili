import { cn } from "@/lib/utils";

type BetaPlacesProgressProps = {
  used: number;
  maxPlaces: number;
  className?: string;
};

export function BetaPlacesProgress({
  used,
  maxPlaces,
  className,
}: BetaPlacesProgressProps) {
  const remaining = Math.max(0, maxPlaces - used);
  const pctRemaining = maxPlaces > 0 ? (remaining / maxPlaces) * 100 : 0;
  const complete = remaining === 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-brand-justice/10 bg-card p-5 shadow-sm",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold">
            Places disponibles
          </p>
          <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-brand-justice">
            {remaining}
            <span className="text-lg font-semibold text-muted-foreground">
              {" "}
              / {maxPlaces}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">places restantes</p>
        </div>
        <p className="text-right text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{used}</span> / {maxPlaces}{" "}
          attribuée{used > 1 ? "s" : ""}
        </p>
      </div>

      <div
        className="mt-4 h-3 overflow-hidden rounded-full bg-brand-justice/10"
        aria-hidden
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            complete ? "bg-muted-foreground/40" : "bg-brand-gold"
          )}
          style={{ width: `${pctRemaining}%` }}
        />
      </div>

      {complete ? (
        <p className="mt-3 text-sm font-medium text-destructive">
          Programme complet — inscriptions closes pour cette cohorte.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {pctRemaining <= 20
            ? "Dernières places — candidature sous 72 h ouvrées après envoi."
            : "Accès gratuit 12 mois au plan Individuel pour les candidatures retenues."}
        </p>
      )}
    </div>
  );
}
