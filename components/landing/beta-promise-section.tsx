import {
  ArrowRight,
  Check,
  MessageCircle,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { BetaPlacesProgress } from "@/components/billing/beta-places-progress";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";
import { BETA_MAX_PLACES } from "@/lib/billing/beta";

const BENEFITS: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
}[] = [
  {
    icon: Rocket,
    title: "12 mois gratuits",
    body: "Plan Individuel complet — recherche IA, dossiers et synthèses, sans carte bancaire.",
  },
  {
    icon: MessageCircle,
    title: "Ligne directe produit",
    body: "Vos retours et cas d'usage priorisent la feuille de route (CCJA, modèles, échéances).",
  },
  {
    icon: Users,
    title: "Cohorte limitée",
    body: "25 avocats pionniers sélectionnés pour co-construire l'outil avec l'équipe Adili.",
  },
];

type BetaPromiseSectionProps = {
  placesRestantes: number;
  placesUsed: number;
};

export function BetaPromiseSection({
  placesRestantes,
  placesUsed,
}: BetaPromiseSectionProps) {
  const complete = placesRestantes === 0;

  return (
    <section
      id="avocats-pionniers"
      className="scroll-mt-20 border-b border-brand-justice/10 bg-gradient-to-b from-brand-parchment-dark/50 via-brand-parchment to-brand-parchment py-16 sm:py-20"
      aria-labelledby="beta-promise-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-14">
          <Reveal direction="right">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
              <Sparkles className="h-3 w-3 text-brand-gold" aria-hidden />
              Phase bêta — accès gratuit
            </span>
            <h2
              id="beta-promise-heading"
              className="mt-5 font-heading text-3xl font-semibold leading-tight text-brand-ink sm:text-4xl"
            >
              Adili se construit avec les avocats et praticiens du droit
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Rejoignez le programme{" "}
              <strong className="font-medium text-brand-ink">Avocats pionniers</strong>
              : votre expertise affine le moteur de recherche, les synthèses et le
              module dossiers — en échange d&apos;un accès privilégié pendant la bêta.
            </p>

            <ul className="mt-8 space-y-4">
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold/15 ring-1 ring-brand-gold/25">
                    <Icon
                      className="h-4 w-4 text-brand-justice"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">{title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
              {[
                "Réponse sous 72 h ouvrées",
                "Sans engagement carte",
                "OHADA + droit camerounais",
              ].map((tag) => (
                <li key={tag} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-brand-sage" aria-hidden />
                  {tag}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal direction="left" delay={120}>
            <div className="rounded-2xl border border-brand-justice/12 bg-card p-6 shadow-md sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-justice/80">
                Programme Avocats pionniers
              </p>

              <BetaPlacesProgress
                used={placesUsed}
                maxPlaces={BETA_MAX_PLACES}
                className="mt-4 border-0 bg-brand-parchment-dark/30 p-4 shadow-none"
              />

              <div className="mt-6 flex flex-col gap-3">
                {complete ? (
                  <Button size="lg" className="w-full" disabled>
                    Programme complet
                  </Button>
                ) : (
                  <Button asChild size="lg" className="w-full shadow-md">
                    <Link href="/avocats-pionniers">
                      Candidater au programme
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full border-brand-justice/20"
                >
                  <Link href="/tarifs">Voir les offres payantes</Link>
                </Button>
              </div>

              {!complete && placesRestantes <= 5 ? (
                <p className="mt-4 text-center text-xs font-medium text-brand-gold">
                  Plus que {placesRestantes} place
                  {placesRestantes > 1 ? "s" : ""} — candidature recommandée
                </p>
              ) : null}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
