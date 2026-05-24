import { desc, eq } from "drizzle-orm";
import { ChevronLeft, CreditCard, FileText, Package, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { QuotaProgress } from "@/components/billing/quota-progress";
import { TrialBanner } from "@/components/billing/trial-banner";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getIntendedPlan } from "@/lib/onboarding/intended-plan";
import { formatFcfa } from "@/lib/billing/format";
import { formatPeriodeFinLabel } from "@/lib/billing/period";
import { getActiveSubscriptionForUser } from "@/lib/billing/subscription";
import { db } from "@/lib/db/client";
import { factures } from "@/lib/db/schema";
import { getQuotaSummaryForUser } from "@/lib/quotas/check-and-consume";

export const metadata = { title: "Facturation · Adili" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (getIntendedPlan(session) === "etudiant") redirect("/app");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  const sub = await getActiveSubscriptionForUser(session.user.id);
  const quota = await getQuotaSummaryForUser(session.user.id);

  const invoiceRows = await db
    .select()
    .from(factures)
    .where(eq(factures.cabinetId, session.profile.cabinetId))
    .orderBy(desc(factures.createdAt))
    .limit(10);

  const cycleLabel =
    sub?.subscription.cycle === "annuel" ? "Annuel" : "Mensuel";
  const prix = sub
    ? sub.subscription.cycle === "annuel"
      ? sub.plan.prixAnnuelFcfa
      : sub.plan.prixMensuelFcfa
    : 0;

  const showTrial =
    sub?.subscription.estEssai &&
    sub.subscription.dateFinEssai &&
    sub.subscription.dateFinEssai > new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {showTrial && sub.subscription.dateFinEssai && (
        <TrialBanner dateFinEssai={sub.subscription.dateFinEssai} />
      )}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/app">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Retour
        </Link>
      </Button>

      <header>
        <h1 className="font-heading text-2xl font-semibold text-brand-justice">
          Facturation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Abonnement, quotas IA et packs additionnels.
        </p>
      </header>

      <section className="rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-brand-gold" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-foreground">
              {sub ? sub.plan.nom : "Aucun abonnement actif"}
            </h2>
            {sub && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {sub.subscription.statut === "beta_gratuit"
                    ? "Programme beta — accès gratuit"
                    : `${formatFcfa(prix)} / ${cycleLabel.toLowerCase()}`}
                </p>
                {sub.subscription.dateFin && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Valide jusqu&apos;au{" "}
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "long",
                    }).format(sub.subscription.dateFin)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/billing/plans">Changer de plan</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/tarifs">Comparer toutes les offres</Link>
          </Button>
        </div>
      </section>

      {quota && (
        <section className="rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-brand-gold" aria-hidden />
            <h2 className="font-semibold">Quotas IA — ce mois</h2>
          </div>
          <div className="mt-4">
            <QuotaProgress
              consomme={quota.consomme}
              total={quota.quotaMensuel}
              label="Votre consommation"
            />
          </div>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            <li>
              Restant (mensuel) :{" "}
              <strong className="text-foreground">{quota.restantMensuel}</strong>
            </li>
            {quota.packRestant > 0 && (
              <li>
                Pack additionnel :{" "}
                <strong className="text-foreground">{quota.packRestant}</strong>{" "}
                requêtes
              </li>
            )}
            <li>
              Renouvellement le{" "}
              {formatPeriodeFinLabel(quota.periodeFin)} (fuseau Douala)
            </li>
            {quota.depassementGratuitUtilise && (
              <li className="text-brand-gold">
                Dépassement gratuit du mois déjà utilisé.
              </li>
            )}
          </ul>
        </section>
      )}

      {invoiceRows.length > 0 && (
        <section className="rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-brand-gold" aria-hidden />
            <h2 className="font-semibold">Factures</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {invoiceRows.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 last:border-0"
              >
                <span className="font-mono">{f.numero}</span>
                <span>{formatFcfa(f.montantTtcFcfa)}</span>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/api/billing/invoices/${f.id}/pdf`} target="_blank">
                    PDF
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-brand-gold" aria-hidden />
          <h2 className="font-semibold">Packs additionnels</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          100 requêtes IA supplémentaires — 5 000 FCFA, valables 30 jours.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/app/billing/packs">Acheter un pack</Link>
        </Button>
      </section>
    </div>
  );
}
