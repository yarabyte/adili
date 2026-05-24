"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Filter,
  Lock,
  NotebookPen,
  Plus,
  ShieldAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UrlListPagination } from "@/components/ui/url-list-pagination";
import { LABELS_CR } from "@/lib/constants/types-comptes-rendus";
import {
  STATUTS_CR_COLOR,
  STATUTS_CR_LABEL,
  type StatutCompteRendu,
} from "@/lib/constants/statuts-compte-rendu";
import type { CompteRenduListItem } from "@/lib/comptes-rendus/types";

const CR_PAGE_SIZE = 15;
const STATUTS = Object.keys(STATUTS_CR_LABEL) as StatutCompteRendu[];

const selectClassName =
  "h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function ComptesRendusPanelClient({
  affaireId,
  comptesRendus,
  canCreate,
  currentUserId,
}: {
  affaireId: string;
  comptesRendus: CompteRenduListItem[];
  canCreate: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const filterType = params?.get("crType") ?? "";
  const filterStatut = params?.get("crStatut") ?? "";
  const filterAuteur = params?.get("crAuteur") ?? "";
  const mineOnly = params?.get("crMine") === "1";
  const pageParam = Math.max(1, parseInt(params?.get("crPage") ?? "1", 10) || 1);

  const auteurs = useMemo(() => {
    const map = new Map<string, string>();
    for (const cr of comptesRendus) {
      map.set(cr.auteurId, cr.auteurLabel);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [comptesRendus]);

  const filtered = useMemo(() => {
    return comptesRendus.filter((cr) => {
      if (filterType && cr.typeCr !== filterType) return false;
      if (filterStatut && cr.statut !== filterStatut) return false;
      if (filterAuteur && cr.auteurId !== filterAuteur) return false;
      if (mineOnly && cr.auteurId !== currentUserId) return false;
      return true;
    });
  }, [comptesRendus, filterType, filterStatut, filterAuteur, mineOnly, currentUserId]);

  const monthMinutes = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return comptesRendus
      .filter((cr) => new Date(cr.dateEvenement) >= start)
      .reduce((acc, cr) => acc + (cr.dureeMinutes ?? 0), 0);
  }, [comptesRendus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CR_PAGE_SIZE));
  const currentPage = Math.min(pageParam, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * CR_PAGE_SIZE,
    currentPage * CR_PAGE_SIZE
  );

  const hasFilters = Boolean(filterType || filterStatut || filterAuteur || mineOnly);

  function pushParams(next: Record<string, string | null>) {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    url.searchParams.delete("crPage");
    router.replace(url.pathname + url.search, { scroll: false });
  }

  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-brand-ink">
            Comptes rendus
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Audiences, rendez-vous clients, réunions — avec suivi du temps passé
            sur le dossier.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <Clock className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {formatDuration(monthMinutes)} enregistré{monthMinutes > 60 ? "s" : ""}{" "}
            en {monthLabel} sur cette affaire
          </p>
        </div>
        {canCreate && (
          <Button asChild size="sm">
            <Link href={`/app/affaires/${affaireId}/comptes-rendus/nouveau`}>
              <Plus className="h-4 w-4" />
              Nouveau CR
            </Link>
          </Button>
        )}
      </div>

      <section
        aria-label="Filtres des comptes rendus"
        className="flex flex-col gap-3 rounded-xl border border-brand-justice/10 bg-card/60 p-3 lg:flex-row lg:flex-wrap lg:items-center"
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Filtrer
        </span>

        <select
          className={`${selectClassName} min-w-[140px] flex-1 lg:max-w-[200px]`}
          value={filterType}
          onChange={(e) => pushParams({ crType: e.target.value || null })}
          aria-label="Type de compte rendu"
        >
          <option value="">Tous les types</option>
          {Object.entries(LABELS_CR).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          className={`${selectClassName} min-w-[120px] flex-1 lg:max-w-[180px]`}
          value={filterStatut}
          onChange={(e) => pushParams({ crStatut: e.target.value || null })}
          aria-label="Statut du compte rendu"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUTS_CR_LABEL[s]}
            </option>
          ))}
        </select>

        <select
          className={`${selectClassName} min-w-[140px] flex-1 lg:max-w-[220px]`}
          value={filterAuteur}
          onChange={(e) => pushParams({ crAuteur: e.target.value || null })}
          aria-label="Auteur du compte rendu"
        >
          <option value="">Tous les auteurs</option>
          {auteurs.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>

        <label className="inline-flex h-10 shrink-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) =>
              pushParams({ crMine: e.target.checked ? "1" : null })
            }
            className="rounded border-input"
          />
          Mes CR
        </label>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() =>
              pushParams({
                crType: null,
                crStatut: null,
                crAuteur: null,
                crMine: null,
              })
            }
          >
            <X className="h-4 w-4" />
            Effacer
          </Button>
        )}
      </section>

      {paginated.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-justice/15 px-4 py-10 text-center text-sm text-muted-foreground">
          {canCreate
            ? "Aucun compte rendu — créez le premier."
            : "Aucun compte rendu pour cette affaire."}
        </p>
      ) : (
        <ul className="space-y-2">
          {paginated.map((cr) => (
            <li key={cr.id}>
              <CrRow affaireId={affaireId} cr={cr} />
            </li>
          ))}
        </ul>
      )}

      <UrlListPagination
        paramName="crPage"
        page={currentPage}
        pageSize={CR_PAGE_SIZE}
        total={filtered.length}
      />
    </div>
  );
}

function CrRow({
  affaireId,
  cr,
}: {
  affaireId: string;
  cr: CompteRenduListItem;
}) {
  const inner = (
    <div className="flex flex-col gap-2 rounded-lg border border-brand-justice/10 bg-card px-4 py-3 transition hover:border-brand-justice/25 hover:bg-brand-parchment/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUTS_CR_COLOR[cr.statut]}`}
          >
            {STATUTS_CR_LABEL[cr.statut]}
          </span>
          {cr.confidentialite === "sensible" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase text-rose-700">
              <ShieldAlert className="h-3 w-3" />
              Sensible
            </span>
          )}
          {!cr.canViewDetail && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Accès restreint
            </span>
          )}
        </div>
        <p className="truncate font-medium text-foreground">
          {cr.canViewDetail ? cr.titre : "Compte rendu confidentiel"}
        </p>
        <p className="text-xs text-muted-foreground">
          {LABELS_CR[cr.typeCr] ?? cr.typeCr} · {formatWhen(cr.dateEvenement)} ·{" "}
          {cr.auteurLabel}
          {cr.dureeMinutes != null && ` · ${formatDuration(cr.dureeMinutes)}`}
        </p>
      </div>
      {cr.canViewDetail && (
        <NotebookPen className="hidden h-5 w-5 shrink-0 text-brand-justice/60 sm:block" />
      )}
    </div>
  );

  if (!cr.canViewDetail) {
    return inner;
  }

  return (
    <Link href={`/app/affaires/${affaireId}/comptes-rendus/${cr.id}`}>
      {inner}
    </Link>
  );
}
