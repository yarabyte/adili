import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  GraduationCap,
  Landmark,
  Rocket,
  TrendingUp,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { getAdminNavCounts } from "@/lib/admin/nav-counts";
import { getRevenueMetrics } from "@/lib/admin/revenue";
import { formatFcfa } from "@/lib/billing/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Administration · Adili" };

const QUICK_LINKS = [
  {
    href: "/admin/revenue",
    title: "Revenus & MRR",
    description: "MRR, ARR, encaissements et répartition par plan.",
    icon: TrendingUp,
    cta: "Tableau de bord",
  },
  {
    href: "/admin/subscriptions",
    title: "Abonnements",
    description: "Prolonger, suspendre ou réactiver un cabinet.",
    icon: CreditCard,
    cta: "Gérer",
    variant: "outline" as const,
  },
  {
    href: "/admin/payments-pending",
    title: "Virements",
    description: "Valider les paiements après réception de la preuve.",
    icon: Landmark,
    cta: "File d'attente",
    countKey: "virements" as const,
  },
  {
    href: "/admin/beta-applications",
    title: "Avocats pionniers",
    description: "Candidatures programme beta — accepter ou rejeter.",
    icon: Rocket,
    cta: "Candidatures",
    countKey: "beta" as const,
  },
  {
    href: "/admin/etudiants-validation",
    title: "Étudiants",
    description: "Vérifier les justificatifs et valider les tarifs réduits.",
    icon: GraduationCap,
    cta: "Validations",
    countKey: "etudiants" as const,
  },
] as const;

export default async function AdminHomePage() {
  await requireAdminPage();

  const [counts, metrics] = await Promise.all([
    getAdminNavCounts(),
    getRevenueMetrics(),
  ]);

  const pendingActions =
    counts.virements + counts.beta + counts.etudiants;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Administration Adili"
        description="Centre de contrôle facturation, paiements et programmes d'accompagnement."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="MRR"
          value={formatFcfa(metrics.mrrFcfa)}
          hint={`${metrics.abonnementsActifs} abonnement(s) actif(s)`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <AdminStatCard
          label="Encaissé (30 j)"
          value={formatFcfa(metrics.revenuEncaisse30jFcfa)}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <AdminStatCard
          label="Actions en attente"
          value={String(pendingActions)}
          hint={
            pendingActions > 0
              ? "Virements, beta ou étudiants à traiter"
              : "Aucune action urgente"
          }
          trend={pendingActions > 0 ? "down" : "neutral"}
          icon={<Landmark className="h-4 w-4" />}
        />
        <AdminStatCard
          label="Paiements en attente"
          value={String(metrics.paiementsEnAttente)}
          icon={<Landmark className="h-4 w-4" />}
        />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold text-brand-justice">
          Accès rapides
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            const badge =
              "countKey" in link ? counts[link.countKey] : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex flex-col rounded-xl border border-brand-justice/10 bg-card p-5 shadow-sm transition-all hover:border-brand-justice/25 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-justice/8 text-brand-justice transition-colors group-hover:bg-brand-justice group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {badge > 0 && (
                    <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-bold text-brand-gold">
                      {badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-semibold text-foreground">
                  {link.title}
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {link.description}
                </p>
                <span
                  className={cn(
                    "mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-justice"
                  )}
                >
                  {link.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-brand-justice/10 bg-muted/40 p-5">
        <h2 className="text-sm font-semibold text-brand-justice">
          Premier administrateur
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Créer un compte super admin à partir d&apos;un utilisateur existant :
        </p>
        <code className="mt-3 block overflow-x-auto rounded-lg border bg-card px-3 py-2 font-mono text-xs text-foreground">
          ADMIN_BOOTSTRAP_EMAIL=vous@cabinet.cm npm run admin:bootstrap
        </code>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/app">Retour à l&apos;application</Link>
        </Button>
      </section>
    </div>
  );
}
