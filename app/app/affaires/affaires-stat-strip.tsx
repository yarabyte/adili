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

const STATUT_STYLE: Record<
  keyof typeof STATUTS_AFFAIRE_LABEL,
  {
    top: string;
    iconWrap: string;
    icon: string;
    activeRing: string;
  }
> = {
  ouvert: {
    top: "border-t-emerald-500",
    iconWrap: "bg-emerald-500/12",
    icon: "text-emerald-700 dark:text-emerald-400",
    activeRing: "ring-emerald-500/25",
  },
  en_cours: {
    top: "border-t-brand-justice",
    iconWrap: "bg-brand-justice/10",
    icon: "text-brand-justice",
    activeRing: "ring-brand-justice/25",
  },
  en_delibere: {
    top: "border-t-amber-500",
    iconWrap: "bg-amber-500/12",
    icon: "text-amber-800 dark:text-amber-400",
    activeRing: "ring-amber-500/25",
  },
  clos: {
    top: "border-t-slate-500",
    iconWrap: "bg-slate-500/10",
    icon: "text-slate-600 dark:text-slate-400",
    activeRing: "ring-slate-400/30",
  },
  archive: {
    top: "border-t-slate-400",
    iconWrap: "bg-slate-400/10",
    icon: "text-slate-500 dark:text-slate-400",
    activeRing: "ring-slate-400/25",
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
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-justice/50 focus-visible:ring-offset-2";

function StatTab({
  href,
  isActive,
  label,
  count,
  icon: Icon,
  accent,
  isEmpty,
}: {
  href: string;
  isActive: boolean;
  label: string;
  count: number;
  icon: typeof LayoutGrid;
  accent: {
    top: string;
    iconWrap: string;
    icon: string;
    activeRing: string;
  };
  isEmpty?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      role="tab"
      aria-selected={isActive}
      title={`${label} — ${count} dossier${count !== 1 ? "s" : ""}`}
      className={cn(
        "group relative flex min-h-[5.5rem] flex-col justify-between rounded-xl border border-brand-justice/10 border-t-[3px] bg-card/60 px-3.5 py-3 transition-all duration-200",
        accent.top,
        isActive
          ? cn(
              "z-[1] border-brand-justice/20 bg-background shadow-md ring-2",
              accent.activeRing
            )
          : "hover:border-brand-justice/20 hover:bg-background hover:shadow-sm",
        !isActive && isEmpty && "opacity-75",
        tabFocus
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            isActive ? accent.iconWrap : "bg-muted/60 group-hover:bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              isActive ? accent.icon : "text-muted-foreground"
            )}
            aria-hidden
          />
        </span>
        {isActive && (
          <span className="rounded-full bg-brand-justice/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-justice">
            Actif
          </span>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.12em]",
            isActive ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "font-heading text-2xl font-semibold leading-none tabular-nums text-brand-ink",
            !isActive && isEmpty && "text-muted-foreground"
          )}
        >
          {count.toLocaleString("fr-FR")}
        </p>
      </div>
    </Link>
  );
}

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
      className="overflow-hidden rounded-2xl border border-brand-justice/10 bg-gradient-to-b from-card to-brand-parchment/30 shadow-sm"
      role="presentation"
    >
      <div
        className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-2.5 lg:p-2.5"
        role="tablist"
        aria-label="Filtrer par statut d’affaire"
      >
        <StatTab
          href={listHref(searchParams, { statut: "" })}
          isActive={allActive}
          label="Toutes"
          count={totalVisible}
          icon={LayoutGrid}
          accent={{
            top: "border-t-brand-gold",
            iconWrap: "bg-brand-gold/15",
            icon: "text-brand-gold",
            activeRing: "ring-brand-gold/30",
          }}
          isEmpty={totalVisible === 0}
        />

        {STATUT_ORDER.map((key) => (
          <StatTab
            key={key}
            href={listHref(searchParams, { statut: key })}
            isActive={activeStatut === key}
            label={STATUTS_AFFAIRE_LABEL[key]}
            count={countsByStatut[key]}
            icon={ICON_STATUT[key]}
            accent={STATUT_STYLE[key]}
            isEmpty={countsByStatut[key] === 0}
          />
        ))}
      </div>
    </div>
  );
}
