import Link from "next/link";

import {
  formatCorpusStatsLine,
  type CorpusStats,
} from "@/lib/corpus/stats";

type SiteFooterProps = {
  stats: CorpusStats;
  /** Préfixe pour les ancres landing (ex. `/` → `/#fonctionnalites`). */
  homeHref?: string;
};

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold-soft">
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-brand-parchment/75 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ stats, homeHref = "" }: SiteFooterProps) {
  const corpusLine = formatCorpusStatsLine(stats);
  const anchor = (hash: string) => (homeHref ? `${homeHref}${hash}` : hash);

  return (
    <footer className="border-t border-brand-ink/30 bg-brand-ink py-12 text-brand-parchment/85">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:px-6">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2">
            <span className="font-heading text-2xl font-bold tracking-wide text-white">
              Adili<span className="text-brand-gold-soft">.</span>
            </span>
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-brand-parchment/65">
            Le copilote juridique des avocats et praticiens du droit OHADA.
            Recherche sourcée, synthèse IA, module dossiers & pièces, feedback
            praticien.
          </p>
          <p className="text-sm font-medium tabular-nums text-brand-gold-soft">
            Corpus — {corpusLine}
          </p>
        </div>
        <FooterColumn
          title="Produit"
          links={[
            { href: "/recherche", label: "Recherche corpus" },
            { href: anchor("#dossiers"), label: "Dossiers & affaires" },
            { href: "/tarifs", label: "Tarifs" },
            { href: "/tarifs", label: "Créer un compte" },
            { href: "/connexion", label: "Connexion" },
            { href: "/app", label: "Mon espace" },
          ]}
        />
        <FooterColumn
          title="Ressources"
          links={[
            { href: anchor("#fonctionnalites"), label: "Fonctionnalités" },
            { href: anchor("#dossiers"), label: "Module dossiers" },
            { href: anchor("#comment-ca-marche"), label: "Comment ça marche" },
            { href: anchor("#corpus"), label: "Corpus indexé" },
            { href: anchor("#a-propos"), label: "À propos" },
            { href: "/avocats-pionniers", label: "Avocats pionniers" },
          ]}
        />
        <FooterColumn
          title="Légal"
          links={[
            { href: "/conditions", label: "Conditions d'utilisation" },
            { href: "/confidentialite", label: "Politique de confidentialité" },
          ]}
        />
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-white/10 px-4 pt-6 text-xs text-brand-parchment/60 sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} Adili — Tous droits réservés</p>
        <p className="tabular-nums">
          {corpusLine} · Données chiffrées · Hébergement africain
        </p>
      </div>
    </footer>
  );
}
