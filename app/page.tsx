import {
  ArrowRight,
  BookOpenCheck,
  Briefcase,
  CheckCircle2,
  FileSearch,
  Gauge,
  Search,
  Library,
  Quote,
  Scale,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { BetaPromiseSection } from "@/components/landing/beta-promise-section";
import { CameroonCorpusRoadmap } from "@/components/landing/cameroon-corpus-roadmap";
import { HeroProductMockup } from "@/components/landing/hero-product-mockup";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";
import { CAMEROON_CORPUS_AVAILABLE } from "@/lib/corpus/cameroon-roadmap";
import {
  formatCorpusStatsLine,
  getCorpusBreakdownCached,
  type CorpusStats,
} from "@/lib/corpus/stats";
import {
  BETA_MAX_PLACES,
  countBetaPlacesUsedCached,
} from "@/lib/billing/beta";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createSupabaseServerClient();
  const [{ data }, corpus, betaUsed] = await Promise.all([
    supabase.auth.getUser(),
    getCorpusBreakdownCached(),
    countBetaPlacesUsedCached(),
  ]);
  const isAuthed = Boolean(data.user);
  const betaRemaining = Math.max(0, BETA_MAX_PLACES - betaUsed);

  return (
    <div className="flex min-h-screen flex-col bg-brand-parchment text-foreground">
      <SiteHeader isAuthed={isAuthed} />

      <main className="flex-1">
        <Hero isAuthed={isAuthed} />
        <TrustStrip corpus={corpus} />
        <CameroonCorpusRoadmap cameroonStats={corpus.cameroon} />
        <DossiersSection isAuthed={isAuthed} />
        <Features />
        <ProductDemo />
        <HowItWorks />
        <AboutSection />
        <BetaPromiseSection
          placesRestantes={betaRemaining}
          placesUsed={betaUsed}
        />
        <FinalCta isAuthed={isAuthed} />
      </main>

      <SiteFooter stats={corpus.total} />
    </div>
  );
}

/* ──────────────────────────  HERO  ─────────────────────────── */

function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-brand-justice/10">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-parchment via-brand-parchment to-brand-parchment-dark/40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 top-10 h-72 w-72 rounded-full bg-brand-gold/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-brand-justice/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="adili-fade-up max-w-2xl [animation-delay:60ms]">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
              <Sparkles className="h-3 w-3 text-brand-gold" aria-hidden />
              Copilote OHADA & droit camerounais · Beta privée
            </span>

            <h1 className="mt-6 font-heading text-5xl font-semibold leading-[1.05] text-brand-ink sm:text-6xl">
              La recherche juridique{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10">sourcée</span>
                <span
                  className="absolute -bottom-1 left-0 right-0 h-2 rounded-full bg-brand-gold/30"
                  aria-hidden
                />
              </span>
              ,
              <br />
              pour les avocats et praticiens du droit OHADA.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/75">
              Le copilote des{" "}
              <strong className="font-semibold text-brand-ink">
                avocats et praticiens du droit OHADA
              </strong>
              {" "}: il comprend vos questions en langage naturel et rédige des
              synthèses{" "}
              <strong className="font-semibold text-brand-ink">
                avec citations vérifiables
              </strong>
              , affinées par le retour de vos confrères.
            </p>
          </div>

          <div className="adili-fade-up relative flex flex-col gap-6 [animation-delay:220ms]">
            <HeroProductMockup />
            <div className="flex w-full flex-wrap items-center justify-end gap-3">
              <Button asChild size="lg" className="shadow-md">
                <Link href={isAuthed ? "/app" : "/inscription"}>
                  {isAuthed ? "Ouvrir mon espace" : "Rejoindre la bêta"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-brand-justice/25 bg-card/80 hover:bg-card"
              >
                <Link href="/recherche">
                  Tester la recherche
                  <Search className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────  TRUST STRIP  ─────────────────────── */

function TrustStrip({
  corpus,
}: {
  corpus: { ohada: CorpusStats; cameroon: CorpusStats; total: CorpusStats };
}) {
  const cameroonLive = corpus.cameroon.sources > 0;
  const cameroonHighlight = cameroonLive
    ? formatCorpusStatsLine(corpus.cameroon)
    : `${CAMEROON_CORPUS_AVAILABLE.length} codes · indexation en cours`;

  return (
    <section
      id="corpus"
      className="scroll-mt-20 border-b border-brand-justice/10 bg-gradient-to-b from-brand-parchment-dark/50 to-brand-parchment/80 py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
              Corpus juridique
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-brand-ink sm:text-3xl">
              Les sources qui alimentent votre recherche
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Adili s&apos;appuie sur des textes officiels et des jurisprudences
              ciblées pour que les avocats et praticiens du droit travaillent
              sur une base fiable, sans quitter leur fil de pensée.
            </p>
          </div>
        </Reveal>

        <ul className="mt-10 grid gap-6 sm:grid-cols-3 sm:gap-8">
          <TrustItem
            delay={0}
            icon={Scale}
            title="Actes uniformes OHADA"
            highlight={formatCorpusStatsLine(corpus.ohada)}
            description="AUA, AUDCG, AUSCGIE, SYCEBNL… les versions indexées des actes uniformes OHADA (1997–2023), prêtes pour la recherche sémantique et la synthèse sourcée."
            variant="live"
          />
          <TrustItem
            delay={120}
            icon={Library}
            title="Droit camerounais"
            highlight={cameroonHighlight}
            description="Code pénal, procédure pénale et procédure civile déjà intégrés ; constitution, code civil, travail, fiscalité et autres textes prévus d'ici le 30 juin 2026."
            variant={cameroonLive ? "live" : "beta"}
          />
          <TrustItem
            delay={240}
            icon={BookOpenCheck}
            title="Jurisprudence CCJA"
            highlight="Période 2010 – 2025 · intégration progressive"
            description="Arrêts et motifs pour croiser le texte uniforme avec la jurisprudence commune — idéal pour les conclusions et les mémoires."
            variant="beta"
          />
        </ul>
      </div>
    </section>
  );
}

type TrustVariant = "live" | "beta" | "soon";

function TrustItem({
  icon: Icon,
  title,
  highlight,
  description,
  variant,
  delay = 0,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  highlight: string;
  description: string;
  variant: TrustVariant;
  delay?: number;
}) {
  const badge =
    variant === "live"
      ? { label: "Disponible", className: "bg-brand-sage/15 text-brand-sage border-brand-sage/30" }
      : variant === "beta"
        ? {
            label: "En cours",
            className: "bg-brand-gold/15 text-brand-ink border-brand-gold/40",
          }
        : {
            label: "À venir",
            className: "bg-brand-justice/10 text-brand-justice border-brand-justice/20",
          };

  return (
    <Reveal
      as="li"
      delay={delay}
      className="group flex h-full flex-col rounded-2xl border border-brand-justice/12 bg-card p-6 shadow-sm transition-shadow duration-200 hover:border-brand-gold/25 hover:shadow-md sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-gold/25 to-brand-gold/5 ring-1 ring-brand-gold/30 transition-transform duration-200 group-hover:scale-[1.03]"
          aria-hidden
        >
          <Icon className="h-8 w-8 text-brand-justice" strokeWidth={1.75} />
        </div>
        <span
          className={
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
            badge.className
          }
        >
          {badge.label}
        </span>
      </div>

      <h3 className="mt-5 font-heading text-xl font-semibold leading-snug text-brand-ink">
        {title}
      </h3>
      <p className="mt-2 text-sm font-medium tabular-nums text-brand-justice/90">
        {highlight}
      </p>
      <p className="mt-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Reveal>
  );
}

/* ─────────────────────  MODULE DOSSIERS  ──────────────────── */

function DossiersSection({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section
      id="dossiers"
      className="scroll-mt-20 border-b border-brand-justice/10 bg-gradient-to-b from-brand-justice/[0.06] via-brand-parchment to-brand-parchment py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14">
          <Reveal>
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/85">
                Production juridique
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight text-brand-ink sm:text-4xl">
                Pilotez vos dossiers et vos pièces dans Adili
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Au-delà de la recherche corpus : créez des{" "}
                <strong className="font-medium text-brand-ink">affaires</strong>{" "}
                par cabinet, rattachez clients et adversaires, rédigez des
                conclusions et actes dans un{" "}
                <strong className="font-medium text-brand-ink">
                  éditeur avec citations OHADA
                </strong>
                , export PDF et circuit de validation interne.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Références d’affaire, rôles (responsable, contributeur, lecteur) et affaires sensibles.",
                  "Insertion d’articles du corpus directement dans les pièces.",
                  "Verrou d’édition, historique et traçabilité pour travailler sereinement en équipe.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-justice"
                      aria-hidden
                    />
                    <span className="text-sm leading-relaxed text-foreground/85">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button asChild size="lg" className="shadow-md">
                  <Link href={isAuthed ? "/app" : "/inscription"}>
                    {isAuthed ? "Ouvrir mon espace" : "Rejoindre la bêta"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
              {!isAuthed && (
                <p className="mt-4 text-[13px] text-muted-foreground">
                  Déjà inscrit ?{" "}
                  <Link
                    href="/connexion"
                    className="font-medium text-brand-justice underline-offset-4 hover:underline"
                  >
                    Connexion
                  </Link>
                </p>
              )}
            </div>
          </Reveal>

          <Reveal direction="left" delay={100}>
            <div className="relative overflow-hidden rounded-2xl border border-brand-justice/15 bg-card p-5 shadow-lg sm:p-6">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand-gold/15 blur-2xl"
                aria-hidden
              />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2 border-b border-brand-justice/10 pb-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-justice/10 text-brand-justice">
                    <Briefcase className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Aperçu module
                    </p>
                    <p className="truncate font-mono text-sm font-semibold text-brand-ink">
                      2026-001 · Client c/ Banque
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                    Ouvert
                  </span>
                </div>
                <div className="rounded-lg border border-brand-justice/10 bg-brand-parchment-dark/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-justice/80">
                    Pièce en cours
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-brand-ink">
                    Conclusions — citation Art. 132 AUPC
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Conformément aux dispositions susvisées, il est demandé au
                    tribunal…
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span className="rounded-md border border-brand-justice/15 bg-background px-2 py-1">
                    Membres
                  </span>
                  <span className="rounded-md border border-brand-justice/15 bg-background px-2 py-1">
                    Échéances
                  </span>
                  <span className="rounded-md border border-brand-justice/15 bg-background px-2 py-1">
                    Historique
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────  FEATURES  ────────────────────────── */

const FEATURES: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
}[] = [
  {
    icon: FileSearch,
    title: "Recherche sémantique en langage naturel",
    body: "Posez une question comme à un confrère. Notre moteur sémantique spécialisé en droit retrouve les articles applicables même quand votre formulation diffère du texte officiel.",
  },
  {
    icon: Briefcase,
    title: "Dossiers, clients et pièces au sein du cabinet",
    body: "Créez des affaires contentieuses, rattachez vos clients et adversaires, rédigez les actes dans un éditeur riche avec citations OHADA intégrées, workflow de validation et export PDF.",
  },
  {
    icon: Sparkles,
    title: "Synthèse IA avec citations cliquables",
    body: "Adili rédige une synthèse juridique en français, chaque affirmation renvoyant à un extrait précis. Vous ouvrez la source en un clic et vérifiez sans quitter la page.",
  },
  {
    icon: Quote,
    title: "Aucune hallucination — l'IA cite, ne paraphrase pas",
    body: "Le prompt système verrouille la synthèse sur les seuls extraits remontés. Pas d'invention de jurisprudence, pas de référence approximative.",
  },
  {
    icon: ThumbsUp,
    title: "Re-ranking par feedback praticien",
    body: "Notez chaque extrait de 1 à 5. Un modèle bayésien combine vos retours à la similarité cosinus pour que les bons articles remontent — automatiquement et de manière transparente.",
  },
  {
    icon: Users,
    title: "Espace cabinet partagé",
    body: "Invitez collaborateurs, admins, juristes. Chaque cabinet conserve ses recherches, ses notes et son historique. Les rôles sont gérés finement (admin, avocat, collaborateur).",
  },
];

function Features() {
  return (
    <section
      id="fonctionnalites"
      className="scroll-mt-20 border-b border-brand-justice/10 py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
              Pour les avocats et praticiens du droit
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold leading-tight text-brand-ink sm:text-5xl">
              La rigueur du droit, augmentée — pas remplacée.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Adili est pensé pour les avocats et praticiens du droit qui
              n&apos;ont pas le droit de se tromper. Chaque fonctionnalité est
              conçue pour préserver votre jugement, accélérer les tâches
              mécaniques et tracer chaque conclusion à sa source.
            </p>
          </div>
        </Reveal>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Reveal
              key={title}
              as="li"
              delay={(i % 3) * 100}
              className="group rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-gold/35 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gold/10 text-brand-gold ring-1 ring-brand-gold/25">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-xl font-semibold text-brand-ink">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                {body}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─────────────────────  PRODUCT DEMO TEXT  ──────────────── */

function ProductDemo() {
  return (
    <section className="border-b border-brand-justice/10 bg-brand-parchment-dark/40 py-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <Reveal direction="right" className="space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
            Entraîné par les avocats et praticiens du droit
          </p>
          <h2 className="font-heading text-4xl font-semibold leading-tight text-brand-ink sm:text-5xl">
            Le moteur s&apos;améliore à chaque consultation.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            La similarité cosinus suffit pour démarrer, mais elle ne sait pas
            distinguer un extrait <em>pertinent en théorie</em> d&apos;un
            extrait <em>réellement utilisable</em> dans un dossier. C&apos;est
            là que la note des avocats et praticiens du droit fait la
            différence.
          </p>
          <ul className="space-y-3">
            {[
              "Chaque avocat ou praticien du droit note l'extrait consulté de 1 à 5.",
              "Un modèle bayésien lisse les notes avec un prior neutre (3/5, K=5).",
              "Le multiplicateur de score reste borné à ±20 % — pas de dérive.",
              "Le badge sur la carte indique l'impact exact du feedback praticien.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage"
                  aria-hidden
                />
                <span className="text-sm leading-relaxed text-foreground/85">
                  {line}
                </span>
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Button asChild variant="outline" className="border-brand-justice/25">
              <Link href="/recherche">
                <FileSearch className="h-4 w-4" aria-hidden />
                Tester sur une vraie question
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal direction="left" className="space-y-3">
          <DemoBadge
            tone="positive"
            value="+12 %"
            title="Art. 3 AUA · Convention d'arbitrage"
            sub="9 avis · moyenne 4.3/5 (lissée à 4.0)"
          />
          <DemoBadge
            tone="neutral"
            value="3 avis"
            title="Art. 1-3 AUS · Dispositions générales"
            sub="moyenne 3.1/5 — pas d'impact significatif"
          />
          <DemoBadge
            tone="negative"
            value="-8 %"
            title="Art. 134-138 AUDCG · Vendeur professionnel"
            sub="4 avis · moyenne 2.0/5 (lissée à 2.4)"
          />
          <p className="pt-2 text-[12px] italic text-muted-foreground">
            « Promu » ou « pénalisé » : chaque badge est cliquable et
            explique le calcul. La confiance passe par la transparence.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function DemoBadge({
  tone,
  value,
  title,
  sub,
}: {
  tone: "positive" | "neutral" | "negative";
  value: string;
  title: string;
  sub: string;
}) {
  const palette = {
    positive: {
      icon: ThumbsUp,
      cls: "border-brand-sage/40 bg-brand-sage/10 text-brand-sage",
    },
    neutral: {
      icon: Gauge,
      cls: "border-brand-justice/25 bg-brand-justice/[0.06] text-brand-justice/80",
    },
    negative: {
      icon: ThumbsUp,
      cls: "border-brand-crimson/40 bg-brand-crimson/10 text-brand-crimson",
    },
  }[tone];

  const Icon = palette.icon;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-justice/10 bg-card p-3 shadow-sm">
      <span
        className={
          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums " +
          palette.cls
        }
      >
        <Icon
          className={"h-3 w-3 " + (tone === "negative" ? "rotate-180" : "")}
          aria-hidden
        />
        {value}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-brand-ink">
          {title}
        </p>
        <p className="truncate text-[11.5px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/* ─────────────────────  HOW IT WORKS  ───────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Posez votre question",
    body: "Comme un avocat ou un praticien du droit s'adresserait à un confrère : en langage naturel ou avec des références précises (AUA, AUDCG, CCJA…). Adili comprend les deux.",
  },
  {
    n: "02",
    title: "Adili remonte les extraits",
    body: "Recherche vectorielle dans 1 600+ articles indexés, déduplication, re-ranking par feedback des avocats et praticiens du droit qui vous précèdent.",
  },
  {
    n: "03",
    title: "Obtenez la synthèse sourcée",
    body: "Une réponse rédigée en français juridique, avec citations [1] [2] cliquables — toujours rattachées au texte qu'un magistrat acceptera.",
  },
  {
    n: "04",
    title: "Rédigez dans vos dossiers cabinet",
    body: "Créez des affaires, pilotez membres et confidentialité, puis produisez vos pièces dans l’éditeur avec insertions corpus, workflow de validation et impression PDF.",
  },
];

function HowItWorks() {
  return (
    <section
      id="comment-ca-marche"
      className="scroll-mt-20 border-b border-brand-justice/10 py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
              Comment ça marche
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold leading-tight text-brand-ink sm:text-5xl">
              De la question au dossier, en quatre étapes.
            </h2>
          </div>
        </Reveal>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal
              key={s.n}
              as="li"
              delay={i * 120}
              className="relative rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <span
                className="font-heading text-5xl font-semibold leading-none text-brand-gold/30"
                aria-hidden
              >
                {s.n}
              </span>
              <h3 className="mt-3 font-heading text-xl font-semibold text-brand-ink">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                {s.body}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─────────────────────  À PROPOS  ───────────────────────── */

const ABOUT_VALUES: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
}[] = [
  {
    icon: ShieldCheck,
    title: "Souveraineté & confidentialité",
    body: "Vos dossiers ne servent jamais à entraîner de modèles tiers. Hébergement africain, cloisonnement strict par cabinet, données chiffrées.",
  },
  {
    icon: Scale,
    title: "Spécialisation OHADA",
    body: "Adili n'est pas un assistant IA généraliste : il est entraîné et indexé sur les actes uniformes, la jurisprudence CCJA et les textes nationaux (dont le droit camerounais), pour les avocats et praticiens du droit OHADA.",
  },
  {
    icon: ThumbsUp,
    title: "Co-construit avec les praticiens",
    body: "Chaque note, chaque retour ajuste le moteur de pertinence. La feuille de route est ouverte aux cabinets utilisateurs en bêta.",
  },
];

function AboutSection() {
  return (
    <section
      id="a-propos"
      className="scroll-mt-20 border-b border-brand-justice/10 py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-16">
          <Reveal direction="right" className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
              À propos d&apos;Adili
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold leading-tight text-brand-ink sm:text-5xl">
              Un copilote juridique pensé{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10">depuis l&apos;Afrique</span>
                <span
                  className="absolute -bottom-1 left-0 right-0 h-2 rounded-full bg-brand-gold/30"
                  aria-hidden
                />
              </span>
              , pour le droit OHADA.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Adili est né d&apos;un constat simple&nbsp;: les outils d&apos;IA
              juridique conçus en Europe ou en Amérique du Nord ignorent
              l&apos;essentiel du droit applicable dans les 17 États membres de
              l&apos;OHADA. Les avocats et praticiens du droit OHADA méritent
              un assistant qui parle leur droit&nbsp;— pas une traduction
              approximative.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Nous bâtissons Adili avec des avocats inscrits, des juristes
              d&apos;entreprise et des magistrats qui éprouvent l&apos;outil au
              quotidien. Chaque fonctionnalité est validée par leur retour
              avant d&apos;être déployée.
            </p>
          </Reveal>

          <ul className="space-y-4">
            {ABOUT_VALUES.map(({ icon: Icon, title, body }, i) => (
              <Reveal
                key={title}
                as="li"
                delay={i * 110}
                direction="left"
                className="group flex gap-4 rounded-2xl border border-brand-justice/12 bg-card p-5 shadow-sm transition-all duration-200 hover:border-brand-gold/30 hover:shadow-md sm:p-6"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-gold/25 to-brand-gold/5 ring-1 ring-brand-gold/30">
                  <Icon
                    className="h-5 w-5 text-brand-justice"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading text-lg font-semibold text-brand-ink">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/75">
                    {body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────  FINAL CTA  ──────────────────────── */

function FinalCta({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="py-20 sm:py-24">
      <Reveal className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-ink via-brand-justice to-brand-ink p-8 text-white shadow-2xl ring-1 ring-white/5 sm:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gold/25 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-brand-justice/50 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="max-w-2xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold-soft">
                Rejoindre la bêta
              </p>
              <h2 className="font-heading text-3xl font-semibold leading-[1.12] text-white sm:text-4xl">
                Essayez Adili sur votre prochain dossier
              </h2>
              <p className="text-base leading-relaxed text-white/85 sm:text-[15px]">
                Comme tout avocat ou praticien du droit en zone OHADA — création
                de compte en 30&nbsp;secondes, sans carte bancaire. Corpus OHADA
                et textes camerounais disponibles dès l&apos;inscription.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-3 sm:min-w-[220px] lg:items-end">
              <Button
                asChild
                size="lg"
                className="h-12 w-full bg-brand-gold px-8 text-base font-semibold text-brand-ink shadow-lg hover:bg-brand-gold-soft sm:w-auto lg:min-w-[15rem]"
              >
                <Link href={isAuthed ? "/app" : "/inscription"}>
                  {isAuthed ? "Ouvrir mon espace" : "Créer mon compte"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              {!isAuthed && (
                <p className="text-center text-[13px] text-white/65 lg:text-right">
                  Déjà inscrit ?{" "}
                  <Link
                    href="/connexion"
                    className="font-medium text-brand-gold-soft underline-offset-4 hover:text-brand-gold hover:underline"
                  >
                    Connexion
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

