import { asc, eq } from "drizzle-orm";
import Link from "next/link";

import { PricingCards } from "@/components/billing/pricing-cards";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { BETA_MAX_PLACES } from "@/lib/billing/beta";
import { getCorpusStatsCached } from "@/lib/corpus/stats";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Tarifs · Adili",
  description:
    "Offres Étudiant, Individuel, Cabinet et Grand Cabinet — quotas IA et modules.",
};
export const dynamic = "force-dynamic";

export default async function TarifsPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const isAuthed = Boolean(data.user);

  const [rows, stats] = await Promise.all([
    db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.ordreAffichage)),
    getCorpusStatsCached(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-brand-parchment">
      <SiteHeader isAuthed={isAuthed} homeHref="/" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-heading text-3xl font-bold text-brand-justice sm:text-4xl">
            Tarifs transparents
          </h1>
          <p className="mt-3 text-muted-foreground">
            Quotas IA mensuels par utilisateur, reset le 1<sup>er</sup> de chaque
            mois (Africa/Douala). Un dépassement gratuit par mois, puis packs
            additionnels.
          </p>
        </div>

        <div className="mt-12">
          <PricingCards plans={rows} isAuthed={isAuthed} />
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Programme{" "}
          <Link href="/avocats-pionniers" className="font-medium text-brand-justice underline">
            Avocats pionniers
          </Link>{" "}
          ({BETA_MAX_PLACES} places, 12 mois gratuits) — parallèle aux offres ci-dessus.
        </p>
      </main>

      <SiteFooter stats={stats} homeHref="/" />
    </div>
  );
}
