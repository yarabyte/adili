"use client";

import {
  AreaChart,
  BarList,
  DonutChart,
} from "@tremor/react";
import Link from "next/link";
import {
  Brain,
  CreditCard,
  Eye,
  FileText,
  Globe2,
  MapPin,
  Radio,
  Share2,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  ArrowRight,
} from "lucide-react";
import useSWR from "swr";

import {
  AnalyticsChartCard,
  AnalyticsKpiSkeleton,
} from "@/components/admin/analytics/analytics-chart-card";
import { KpiCard } from "@/components/admin/analytics/kpi-card";
import {
  adminAnalyticsFetcher,
  analyticsUrl,
} from "@/lib/admin/analytics/fetcher";
import { formatFcfa } from "@/lib/billing/format";
import { Button } from "@/components/ui/button";

type OverviewResponse = {
  kpis: {
    visitors: { value: number; change: number | null };
    signups: { value: number; change: number | null };
    new_subscriptions: { value: number; change: number | null };
    revenue_fcfa: { value: number; change: number | null };
    online_now: { value: number; change: null };
    page_views: { value: number; change: number | null };
    ai_calls: { value: number; change: number | null };
    sessions: { value: number; change: number | null };
  };
};

const SOURCE_ICONS: Record<string, string> = {
  direct: "↗",
  google: "🔍",
  linkedin: "💼",
  whatsapp: "💬",
  facebook: "📘",
  other_referral: "🔗",
};

function sourceLabel(source: string): string {
  const icon = SOURCE_ICONS[source] ?? "•";
  const labels: Record<string, string> = {
    direct: "Direct",
    google: "Google",
    linkedin: "LinkedIn",
    whatsapp: "WhatsApp",
    facebook: "Facebook",
    other_referral: "Autres referrals",
  };
  return `${icon} ${labels[source] ?? source}`;
}

export function AnalyticsOverviewClient({ period }: { period: string }) {
  const overviewKey = `/api/admin/analytics/overview?period=${period}&compare=true`;
  const trafficKey = analyticsUrl("/api/admin/analytics/traffic/daily", period);
  const sourcesKey = analyticsUrl("/api/admin/analytics/traffic/sources", period);
  const pagesKey = analyticsUrl("/api/admin/analytics/traffic/pages", period);
  const geoKey = analyticsUrl("/api/admin/analytics/traffic/geography", period);

  const { data: overview } = useSWR<OverviewResponse>(overviewKey, adminAnalyticsFetcher, {
    refreshInterval: 30_000,
  });
  const { data: traffic } = useSWR<{ series: Record<string, string | number>[] }>(
    trafficKey,
    adminAnalyticsFetcher,
    { refreshInterval: 30_000 }
  );
  const { data: sources } = useSWR<{ sources: { source: string; visitors: number }[] }>(
    sourcesKey,
    adminAnalyticsFetcher,
    { refreshInterval: 30_000 }
  );
  const { data: pages } = useSWR<{
    pages: { path: string; views: number }[];
  }>(pagesKey, adminAnalyticsFetcher, { refreshInterval: 30_000 });
  const { data: geo } = useSWR<{
    geography: { country: string; visitors: number }[];
  }>(geoKey, adminAnalyticsFetcher, { refreshInterval: 30_000 });

  if (!overview) {
    return (
      <div className="space-y-6">
        <AnalyticsKpiSkeleton count={4} />
        <AnalyticsKpiSkeleton count={3} />
      </div>
    );
  }

  const sourcesData =
    sources?.sources.map((s) => ({
      source: sourceLabel(s.source),
      visitors: s.visitors,
    })) ?? [];
  const topPagesData =
    pages?.pages.map((p) => ({
      name: p.path === "/" ? "🏠 Accueil" : `📄 ${p.path}`,
      value: p.views,
    })) ?? [];
  const geoData =
    geo?.geography.map((g) => ({
      name: `🌍 ${g.country}`,
      value: g.visitors,
    })) ?? [];

  return (
    <div className="space-y-6">
      {/* KPIs acquisition */}
      <section aria-labelledby="kpi-acquisition">
        <h2 id="kpi-acquisition" className="sr-only">
          Indicateurs d&apos;acquisition
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Visiteurs uniques"
            value={overview.kpis.visitors.value}
            delta={overview.kpis.visitors.change}
            icon={Users}
            tone="sky"
          />
          <KpiCard
            label="Nouvelles inscriptions"
            value={overview.kpis.signups.value}
            delta={overview.kpis.signups.change}
            icon={UserPlus}
            tone="sage"
          />
          <KpiCard
            label="Nouveaux abonnements"
            value={overview.kpis.new_subscriptions.value}
            delta={overview.kpis.new_subscriptions.change}
            icon={CreditCard}
            tone="gold"
          />
          <KpiCard
            label="Revenus"
            value={formatFcfa(overview.kpis.revenue_fcfa.value)}
            delta={overview.kpis.revenue_fcfa.change}
            icon={Wallet}
            tone="justice"
          />
        </div>
      </section>

      {/* KPIs engagement */}
      <section aria-labelledby="kpi-engagement">
        <h2 id="kpi-engagement" className="sr-only">
          Indicateurs d&apos;engagement
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Pages vues"
            value={overview.kpis.page_views.value}
            delta={overview.kpis.page_views.change}
            icon={Eye}
            tone="violet"
          />
          <KpiCard
            label="Appels IA"
            value={overview.kpis.ai_calls.value}
            delta={overview.kpis.ai_calls.change}
            icon={Sparkles}
            tone="crimson"
            hint="Synthèses & features IA"
          />
          <KpiCard
            label="Sessions"
            value={overview.kpis.sessions.value}
            delta={overview.kpis.sessions.change}
            icon={TrendingUp}
            tone="sky"
          />
        </div>
      </section>

      {/* Live banner */}
      <div className="relative overflow-hidden rounded-xl border border-brand-sage/25 bg-gradient-to-r from-brand-sage/10 via-card to-brand-parchment/80 p-5 shadow-sm">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-sage/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-sage/15 text-brand-sage ring-1 ring-brand-sage/25">
              <Radio className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-sage">
                Temps réel
              </p>
              <p className="mt-0.5 flex items-center gap-2 font-heading text-3xl font-semibold text-brand-justice">
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-brand-sage" />
                {overview.kpis.online_now.value}
                <span className="text-base font-normal text-muted-foreground">
                  en ligne
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sessions actives dans les 5 dernières minutes
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2 border-brand-sage/30">
            <Link href="/admin/analytics/users/online">
              Voir le live
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Évolution du trafic"
          subtitle="Visiteurs, sessions et pages vues"
          icon={TrendingUp}
          tone="sky"
        >
          <AreaChart
            className="mt-2 h-72"
            data={traffic?.series ?? []}
            index="day"
            categories={["Visiteurs", "Sessions", "Pages vues"]}
            colors={["blue", "cyan", "amber"]}
            valueFormatter={(v) => Number(v).toLocaleString("fr-FR")}
            yAxisWidth={48}
            showAnimation
          />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Sources de trafic"
          subtitle="UTM et referrers agrégés"
          icon={Share2}
          tone="violet"
        >
          <DonutChart
            className="mt-2 h-72"
            data={sourcesData}
            category="visitors"
            index="source"
            valueFormatter={(v) => Number(v).toLocaleString("fr-FR")}
            colors={["blue", "violet", "indigo", "rose", "cyan", "amber"]}
            showAnimation
          />
        </AnalyticsChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Pages les plus consultées"
          subtitle="Classement par vues sur la période"
          icon={FileText}
          tone="gold"
          action={
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href="/admin/analytics/traffic">Détails</Link>
            </Button>
          }
        >
          <BarList data={topPagesData} className="mt-2" showAnimation />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Top pays"
          subtitle="Visiteurs uniques par pays"
          icon={MapPin}
          tone="sage"
        >
          <BarList data={geoData} className="mt-2" showAnimation />
        </AnalyticsChartCard>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/analytics/traffic", label: "Trafic détaillé", icon: Globe2 },
          { href: "/admin/analytics/business", label: "Business", icon: Wallet },
          { href: "/admin/analytics/ia", label: "Usage IA", icon: Brain },
          { href: "/admin/analytics/events", label: "Événements", icon: Sparkles },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-xl border border-brand-justice/10 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-gold/30 hover:shadow-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-justice/8 text-brand-justice transition-colors group-hover:bg-brand-gold/15 group-hover:text-brand-ink">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-justice" />
          </Link>
        ))}
      </div>
    </div>
  );
}
