"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  BookOpen,
  Hash,
  Loader2,
  Quote,
  Search,
  SquareDashedBottom,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Recherche un article du corpus et l'insère dans l'éditeur :
 *   • soit comme citation inline (chip "Art. 134 AUDCG")
 *   • soit comme citation bloc (encart avec extrait verbatim)
 *
 * Réutilise /api/search (sémantique + bayésien) ; pour le bloc on
 * récupère le contenu complet via /api/chunks/[id].
 */
type SearchHit = {
  chunkId: string;
  articleNumber: string | null;
  articleLabel: string | null;
  snippet: string;
  source: { id: string; title: string; shortCode: string };
};

export function CitationInserter({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insertingId, setInsertingId] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (query.trim().length < 3) {
      setError("Saisissez au moins 3 caractères.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 8 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Erreur de recherche.");
        return;
      }
      setHits(Array.isArray(json.hits) ? json.hits : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const insertInline = useCallback(
    (hit: SearchHit) => {
      if (!editor || disabled) return;
      const label = formatLabel(hit);
      editor
        .chain()
        .focus()
        .setCitation({
          chunkId: hit.chunkId,
          sourceShortCode: hit.source.shortCode,
          articleNumber: hit.articleNumber,
          articleLabel: label,
        })
        // Sort de la marque (inclusive:false) puis ajoute un espace nu
        // pour que la frappe suivante soit du texte normal.
        .unsetMark("citation")
        .insertContent(" ")
        .run();
    },
    [editor, disabled]
  );

  const insertBlock = useCallback(
    async (hit: SearchHit) => {
      if (!editor || disabled) return;
      setInsertingId(hit.chunkId);
      try {
        const res = await fetch(`/api/chunks/${hit.chunkId}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error ?? "Impossible de récupérer l'article.");
          return;
        }
        const label = formatLabel(hit);
        const body = String(json.content ?? "");
        editor
          .chain()
          .focus()
          .insertCitationBlock(
            {
              chunkId: hit.chunkId,
              sourceShortCode: hit.source.shortCode,
              articleNumber: hit.articleNumber,
              articleLabel: label,
            },
            body
          )
          .run();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur réseau.");
      } finally {
        setInsertingId(null);
      }
    },
    [editor, disabled]
  );

  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden border-l border-brand-justice/10 bg-card/80 p-4 shadow-[inset_1px_0_0_rgba(0,0,0,0.02)] sm:p-5">
      <header className="space-y-1.5 border-b border-brand-justice/8 pb-3">
        <h2 className="flex items-center gap-2 font-heading text-[15px] font-semibold text-brand-ink">
          <BookOpen className="h-4 w-4 text-brand-justice" aria-hidden />
          Insérer un article
        </h2>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Recherchez un article du corpus OHADA puis insérez-le comme citation
          courte ou comme extrait verbatim.
        </p>
      </header>

      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex : prescription action en paiement"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading || disabled}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            "Chercher"
          )}
        </Button>
      </form>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      <div className="-mr-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
        {!loading && hits.length === 0 && !error && (
          <p className="rounded-md border border-dashed border-brand-justice/15 bg-card px-3 py-6 text-center text-[12px] text-muted-foreground">
            Aucun résultat pour le moment.
            <br />
            Lancez une recherche pour insérer une référence.
          </p>
        )}

        {hits.map((hit) => {
          const label = formatLabel(hit);
          const inserting = insertingId === hit.chunkId;
          return (
            <article
              key={hit.chunkId}
              className="space-y-2 rounded-lg border border-brand-justice/10 bg-brand-parchment/30 p-3 transition hover:border-brand-justice/20 hover:bg-card"
            >
              <header className="flex items-start gap-2">
                <Hash
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-justice"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {hit.source.title}
                  </p>
                </div>
              </header>
              <p className="line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
                {hit.snippet}
              </p>
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => insertInline(hit)}
                  disabled={disabled || inserting}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border border-brand-justice/15 px-2 py-1 text-[12px] font-medium text-foreground transition hover:bg-brand-parchment-dark/50",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                  title="Insérer comme citation inline"
                >
                  <Quote className="h-3.5 w-3.5" aria-hidden />
                  Inline
                </button>
                <button
                  type="button"
                  onClick={() => insertBlock(hit)}
                  disabled={disabled || inserting}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border border-brand-justice/30 bg-brand-justice/5 px-2 py-1 text-[12px] font-medium text-brand-justice transition hover:bg-brand-justice/10",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                  title="Insérer comme bloc verbatim"
                >
                  {inserting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <SquareDashedBottom className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Bloc
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function formatLabel(hit: SearchHit): string {
  const article =
    hit.articleLabel?.trim() ||
    (hit.articleNumber ? `Art. ${hit.articleNumber}` : "Article");
  // Si "Art. 134 AUDCG" est déjà complet on évite la double-mention.
  if (hit.source.shortCode && !article.includes(hit.source.shortCode)) {
    return `${article} ${hit.source.shortCode}`;
  }
  return article;
}
