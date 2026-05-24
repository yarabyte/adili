"use client";

import {
  Loader2,
  Lock,
  Scale,
  Search,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CorpusExtract } from "@/components/search/corpus-extract";
import { ResultRating } from "@/components/search/result-rating";
import { SynthesisPanel } from "@/components/search/synthesis-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSynthesisStream } from "@/hooks/use-synthesis-stream";
import type { SearchHit } from "@/lib/search";
import { cn } from "@/lib/utils";

type Hit = SearchHit;

const CITED_HIGHLIGHT_MS = 1800;

type SearchClientProps = {
  isAuthed: boolean;
  defaultQuery?: string;
};

export function SearchClient({ isAuthed, defaultQuery = "" }: SearchClientProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSubmittedRef = useRef(false);

  // Pas d'appel synthèse pour les utilisateurs anonymes (le serveur refuserait de toute façon,
  // et on évite de spammer /api/search/synthesize).
  const synthesisHits = isAuthed ? hits ?? [] : [];
  const synthesis = useSynthesisStream(
    isAuthed ? submittedQuery : "",
    synthesisHits
  );

  const handleCite = useCallback((n: number) => {
    if (typeof window === "undefined") return;
    const target = document.getElementById(`chunk-${n}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("is-cited");
    void target.offsetWidth;
    target.classList.add("is-cited");
    window.setTimeout(() => {
      target.classList.remove("is-cited");
    }, CITED_HIGHLIGHT_MS);
  }, []);

  const runSearch = useCallback(async (raw: string) => {
    const q = raw.trim();
    setError(null);
    if (q.length < 3) {
      setError("Saisissez au moins 3 caractères.");
      return;
    }

    setHits(null);
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 5 }),
      });
      const json = (await res.json()) as { hits: Hit[] } | { error: string };
      if (!res.ok || "error" in json) {
        setError("error" in json ? json.error : `HTTP ${res.status}`);
        return;
      }
      setHits(json.hits);
      setSubmittedQuery(q);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await runSearch(query);
  }

  useEffect(() => {
    if (autoSubmittedRef.current) return;
    const seed = defaultQuery.trim();
    if (seed.length >= 3) {
      autoSubmittedRef.current = true;
      void runSearch(seed);
    }
  }, [defaultQuery, runSearch]);

  const hasHits = Boolean(hits && hits.length > 0);

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-brand-justice/12 bg-card/90 p-4 shadow-sm sm:p-5">
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex. conditions de validité de la convention d'arbitrage"
            aria-label="Requête de recherche"
            autoFocus
            className="h-12 min-h-12 flex-1 border-brand-justice/15 bg-background text-base shadow-inner"
          />
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="h-12 shrink-0 px-6 shadow-md sm:min-w-[10.5rem]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {loading ? "Recherche…" : "Rechercher"}
          </Button>
        </form>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Astuce : précisez un acte (AUDA, AUPC…), le code pénal camerounais
          (CP-CM) ou un thème pour affiner la recherche sémantique.
          {isAuthed
            ? " Une synthèse IA s'ajoute automatiquement au-dessus des extraits."
            : " La synthèse IA est réservée aux comptes connectés."}
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {hasHits && isAuthed && (
        <SynthesisPanel
          status={synthesis.status}
          text={synthesis.text}
          error={synthesis.error}
          errorCode={synthesis.errorCode}
          retryAfterMs={synthesis.retryAfterMs}
          remaining={synthesis.remaining}
          limit={synthesis.limit}
          monthlyRemaining={synthesis.monthlyRemaining}
          monthlyLimit={synthesis.monthlyLimit}
          onCite={handleCite}
          onRegenerate={synthesis.regenerate}
        />
      )}

      {hasHits && !isAuthed && <SynthesisLoginCta />}

      {hits && hits.length === 0 && (
        <div className="rounded-xl border border-dashed border-brand-justice/20 bg-muted/30 px-4 py-8 text-center">
          <Scale className="mx-auto h-8 w-8 text-brand-gold/80" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">
            Aucun passage pertinent trouvé
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reformulez la question ou élargissez les termes (synonymes, article
            visé).
          </p>
        </div>
      )}

      {hasHits && (
        <div>
          <p className="mb-4 text-sm font-medium text-brand-justice/90">
            {hits!.length} extrait{hits!.length > 1 ? "s" : ""} retenu
            {hits!.length > 1 ? "s" : ""}
            {isAuthed
              ? " — cliquez sur une citation [N] ci-dessus pour atteindre la source."
              : "."}
          </p>
          <ul className="space-y-6" aria-label="Résultats de recherche">
            {hits!.map((h, index) => (
              <li
                key={h.chunkId}
                id={`chunk-${index + 1}`}
                className="scroll-mt-24"
              >
                <SearchResultCard
                  hit={h}
                  rank={index + 1}
                  submittedQuery={submittedQuery}
                  isAuthed={isAuthed}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function resultKicker(hit: Hit): string {
  const title = hit.source.title.trim();
  const upper = title.toLocaleUpperCase("fr-FR");
  const code = hit.source.shortCode.toUpperCase();
  if (code === "CP-CM" || /cameroun/i.test(title)) {
    return `Cameroun · ${upper}`;
  }
  if (/^AU|^SYCEBNL/i.test(code)) {
    return `OHADA · ${upper}`;
  }
  return `Corpus · ${upper}`;
}

function resultTitle(hit: Hit): string {
  if (hit.articleLabel?.trim()) return hit.articleLabel.trim();
  const n = hit.articleNumber?.trim();
  if (n) return `Art. ${n} ${hit.source.shortCode}`;
  return hit.source.shortCode;
}

function CommunityStars({ mean }: { mean: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(mean)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5 sm:h-4 sm:w-4",
            n <= filled
              ? "fill-brand-gold text-brand-gold"
              : "text-brand-justice/20"
          )}
        />
      ))}
    </span>
  );
}

function SearchResultCard({
  hit,
  rank,
  submittedQuery,
  isAuthed,
}: {
  hit: Hit;
  rank: number;
  submittedQuery: string;
  isAuthed: boolean;
}) {
  const hasCommunity =
    hit.rating.count > 0 && hit.rating.mean != null && Number.isFinite(hit.rating.mean);

  return (
    <article className="group overflow-hidden rounded-2xl border border-brand-gold/20 bg-brand-parchment/50 shadow-sm transition-[box-shadow,border-color] hover:border-brand-gold/35 hover:shadow-md">
      <div className="flex min-h-0">
        <div
          className="w-1.5 shrink-0 bg-gradient-to-b from-brand-gold via-amber-700/90 to-brand-gold/70"
          aria-hidden
        />
        <div className="min-w-0 flex-1 px-5 py-5 sm:px-6 sm:py-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-brand-justice/10 px-1.5 text-[11px] font-bold tabular-nums text-brand-justice"
                  aria-label={`Résultat ${rank}`}
                >
                  {rank}
                </span>
                <span className="line-clamp-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-justice sm:text-[11px] sm:tracking-[0.14em]">
                  {resultKicker(hit)}
                </span>
              </p>
              <h2 className="mt-2 font-heading text-lg font-semibold leading-snug text-brand-justice sm:text-xl">
                {resultTitle(hit)}
              </h2>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <span
                className="inline-flex rounded-full border border-brand-gold/40 bg-brand-gold/15 px-3 py-1 text-xs font-semibold tabular-nums text-brand-ink"
                title="Pertinence estimée par similarité sémantique entre votre question et l'extrait."
              >
                Pertinence {hit.relevancePercent}&nbsp;%
              </span>
              <FeedbackBoostBadge rating={hit.rating} />
            </div>
          </header>

          <div className="mt-4 border-t border-brand-justice/10 pt-4">
            <CorpusExtract
              text={hit.snippet || ""}
              className="space-y-3 text-[13px] leading-[1.7] text-muted-foreground [text-wrap:pretty] sm:text-[14px]"
            />
          </div>

          <footer className="mt-5 border-t border-brand-justice/10 pt-4">
            {hasCommunity && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <CommunityStars mean={hit.rating.mean!} />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {hit.rating.mean!.toFixed(1)}/5 · {hit.rating.count} avis
                  <span className="sr-only"> praticiens</span>
                </span>
              </div>
            )}
            <ResultRating
              chunkId={hit.chunkId}
              query={submittedQuery}
              position={rank}
              relevancePercent={hit.relevancePercent}
              enabled={isAuthed}
              layout="footer"
            />
          </footer>
        </div>
      </div>
    </article>
  );
}

function FeedbackBoostBadge({ rating }: { rating: Hit["rating"] }) {
  if (rating.count === 0) return null;
  const pct = Math.round(rating.boost * 100);
  if (Math.abs(pct) < 5) {
    return (
      <span
        className="inline-flex items-center rounded-full border border-brand-justice/20 bg-brand-parchment px-2.5 py-1 text-[11px] font-medium tabular-nums text-brand-justice/85"
        title={`Avis des praticiens : ${rating.count} note${rating.count > 1 ? "s" : ""} · moyenne ${rating.mean?.toFixed(1)}/5. Impact mineur sur le classement.`}
      >
        {rating.count} avis
      </span>
    );
  }

  const positive = pct > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums",
        positive
          ? "border-brand-sage/45 bg-brand-sage/12 text-brand-sage"
          : "border-brand-crimson/40 bg-brand-crimson/10 text-brand-crimson"
      )}
      title={`Re-ranking bayésien : ${pct > 0 ? "+" : ""}${pct} %. ${rating.count} note${rating.count > 1 ? "s" : ""} · moyenne ${rating.mean?.toFixed(1)}/5 (lissée à ${rating.posterior?.toFixed(2)}/5).`}
    >
      {positive ? (
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
      )}
      {pct > 0 ? "+" : ""}
      {pct}&nbsp;%
    </span>
  );
}

function SynthesisLoginCta() {
  return (
    <section
      aria-label="Synthèse IA — connexion requise"
      className="flex flex-col gap-4 rounded-2xl border border-brand-justice/15 bg-gradient-to-br from-card via-card to-secondary/40 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold sm:text-lg">
            Synthèse IA sourcée
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Adili rédige une synthèse juridique à partir des extraits, avec
            citations cliquables. Connectez-vous pour en bénéficier (30
            synthèses / heure).
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button asChild size="sm" variant="outline" className="border-brand-justice/25">
          <Link href="/inscription">
            <Lock className="h-4 w-4" aria-hidden />
            Créer un compte
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/connexion">Se connecter</Link>
        </Button>
      </div>
    </section>
  );
}
