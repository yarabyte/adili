import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  Clock,
  FilePenLine,
  Plus,
  Scale,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { relativeTimeFr, type ActivityItem } from "@/lib/activity";
import type { CabinetDashboardData } from "@/lib/dashboard/get-cabinet-dashboard";
import { documentTypeLabel } from "@/lib/dashboard/get-cabinet-dashboard";
import {
  STATUTS_AFFAIRE_COLOR,
  STATUTS_AFFAIRE_LABEL,
} from "@/lib/constants/statuts";
import { toDate } from "@/lib/datetime";
import { formatDashboardGreetingName } from "@/lib/users/display-name";
import type { CorpusBreakdown } from "@/lib/corpus/stats";
import { formatCorpusStatsLine } from "@/lib/corpus/stats";
import { TYPES_ECHEANCE } from "@/lib/validation/echeances";

const ECHEANCE_TYPE_LABELS: Record<(typeof TYPES_ECHEANCE)[number], string> =
  {
    audience: "Audience",
    depot: "Dépôt",
    signification: "Signification",
    delai_appel: "Délai d'appel",
    autre: "Autre",
  };

const QUICK_QUESTIONS_OHADA = [
  "Conditions de validité de la convention d'arbitrage",
  "Compensation unilatérale en droit OHADA",
  "Prescription de l'action en paiement",
];

const QUICK_QUESTIONS_CAMEROUN = [
  "Homicide et meurtre en droit pénal camerounais",
  "Peines applicables au vol avec violence",
  "Prescription de l'action publique au Cameroun",
];

function formatShortDate(d: Date | string): string {
  const date = toDate(d);
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function CabinetDashboard({
  displayName,
  cabinetName,
  dashboard,
  corpus,
  activity,
}: {
  displayName: string;
  cabinetName: string | null;
  dashboard: CabinetDashboardData;
  corpus: CorpusBreakdown;
  activity: ActivityItem[];
}) {
  const greetingName = formatDashboardGreetingName(displayName);

  return (
    <div className="space-y-8 pb-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
          Tableau de bord
          {cabinetName ? (
            <span className="font-normal normal-case tracking-normal text-muted-foreground">
              {" "}
              · {cabinetName}
            </span>
          ) : null}
        </p>
        <h1 className="font-heading text-3xl font-semibold leading-tight text-brand-ink sm:text-4xl">
          Bonjour, {greetingName}
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          Vue d&apos;ensemble de votre cabinet : dossiers, échéances, pièces à
          valider et accès rapide au corpus et au droit camerounais.
        </p>
      </header>

      <section
        aria-label="Indicateurs"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        <KpiCard
          href="/app/affaires"
          icon={Briefcase}
          label="Dossiers"
          value={dashboard.kpis.totalAffaires}
          hint={`${dashboard.kpis.affairesActives} actif${dashboard.kpis.affairesActives > 1 ? "s" : ""}`}
        />
        <KpiCard
          href="/app/affaires?statut=en_cours"
          icon={Clock}
          label="En cours"
          value={dashboard.kpis.affairesActives}
          hint="Ouverts, en cours ou délibéré"
        />
        <KpiCard
          href="/app/affaires"
          icon={FilePenLine}
          label="À valider"
          value={dashboard.kpis.piecesEnRevue}
          hint="Pièces en revue"
          accent={dashboard.kpis.piecesEnRevue > 0 ? "alert" : "default"}
        />
        <KpiCard
          href="/app/affaires"
          icon={CalendarClock}
          label="7 prochains jours"
          value={dashboard.kpis.echeancesSemaine}
          hint="Échéances à venir"
        />
        <KpiCard
          href="/app/affaires"
          icon={CalendarClock}
          label="Mes échéances"
          value={dashboard.kpis.mesEcheances}
          hint="Dont vous êtes responsable"
        />
      </section>

      <section
        aria-label="Actions rapides"
        className="flex flex-wrap gap-2"
      >
        <Button asChild>
          <Link href="/recherche">
            <Search className="h-4 w-4" aria-hidden />
            Recherche corpus
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-brand-justice/20">
          <Link href="/app/affaires/nouvelle">
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle affaire
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-brand-justice/20">
          <Link href="/app/affaires">
            <Briefcase className="h-4 w-4" aria-hidden />
            Toutes les affaires
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-brand-justice/20">
          <Link href="/app/cabinet">
            <Users className="h-4 w-4" aria-hidden />
            Cabinet
          </Link>
        </Button>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {dashboard.canValidateDocuments &&
            dashboard.kpis.piecesEnRevue > 0 && (
              <Panel
                title="Pièces à valider"
                badge={dashboard.kpis.piecesEnRevue}
                href="/app/affaires"
              >
                <ul className="divide-y divide-brand-justice/8">
                  {dashboard.pendingDocuments.map((doc) => (
                    <li key={doc.id}>
                      <Link
                        href={`/app/affaires/${doc.affaireId}/documents/${doc.id}`}
                        className="flex items-center gap-3 px-1 py-2.5 transition hover:text-brand-justice"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-800">
                          <FilePenLine className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {doc.titre}
                          </span>
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            <span className="font-mono text-[10.5px]">
                              {doc.affaireReference}
                            </span>
                            {" — "}
                            {doc.affaireIntitule}
                            {" · "}
                            {documentTypeLabel(doc.typeDocument)}
                            {doc.auteurLabel ? ` · ${doc.auteurLabel}` : ""}
                          </span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-50" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

          <Panel title="Prochaines échéances" href="/app/affaires">
            {dashboard.upcomingEcheances.length === 0 ? (
              <EmptyHint text="Aucune échéance planifiée sur vos dossiers visibles." />
            ) : (
              <ul className="space-y-2">
                {dashboard.upcomingEcheances.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/app/affaires/${e.affaireId}?tab=echeances`}
                      className="flex items-start gap-3 rounded-lg border border-brand-justice/8 bg-brand-parchment/20 px-3 py-2.5 transition hover:border-brand-justice/20 hover:bg-card"
                    >
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {e.titre}
                          {e.isMine && (
                            <span className="ml-1.5 text-[10px] font-semibold uppercase text-brand-justice">
                              · Vous
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">
                          <span className="font-mono text-[10.5px]">
                            {e.affaireReference}
                          </span>
                          {" — "}
                          {e.affaireIntitule}
                          {e.type
                            ? ` · ${ECHEANCE_TYPE_LABELS[e.type]}`
                            : ""}{" "}
                          · {formatShortDate(e.dateEcheance)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Dossiers récents" href="/app/affaires">
            {dashboard.recentAffaires.length === 0 ? (
              <EmptyHint text="Créez votre première affaire pour commencer." />
            ) : (
              <ul className="divide-y divide-brand-justice/8">
                {dashboard.recentAffaires.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/app/affaires/${a.id}`}
                      className="flex items-center gap-3 py-2.5 transition hover:bg-brand-parchment/30"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {a.reference}
                          </span>
                          <span
                            className={
                              "rounded-full border px-2 py-0.5 text-[10px] font-medium " +
                              (STATUTS_AFFAIRE_COLOR[a.statut] ?? "")
                            }
                          >
                            {STATUTS_AFFAIRE_LABEL[a.statut]}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-sm font-medium">
                          {a.intitule}
                        </span>
                        <span className="text-[11.5px] text-muted-foreground">
                          {a.clientNom}
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 opacity-40" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Activité récente">
            {activity.length === 0 ? (
              <EmptyHint text="Vos recherches et synthèses apparaîtront ici." />
            ) : (
              <ul className="space-y-2">
                {activity.map((item) => (
                  <ActivityCompact key={`${item.kind}-${item.id}`} item={item} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-xl border border-brand-gold/25 bg-gradient-to-br from-card via-brand-parchment/40 to-card p-5 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-justice/15 bg-brand-justice/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-brand-justice">
                <Sparkles className="h-3 w-3" aria-hidden />
                OHADA
              </span>
              {corpus.cameroon.sources > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/20 bg-emerald-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-900">
                  <Scale className="h-3 w-3" aria-hidden />
                  Cameroun
                </span>
              )}
            </div>
            <h2 className="mt-2 font-heading text-lg font-semibold text-brand-ink">
              Recherche assistée
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {formatCorpusStatsLine(corpus.total)} au total
            </p>

            <ul className="mt-3 space-y-2 text-[12px]">
              <li className="rounded-lg border border-brand-justice/10 bg-background/60 px-3 py-2">
                <span className="font-semibold text-brand-justice">OHADA</span>
                <span className="mt-0.5 block tabular-nums text-muted-foreground">
                  {formatCorpusStatsLine(corpus.ohada)}
                </span>
              </li>
              {corpus.cameroon.sources > 0 && (
                <li className="rounded-lg border border-emerald-700/15 bg-emerald-50/50 px-3 py-2">
                  <span className="font-semibold text-emerald-900">
                    Cameroun · CP-CM
                  </span>
                  <span className="mt-0.5 block tabular-nums text-muted-foreground">
                    {formatCorpusStatsLine(corpus.cameroon)}
                  </span>
                </li>
              )}
            </ul>

            <Button asChild size="sm" className="mt-4 w-full sm:w-auto">
              <Link href="/recherche">
                <Search className="h-4 w-4" aria-hidden />
                Ouvrir la recherche
              </Link>
            </Button>

            <div className="mt-4 space-y-3 border-t border-brand-justice/10 pt-3">
              <QuickQuestionGroup
                label="OHADA"
                questions={QUICK_QUESTIONS_OHADA}
              />
              {corpus.cameroon.sources > 0 && (
                <QuickQuestionGroup
                  label="Cameroun"
                  questions={QUICK_QUESTIONS_CAMEROUN}
                  variant="cameroon"
                />
              )}
            </div>
          </section>

          {dashboard.recentlyOpened.length > 0 && (
            <Panel title="Consultés récemment">
              <ul className="space-y-1">
                {dashboard.recentlyOpened.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/app/affaires/${a.id}`}
                      className="flex items-center justify-between gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-brand-parchment/40"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-[10.5px] text-muted-foreground">
                          {a.reference}
                        </span>
                        <span className="ml-1.5">{a.intitule}</span>
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relativeTimeFr(a.lastViewedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  href,
  icon: Icon,
  label,
  value,
  hint,
  accent = "default",
}: {
  href: string;
  icon: typeof Briefcase;
  label: string;
  value: number;
  hint: string;
  accent?: "default" | "alert";
}) {
  return (
    <Link
      href={href}
      className={
        "group rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md " +
        (accent === "alert" && value > 0
          ? "border-amber-500/35 hover:border-amber-500/50"
          : "border-brand-justice/10 hover:border-brand-justice/25")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            "flex h-8 w-8 items-center justify-center rounded-md " +
            (accent === "alert" && value > 0
              ? "bg-amber-500/15 text-amber-800"
              : "bg-brand-gold/10 text-brand-gold")
          }
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="font-heading text-3xl font-semibold tabular-nums text-brand-ink">
        {value.toLocaleString("fr-FR")}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </Link>
  );
}

function Panel({
  title,
  badge,
  href,
  children,
}: {
  title: string;
  badge?: number;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-brand-justice/10 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-brand-justice/8 px-4 py-3">
        <h2 className="font-heading text-base font-semibold text-brand-ink">
          {title}
          {badge !== undefined && badge > 0 && (
            <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-900">
              {badge}
            </span>
          )}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-[12px] font-medium text-brand-justice hover:underline"
          >
            Tout voir
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function QuickQuestionGroup({
  label,
  questions,
  variant = "ohada",
}: {
  label: string;
  questions: string[];
  variant?: "ohada" | "cameroon";
}) {
  const labelClass =
    variant === "cameroon"
      ? "text-[10px] font-semibold uppercase tracking-wider text-emerald-800"
      : "text-[10px] font-semibold uppercase tracking-wider text-brand-justice/80";

  return (
    <div>
      <p className={labelClass}>{label}</p>
      <ul className="mt-1.5 space-y-1">
        {questions.map((q) => (
          <li key={q}>
            <Link
              href={`/recherche?q=${encodeURIComponent(q)}`}
              className="block truncate text-[12px] text-foreground/80 hover:text-brand-justice"
            >
              {q}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-brand-justice/12 bg-brand-parchment/20 px-3 py-6 text-center text-[12.5px] text-muted-foreground">
      {text}
    </p>
  );
}

function ActivityCompact({ item }: { item: ActivityItem }) {
  if (item.kind === "search") {
    const query = item.query.trim();
    return (
      <Link
        href={`/recherche?q=${encodeURIComponent(query)}`}
        className="flex items-center gap-2 rounded-md border border-brand-justice/8 px-2.5 py-2 text-[12px] hover:bg-brand-parchment/30"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-brand-justice" />
        <span className="min-w-0 flex-1 truncate font-medium">{query}</span>
        <span className="shrink-0 text-muted-foreground">
          {relativeTimeFr(item.createdAt)}
        </span>
      </Link>
    );
  }

  const query = (item.query ?? "").trim();
  const isError = item.status !== "ok";
  const Icon = isError ? AlertTriangle : Sparkles;

  const body = (
    <div className="flex items-center gap-2 rounded-md border border-brand-justice/8 px-2.5 py-2 text-[12px]">
      <Icon
        className={
          "h-3.5 w-3.5 shrink-0 " +
          (isError ? "text-brand-crimson" : "text-brand-gold")
        }
      />
      <span className="min-w-0 flex-1 truncate font-medium">
        {query || "Synthèse"}
      </span>
      <span className="shrink-0 text-muted-foreground">
        {relativeTimeFr(item.createdAt)}
      </span>
    </div>
  );

  if (!query) return body;
  return (
    <Link
      href={`/recherche?q=${encodeURIComponent(query)}`}
      className="block hover:opacity-90"
    >
      {body}
    </Link>
  );
}
