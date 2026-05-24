import Link from "next/link";
import {
  Activity,
  Archive,
  CheckCircle2,
  LayoutGrid,
  Scale,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { STATUTS_AFFAIRE_LABEL } from "@/lib/constants/statuts";

export type AffairesSearchParams = {
  q?: string;
  statut?: string;
  type?: string;
};

const STATUT_ORDER: (keyof typeof STATUTS_AFFAIRE_LABEL)[] = [
  "ouvert",
  "en_cours",
  "en_delibere",
  "clos",
  "archive",
];

/** Trait supérieur + teinte d’icône : repères visuels sans aplats lourds. */
const STATUT_ACCENT: Record<
  keyof typeof STATUTS_AFFAIRE_LABEL,
  { bar: string; barMuted: string; icon: string }
> = {
  ouvert: {
    bar: "border-t-emerald-500",
    barMuted: "border-t-emerald-500/35",
    icon: "text-emerald-700 dark:text-emerald-400",
  },
  en_cours: {
    bar: "border-t-brand-justice",
    barMuted: "border-t-brand-justice/35",
    icon: "text-brand-justice",
  },
  en_delibere: {
    bar: "border-t-amber-500",
    barMuted: "border-t-amber-500/40",
    icon: "text-amber-800 dark:text-amber-400",
  },
  clos: {
    bar: "border-t-slate-500",
    barMuted: "border-t-slate-400/45",
    icon: "text-slate-600 dark:text-slate-400",
  },
  archive: {
    bar: "border-t-slate-400",
    barMuted: "border-t-slate-400/35",
    icon: "text-slate-500 dark:text-slate-400",
  },
};

const ICON_STATUT: Record<
  keyof typeof STATUTS_AFFAIRE_LABEL,
  typeof LayoutGrid
> = {
  ouvert: Sparkles,
  en_cours: Activity,
  en_delibere: Scale,
  clos: CheckCircle2,
  archive: Archive,
};

function listHref(
  base: AffairesSearchParams,
  patch: Partial<AffairesSearchParams>
): string {
  const next: AffairesSearchParams = { ...base, ...patch };
  if ("statut" in patch && patch.statut === "") {
    delete next.statut;
  }
  const params = new URLSearchParams();
  if (next.q?.trim()) params.set("q", next.q.trim());
  if (next.statut?.trim()) params.set("statut", next.statut.trim());
  if (next.type?.trim()) params.set("type", next.type.trim());
  const qs = params.toString();
  return qs ? `/app/affaires?${qs}` : "/app/affaires";
}

function isKnownStatut(s: string): s is keyof typeof STATUTS_AFFAIRE_LABEL {
  return s in STATUTS_AFFAIRE_LABEL;
}

const tabFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-justice/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function AffairesStatStrip({
  searchParams,
  countsByStatut,
  totalVisible,
}: {
  searchParams: AffairesSearchParams;
  countsByStatut: Record<keyof typeof STATUTS_AFFAIRE_LABEL, number>;
  totalVisible: number;
}) {
  const activeStatut = searchParams.statut?.trim() ?? "";
  const allActive = !activeStatut || !isKnownStatut(activeStatut);

  return (
    <div
      className="rounded-2xl border border-brand-justice/10 bg-gradient-to-b from-brand-parchment-dark/50 to-card/90 p-1 shadow-sm sm:p-1.5"
      role="presentation"
    >
      <div
        className="flex gap-1 overflow-x-auto scroll-smooth pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:gap-1.5 sm:overflow-visible"
        role="tablist"
        aria-label="Filtrer par statut d’affaire"
      >
        <Link
          href={listHref(searchParams, { statut: "" })}
          scroll={false}
          role="tab"
          aria-selected={allActive}
          title="Afficher tous les dossiers visibles"
          className={cn(
            "relative flex min-w-[5.75rem] shrink-0 snap-start flex-col gap-1 rounded-xl border border-border/25 border-t-[3px] border-t-brand-gold bg-card/40 px-3 py-2.5 text-left transition-[box-shadow,background-color,border-color] duration-200 hover:bg-card/90 hover:shadow-sm sm:min-w-0 sm:flex-1",
            allActive
              ? "border-border/50 bg-background shadow-md ring-1 ring-brand-justice/15"
              : "border-t-brand-gold/50",
            tabFocus
          )}
        >
          <span className="flex items-center gap-1.5">
            <LayoutGrid
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                allActive ? "text-brand-justice" : "text-muted-foreground"
              )}
              aria-hidden
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Toutes
            </span>
          </span>
          <span
            className={cn(
              "font-sans text-[1.35rem] font-semibold leading-none tracking-tight tabular-nums text-brand-ink slashed-zero",
              totalVisible === 0 && "text-muted-foreground"
            )}
          >
            {totalVisible.toLocaleString("fr-FR")}
          </span>
        </Link>

        {STATUT_ORDER.map((key) => {
          const href = listHref(searchParams, { statut: key });
          const count = countsByStatut[key];
          const isActive = activeStatut === key;
          const Icon = ICON_STATUT[key];
          const label = STATUTS_AFFAIRE_LABEL[key];
          const isEmpty = count === 0;
          const acc = STATUT_ACCENT[key];

          return (
            <Link
              key={key}
              href={href}
              scroll={false}
              role="tab"
              aria-selected={isActive}
              title={`${label} — ${count} dossier${count > 1 ? "s" : ""}`}
              className={cn(
                "relative flex min-w-[5.75rem] shrink-0 snap-start flex-col gap-1 rounded-xl border border-border/25 border-t-[3px] bg-card/40 px-3 py-2.5 text-left transition-[box-shadow,background-color,border-color,opacity] duration-200 sm:min-w-0 sm:flex-1",
                isActive ? acc.bar : acc.barMuted,
                isActive
                  ? "border-border/50 bg-background shadow-md ring-1 ring-brand-justice/15"
                  : "hover:bg-card/90 hover:shadow-sm",
                !isActive && isEmpty && "opacity-[0.88]",
                tabFocus
              )}
            >
              <span className="flex items-center gap-1.5">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-colors",
                    isActive ? acc.icon : "text-muted-foreground",
                    !isActive && isEmpty && "opacity-75"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.16em]",
                    isActive ? "text-foreground" : "text-muted-foreground",
                    !isActive && isEmpty && "opacity-80"
                  )}
                >
                  {label}
                </span>
              </span>
              <span
                className={cn(
                  "font-sans text-[1.35rem] font-semibold leading-none tracking-tight tabular-nums text-brand-ink slashed-zero",
                  !isActive && isEmpty && "text-muted-foreground"
                )}
              >
                {count.toLocaleString("fr-FR")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
