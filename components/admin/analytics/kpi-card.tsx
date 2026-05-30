"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type KpiTone = "justice" | "sage" | "gold" | "crimson" | "sky" | "violet";

const TONE_STYLES: Record<
  KpiTone,
  { icon: string; ring: string; deltaUp: string; deltaDown: string }
> = {
  justice: {
    icon: "bg-brand-justice/10 text-brand-justice ring-brand-justice/20",
    ring: "ring-brand-justice/10",
    deltaUp: "text-brand-sage bg-brand-sage/10",
    deltaDown: "text-brand-crimson bg-brand-crimson/10",
  },
  sage: {
    icon: "bg-brand-sage/15 text-brand-sage ring-brand-sage/25",
    ring: "ring-brand-sage/15",
    deltaUp: "text-brand-sage bg-brand-sage/10",
    deltaDown: "text-brand-crimson bg-brand-crimson/10",
  },
  gold: {
    icon: "bg-brand-gold/15 text-brand-ink ring-brand-gold/30",
    ring: "ring-brand-gold/20",
    deltaUp: "text-brand-sage bg-brand-sage/10",
    deltaDown: "text-brand-crimson bg-brand-crimson/10",
  },
  crimson: {
    icon: "bg-brand-crimson/10 text-brand-crimson ring-brand-crimson/20",
    ring: "ring-brand-crimson/10",
    deltaUp: "text-brand-sage bg-brand-sage/10",
    deltaDown: "text-brand-crimson bg-brand-crimson/10",
  },
  sky: {
    icon: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
    ring: "ring-sky-500/10",
    deltaUp: "text-brand-sage bg-brand-sage/10",
    deltaDown: "text-brand-crimson bg-brand-crimson/10",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
    ring: "ring-violet-500/10",
    deltaUp: "text-brand-sage bg-brand-sage/10",
    deltaDown: "text-brand-crimson bg-brand-crimson/10",
  },
};

function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} %`;
}

export function KpiCard({
  label,
  value,
  delta,
  format = "number",
  icon: Icon,
  tone = "justice",
  hint,
}: {
  label: string;
  value: number | string;
  delta?: number | null;
  format?: "number" | "currency" | "percent";
  icon: LucideIcon;
  tone?: KpiTone;
  hint?: string;
}) {
  const styles = TONE_STYLES[tone];
  const formatted =
    typeof value === "number"
      ? format === "currency"
        ? `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`
        : format === "percent"
          ? `${value.toFixed(1)} %`
          : new Intl.NumberFormat("fr-FR").format(value)
      : value;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
        "border-brand-justice/10 ring-1",
        styles.ring
      )}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-gold/5 blur-2xl transition-opacity group-hover:opacity-100 opacity-0"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold tabular-nums text-brand-justice sm:text-[1.65rem]">
            {formatted}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
            styles.icon
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
      </div>
      {delta != null && (
        <div className="relative mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              delta > 0
                ? styles.deltaUp
                : delta < 0
                  ? styles.deltaDown
                  : "bg-muted text-muted-foreground"
            )}
          >
            {delta > 0 ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            ) : delta < 0 ? (
              <ArrowDownRight className="h-3 w-3" aria-hidden />
            ) : (
              <Minus className="h-3 w-3" aria-hidden />
            )}
            {formatDelta(delta)}
          </span>
          <span className="text-[11px] text-muted-foreground">vs période préc.</span>
        </div>
      )}
    </article>
  );
}
