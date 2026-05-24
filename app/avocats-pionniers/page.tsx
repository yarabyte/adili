import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

import { BetaApplyForm } from "@/components/billing/beta-apply-form";
import { BetaPlacesProgress } from "@/components/billing/beta-places-progress";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { BETA_MAX_PLACES, countBetaPlacesUsed } from "@/lib/billing/beta";
import { getCorpusStatsCached } from "@/lib/corpus/stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Avocats pionniers · Adili",
  description: `Programme beta : 12 mois gratuits pour ${BETA_MAX_PLACES} avocats OHADA — recherche IA et dossiers.`,
};
export const dynamic = "force-dynamic";

const BENEFITS = [
  "Recherche sémantique sur le corpus OHADA indexé",
  "Synthèses IA sourcées avec citations vérifiables",
  "Module dossiers, documents et comptes rendus",
  "Ligne directe avec l'équipe produit pendant la bêta",
] as const;

export default async function AvocatsPionniersPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const isAuthed = Boolean(data.user);

  const [used, stats] = await Promise.all([
    countBetaPlacesUsed(),
    getCorpusStatsCached(),
  ]);
  const remaining = Math.max(0, BETA_MAX_PLACES - used);

  return (
    <div className="flex min-h-screen flex-col bg-brand-parchment">
      <SiteHeader isAuthed={isAuthed} homeHref="/" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/35 bg-brand-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
            <Sparkles className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
            Phase bêta · 12 mois gratuits
          </span>
          <h1 className="mt-5 font-heading text-3xl font-bold text-brand-justice sm:text-4xl">
            Avocats pionniers
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Rejoignez les premiers praticiens qui façonnent Adili. En contrepartie :
            accès gratuit au plan Individuel, retours produit prioritaires et
            visibilité sur les prochaines évolutions.
          </p>
        </div>

        <BetaPlacesProgress
          used={used}
          maxPlaces={BETA_MAX_PLACES}
          className="mt-10"
        />

        <section className="mt-8 rounded-xl border border-brand-justice/10 bg-brand-parchment-dark/25 p-6 sm:p-8">
          <h2 className="font-heading text-lg font-semibold text-brand-justice">
            Ce qui est inclus
          </h2>
          <ul className="mt-4 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold"
                  aria-hidden
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-muted-foreground">
            Parallèle aux{" "}
            <Link href="/tarifs" className="font-medium text-brand-justice underline">
              offres payantes
            </Link>{" "}
            — sans engagement carte bancaire pendant la période beta.
          </p>
        </section>

        <section className="mt-8 rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-heading text-lg font-semibold text-brand-justice">
            Candidater
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {remaining > 0
              ? "Réponse sous 72 h ouvrées. Un compte cabinet est requis après acceptation."
              : "Le quota de 25 places est atteint. Consultez les tarifs standards."}
          </p>
          <div className="mt-6">
            <BetaApplyForm
              placesRestantes={remaining}
              maxPlaces={BETA_MAX_PLACES}
            />
          </div>
        </section>
      </main>

      <SiteFooter stats={stats} homeHref="/" />
    </div>
  );
}
