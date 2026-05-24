import { and, desc, eq, exists, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Briefcase,
  ChevronRight,
  FilePenLine,
  Filter,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import {
  affaireMembres,
  affaires,
  clients,
  documents,
  users,
} from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  STATUTS_AFFAIRE_COLOR,
  STATUTS_AFFAIRE_LABEL,
} from "@/lib/constants/statuts";
import { LABELS_CONTENTIEUX } from "@/lib/constants/types-contentieux";
import { formatMemberDisplayName } from "@/lib/users/display-name";

import { AffaireFilters } from "./affaire-filters";
import { AffairesStatStrip } from "./affaires-stat-strip";

export const metadata = { title: "Affaires · Adili" };
export const dynamic = "force-dynamic";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

type SearchParams = {
  q?: string;
  statut?: string;
  type?: string;
};

const ZERO_COUNTS: Record<keyof typeof STATUTS_AFFAIRE_LABEL, number> = {
  ouvert: 0,
  en_cours: 0,
  en_delibere: 0,
  clos: 0,
  archive: 0,
};

export default async function AffairesListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");
  const cabinetId = session.profile.cabinetId;

  const visibleFilters = [eq(affaires.cabinetId, cabinetId)];

  // Visibilité : standard OU (sensible AND membre explicite).
  const explicitMember = exists(
    db
      .select({ x: sql`1` })
      .from(affaireMembres)
      .where(
        and(
          eq(affaireMembres.affaireId, affaires.id),
          eq(affaireMembres.userId, session.user.id)
        )
      )
  );
  visibleFilters.push(
    sql`(${affaires.confidentialite} = 'standard' OR ${explicitMember})`
  );

  const listFilters = [...visibleFilters];

  if (searchParams.statut && searchParams.statut in STATUTS_AFFAIRE_LABEL) {
    listFilters.push(
      eq(
        affaires.statut,
        searchParams.statut as keyof typeof STATUTS_AFFAIRE_LABEL
      )
    );
  }
  if (searchParams.type && searchParams.type in LABELS_CONTENTIEUX) {
    listFilters.push(
      eq(
        affaires.typeContentieux,
        searchParams.type as keyof typeof LABELS_CONTENTIEUX
      )
    );
  }
  if (searchParams.q && searchParams.q.trim().length > 0) {
    const like = `%${searchParams.q.trim()}%`;
    listFilters.push(
      sql`(${affaires.intitule} ILIKE ${like} OR ${affaires.reference} ILIKE ${like})`
    );
  }

  const rows = await db
    .select({
      id: affaires.id,
      reference: affaires.reference,
      intitule: affaires.intitule,
      typeContentieux: affaires.typeContentieux,
      juridiction: affaires.juridiction,
      statut: affaires.statut,
      confidentialite: affaires.confidentialite,
      dateOuverture: affaires.dateOuverture,
      updatedAt: affaires.updatedAt,
      clientNom: clients.nom,
      responsableId: users.id,
      responsableNom: users.fullName,
      responsableEmail: users.email,
      responsableTitre: users.titre,
    })
    .from(affaires)
    .innerJoin(clients, eq(affaires.clientId, clients.id))
    .innerJoin(users, eq(affaires.responsableId, users.id))
    .where(and(...listFilters))
    .orderBy(desc(affaires.updatedAt))
    .limit(100);

  const [totalVisibleRow, statutAgg, pendingReviewRow] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(affaires)
      .where(and(...visibleFilters)),
    db
      .select({
        statut: affaires.statut,
        n: sql<number>`count(*)::int`,
      })
      .from(affaires)
      .where(and(...visibleFilters))
      .groupBy(affaires.statut),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(documents)
      .innerJoin(affaires, eq(documents.affaireId, affaires.id))
      .where(and(...visibleFilters, eq(documents.statut, "en_revue"))),
  ]);

  const totalVisible = Number(totalVisibleRow[0]?.total ?? 0);
  const countsByStatut = { ...ZERO_COUNTS };
  for (const row of statutAgg) {
    const k = row.statut as keyof typeof STATUTS_AFFAIRE_LABEL;
    if (k in countsByStatut) {
      countsByStatut[k] = Number(row.n ?? 0);
    }
  }
  const pendingReview = Number(pendingReviewRow[0]?.n ?? 0);

  const hasActiveListFilters = Boolean(
    searchParams.q?.trim() ||
      (searchParams.statut && searchParams.statut in STATUTS_AFFAIRE_LABEL) ||
      (searchParams.type && searchParams.type in LABELS_CONTENTIEUX)
  );

  return (
    <div className="space-y-5 pb-10">
      <header className="flex flex-col gap-4 border-b border-brand-justice/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
            Module Affaires
          </p>
          <h1 className="font-heading text-3xl font-semibold leading-tight text-brand-ink sm:text-4xl">
            Affaires
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Dossiers et pièces. Les affaires marquées sensibles n&apos;apparaissent
            que pour les membres affectés au dossier.
          </p>
          <p className="text-xs font-medium text-brand-ink/85">
            {totalVisible === 0 ? (
              <>Aucun dossier dans votre vue.</>
            ) : (
              <>
                <span className="tabular-nums">{totalVisible}</span> dossier
                {totalVisible > 1 ? "s" : ""} affiché
                {totalVisible > 1 ? "s" : ""}
                {hasActiveListFilters ? " (filtres actifs)" : ""}
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              size="default"
              className="border-brand-justice/20 bg-card/80 text-sm font-medium"
            >
              <Link
                href="/recherche"
                className="inline-flex items-center gap-2"
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                Corpus OHADA
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 opacity-60"
                  aria-hidden
                />
              </Link>
            </Button>
            <Button asChild className="shadow-sm">
              <Link href="/app/affaires/nouvelle">
                <Plus className="h-4 w-4" aria-hidden />
                Nouvelle affaire
              </Link>
            </Button>
          </div>
          <p className="hidden max-w-xs text-right text-[11px] leading-snug text-muted-foreground sm:block">
            Rédigez les pièces dans chaque dossier — citations et export PDF
            inclus.
          </p>
        </div>
      </header>

      {pendingReview > 0 && (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5 text-[13px] text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/20 dark:text-amber-100"
          role="status"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-200">
            <FilePenLine className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-medium leading-snug">
              <span className="tabular-nums">{pendingReview}</span> pièce
              {pendingReview > 1 ? "s" : ""} à valider
            </p>
            <p className="text-[12px] leading-snug text-amber-900/80 dark:text-amber-100/75">
              Soumises en « En revue » — ouvrez l&apos;affaire concernée pour
              approuver ou rejeter.
            </p>
          </div>
        </div>
      )}

      <section aria-label="Synthèse par statut" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-base font-semibold text-brand-ink">
            Par statut
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Filtrer la liste ci-dessous
          </p>
        </div>
        <AffairesStatStrip
          searchParams={searchParams}
          countsByStatut={countsByStatut}
          totalVisible={totalVisible}
        />
      </section>

      <AffaireFilters />

      {rows.length === 0 ? (
        <EmptyState hasFilters={hasActiveListFilters} />
      ) : (
        <section
          aria-label="Liste des affaires"
          className="overflow-hidden rounded-2xl border border-brand-justice/10 bg-card shadow-sm"
        >
          <div className="flex flex-col gap-1 border-b border-brand-justice/10 bg-brand-parchment-dark/20 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-sm font-semibold text-brand-ink sm:text-base">
              Liste des dossiers
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {hasActiveListFilters ? (
                <>
                  <span className="font-medium tabular-nums text-foreground">
                    {rows.length}
                  </span>{" "}
                  résultat{rows.length > 1 ? "s" : ""} sur {totalVisible}
                </>
              ) : (
                <>
                  <span className="font-medium tabular-nums text-foreground">
                    {rows.length}
                  </span>
                  {rows.length >= 100
                    ? " (100 max. — tri par mise à jour)"
                    : ""}
                </>
              )}
            </p>
          </div>

          <ul className="divide-y divide-brand-justice/10 md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/app/affaires/${r.id}`}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors active:bg-brand-parchment-dark/40"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[12px] font-semibold tabular-nums text-brand-justice">
                        {r.reference}
                      </span>
                      <span
                        className={`inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUTS_AFFAIRE_COLOR[r.statut]}`}
                      >
                        {STATUTS_AFFAIRE_LABEL[r.statut]}
                      </span>
                      {r.confidentialite === "sensible" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-200">
                          <ShieldAlert className="h-2.5 w-2.5" aria-hidden />
                          Sensible
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {r.intitule}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {r.clientNom}
                      {r.juridiction ? ` · ${r.juridiction}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatMemberDisplayName(
                        r.responsableNom,
                        r.responsableEmail,
                        r.responsableTitre
                      )}{" "}
                      · {formatDate(r.updatedAt)}
                    </p>
                  </div>
                  <ChevronRight
                    className="mt-1 h-5 w-5 shrink-0 text-muted-foreground/60"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <table className="w-full text-left">
            <thead className="bg-brand-parchment-dark/30 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Intitulé</th>
                <th className="hidden px-4 py-3 lg:table-cell">Contentieux</th>
                <th className="hidden px-4 py-3 md:table-cell">Responsable</th>
                <th className="px-4 py-3">Statut</th>
                <th className="hidden px-4 py-3 text-right lg:table-cell">
                  Mis à jour
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-justice/10 text-sm">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="transition-colors hover:bg-brand-parchment-dark/30"
                >
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/app/affaires/${r.id}`}
                      className="font-mono text-[12.5px] font-medium tabular-nums text-brand-justice hover:text-brand-gold"
                    >
                      {r.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/app/affaires/${r.id}`}
                      className="group block min-w-0"
                    >
                      <p className="truncate font-medium text-foreground group-hover:text-brand-ink">
                        {r.intitule}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {r.clientNom}
                        {r.juridiction ? ` · ${r.juridiction}` : ""}
                      </p>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 align-top lg:table-cell">
                    <span className="rounded-full border border-brand-justice/15 bg-card px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {LABELS_CONTENTIEUX[r.typeContentieux]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 align-top md:table-cell">
                    <p className="text-[12.5px] text-foreground">
                      {formatMemberDisplayName(
                        r.responsableNom,
                        r.responsableEmail,
                        r.responsableTitre
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col items-start gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STATUTS_AFFAIRE_COLOR[r.statut]}`}
                      >
                        {STATUTS_AFFAIRE_LABEL[r.statut]}
                      </span>
                      {r.confidentialite === "sensible" && (
                        <span
                          title="Affaire sensible — accès restreint"
                          className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-200"
                        >
                          <ShieldAlert className="h-3 w-3" aria-hidden />
                          Sensible
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 align-top text-right text-[12.5px] text-muted-foreground lg:table-cell">
                    {formatDate(r.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-justice/15 bg-card/60 px-6 py-12 text-center">
        <Filter className="h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Aucune affaire ne correspond à vos filtres.
        </p>
        <Button asChild variant="outline" size="sm" className="border-brand-justice/25">
          <Link href="/app/affaires">Réinitialiser</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-brand-justice/15 bg-card/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
        <Briefcase className="h-6 w-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="font-heading text-lg font-semibold text-brand-ink">
          Aucune affaire pour l&apos;instant
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          Créez votre première affaire pour démarrer un dossier contentieux,
          rattacher un client et y rédiger vos pièces.
        </p>
      </div>
      <Button asChild className="shadow-sm">
        <Link href="/app/affaires/nouvelle">
          <Plus className="h-4 w-4" aria-hidden />
          Créer une affaire
        </Link>
      </Button>
    </div>
  );
}
