"use client";

import { Check, Loader2, Star } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ResultRatingProps = {
  chunkId: string;
  query: string;
  position: number;
  relevancePercent?: number;
  /** Si false, on affiche un message « connectez-vous pour noter ». */
  enabled: boolean;
  /** Mise en page compacte sous la carte (alignée maquette résultats). */
  layout?: "default" | "footer";
};

const HELPER_LABELS: Record<number, string> = {
  1: "Hors-sujet",
  2: "Peu pertinent",
  3: "Acceptable",
  4: "Pertinent",
  5: "Réponse idéale",
};

export function ResultRating({
  chunkId,
  query,
  position,
  relevancePercent,
  enabled,
  layout = "default",
}: ResultRatingProps) {
  const [value, setValue] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);

  // Une seule zone de survol (rangée d'étoiles) : on calcule l'étoile pointée
  // selon X plutôt que de s'appuyer sur 5 mouseenter individuels (qui créent
  // des micro-frontières entre boutons → flicker du libellé / du remplissage).
  const handleRowMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (submitting) return;
    const row = rowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const next = Math.min(5, Math.max(1, Math.ceil(ratio * 5)));
    setHover((prev) => (prev === next ? prev : next));
  };

  if (!enabled) {
    return (
      <p
        className={cn(
          "text-muted-foreground",
          layout === "footer"
            ? "text-[12px] leading-relaxed"
            : "text-[11.5px] italic"
        )}
      >
        Connectez-vous pour noter cet extrait et affiner la pertinence pour
        les avocats et praticiens du droit qui vous suivent.
      </p>
    );
  }

  const active = hover ?? value ?? 0;
  const label =
    active > 0
      ? HELPER_LABELS[active]
      : layout === "footer"
        ? "Votre avis sur cet extrait"
        : "Cet extrait répond-il à votre question ?";

  const submit = async (rating: number) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/search/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunkId,
          query,
          rating,
          position,
          relevancePercent,
        }),
      });
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const json = (await res.json()) as { error?: string };
          if (json.error === "unauthenticated") {
            message = "Connexion expirée — reconnectez-vous pour noter.";
          } else if (json.error) {
            message = json.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      setValue(rating);
      setConfirmed(true);
      window.setTimeout(() => setConfirmed(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        layout === "default" && "flex-wrap sm:flex-row sm:items-center sm:gap-3"
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-3",
          layout === "footer" && "gap-y-2"
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-1.5",
            layout === "footer" && "sm:flex-row sm:items-center sm:gap-3"
          )}
        >
          <div
            ref={rowRef}
            className="flex items-center"
            role="radiogroup"
            aria-label="Noter la pertinence de cet extrait"
            onMouseMove={handleRowMove}
            onMouseLeave={() => setHover(null)}
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = active >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => submit(n)}
                  disabled={submitting}
                  role="radio"
                  aria-checked={value === n}
                  aria-label={`${n} sur 5 — ${HELPER_LABELS[n]}`}
                  className={cn(
                    "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 disabled:cursor-wait",
                    layout === "footer" ? "p-1.5" : "p-1",
                    filled ? "text-brand-gold" : "text-brand-justice/25"
                  )}
                >
                  <Star
                    className={cn(
                      "pointer-events-none fill-none",
                      layout === "footer" ? "h-4 w-4 sm:h-[18px] sm:w-[18px]" : "h-4 w-4",
                      filled && "fill-brand-gold"
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
          <span
            className={cn(
              "font-medium text-muted-foreground",
              layout === "footer"
                ? "text-xs sm:min-w-[10.5rem]"
                : "text-[11.5px] sm:min-w-[14rem]"
            )}
            aria-live="polite"
          >
            {label}
          </span>
        </div>
        {submitting && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Envoi…
          </span>
        )}
        {!submitting && confirmed && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-sage">
            <Check className="h-3 w-3" aria-hidden />
            Merci, note enregistrée
          </span>
        )}
        {!submitting && !confirmed && value !== null && (
          <span className="text-[11px] text-muted-foreground">
            Vous avez noté {value}/5 — cliquez à nouveau pour modifier.
          </span>
        )}
        {error && (
          <span role="alert" className="text-[11px] text-destructive">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
