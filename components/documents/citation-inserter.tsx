"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  ExternalLink,
  Landmark,
  Loader2,
  Quote,
  Scale,
  ScrollText,
  Search,
  Sparkles,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CorpusExtract } from "@/components/search/corpus-extract";
import { Button } from "@/components/ui/button";
import { LABELS_DOCUMENTS } from "@/lib/constants/types-documents";
import type { SearchHit } from "@/lib/search";
import { tokenizeQuery } from "@/lib/search-text";
import { cn } from "@/lib/utils";

type CorpusFilter = "all" | "acte_uniforme" | "ccja" | "national";

type Hit = SearchHit;

const FILTERS: { id: CorpusFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "acte_uniforme", label: "Actes Uniformes" },
  { id: "ccja", label: "CCJA" },
  { id: "national", label: "Droits nationaux" },
];

const DEFAULT_SUGGESTIONS = [
  "Vérifier toutes les références citées dans le document",
  "Rechercher jurisprudence similaire sur le fondement invoqué",
  "Comparer avec les dispositions générales OHADA applicables",
];

const SUGGESTIONS_BY_DOC_TYPE: Record<string, string[]> = {
  conclusions_fond: [
    "Générer les demandes reconventionnelles (dommages-intérêts)",
    "Rechercher jurisprudence similaire : banques Afrique centrale",
    "Vérifier toutes les références citées dans le document",
  ],
  memoire_defense: [
    "Identifier les moyens de défense sur la prescription",
    "Rechercher arrêts CCJA sur la même qualification",
    "Vérifier les références d'actes uniformes invoqués",
  ],
  plainte_simple: [
    "Vérifier les éléments constitutifs de l'infraction",
    "Rechercher textes nationaux applicables (CP-CM)",
    "Contrôler la compétence et la juridiction",
  ],
};

function inferSourceType(hit: Hit): Hit["source"]["type"] {
  const code = hit.source.shortCode.toUpperCase();
  if (hit.source.type) return hit.source.type;
  if (code.includes("CCJA") || /jurisprudence/i.test(hit.source.title)) {
    return "ccja";
  }
  if (code.endsWith("-CM")) return "national";
  return "acte_uniforme";
}

function sourceCategoryLabel(hit: Hit): string {
  const type = inferSourceType(hit);
  const title = hit.source.title.toUpperCase();
  if (type === "ccja") return "CCJA — JURISPRUDENCE";
  if (type === "national") return `DROIT NATIONAL — ${title}`;
  return `OHADA — ${title}`;
}

function cardTitle(hit: Hit): string {
  const article =
    hit.articleLabel?.trim() ||
    (hit.articleNumber ? `Articles ${hit.articleNumber}` : "Article");
  if (/^articles?\s/i.test(article) || /^art\./i.test(article)) {
    return article.charAt(0).toUpperCase() + article.slice(1);
  }
  return hit.articleNumber
    ? `Articles ${hit.articleNumber} — ${article}`
    : article;
}

function metadataLine(hit: Hit): string {
  const code = hit.source.shortCode;
  const parts = [code, "corpus indexé"];
  if (hit.relevancePercent >= 50) {
    parts.push(`${hit.relevancePercent} % pertinence`);
  }
  return parts.filter(Boolean).join(" · ");
}

function formatLabel(hit: Hit): string {
  const article =
    hit.articleLabel?.trim() ||
    (hit.articleNumber ? `Art. ${hit.articleNumber}` : "Article");
  if (hit.source.shortCode && !article.includes(hit.source.shortCode)) {
    return `${article} ${hit.source.shortCode}`;
  }
  return article;
}

function highlightSnippet(snippet: string, query: string): React.ReactNode {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return snippet;

  const pattern = new RegExp(
    `(${terms
      .sort((a, b) => b.length - a.length)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`,
    "gi"
  );
  const parts = snippet.split(pattern);
  const termSet = new Set(terms.map((t) => t.toLowerCase()));
  return parts.map((part, i) => {
    const norm = part
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    const isHit = termSet.has(norm);
    return isHit ? (
      <mark
        key={i}
        className="rounded-sm bg-amber-200/80 px-0.5 text-foreground"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function SourceIcon({ type }: { type: Hit["source"]["type"] }) {
  const className = "h-4 w-4";
  if (type === "ccja") return <Scale className={className} aria-hidden />;
  if (type === "national") return <Landmark className={className} aria-hidden />;
  return <ScrollText className={className} aria-hidden />;
}

function cardStyles(type: Hit["source"]["type"]) {
  switch (type) {
    case "ccja":
      return {
        border: "border-rose-400/45",
        iconWrap: "bg-rose-500/10 text-rose-700",
        sourceText: "text-rose-700",
      };
    case "national":
      return {
        border: "border-emerald-500/40",
        iconWrap: "bg-emerald-500/10 text-emerald-800",
        sourceText: "text-emerald-800",
      };
    default:
      return {
        border: "border-amber-400/50",
        iconWrap: "bg-amber-500/10 text-amber-800",
        sourceText: "text-brand-justice",
      };
  }
}

export function CitationInserter({
  editor,
  disabled,
  affaireReference,
  affaireTitre,
  documentTitre,
  documentType,
}: {
  editor: Editor | null;
  disabled: boolean;
  affaireReference: string;
  affaireTitre: string;
  documentTitre: string;
  documentType: string;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [filter, setFilter] = useState<CorpusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [previewHit, setPreviewHit] = useState<Hit | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const docTypeLabel =
    LABELS_DOCUMENTS[documentType as keyof typeof LABELS_DOCUMENTS] ??
    documentType;

  const suggestions = useMemo(
    () => SUGGESTIONS_BY_DOC_TYPE[documentType] ?? DEFAULT_SUGGESTIONS,
    [documentType]
  );

  useEffect(() => {
    const t = setTimeout(() => setAnalyzing(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const search = useCallback(async (raw?: string) => {
    const q = (raw ?? query).trim();
    if (q.length < 3) {
      setError("Saisissez au moins 3 caractères.");
      return;
    }
    setQuery(q);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 12 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Erreur de recherche.");
        return;
      }
      setHits(Array.isArray(json.hits) ? json.hits : []);
      setSubmittedQuery(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const filteredHits = useMemo(() => {
    if (filter === "all") return hits;
    return hits.filter((h) => inferSourceType(h) === filter);
  }, [hits, filter]);

  const insertReference = useCallback(
    (hit: Hit) => {
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
        .unsetMark("citation")
        .insertContent(" ")
        .run();
    },
    [editor, disabled]
  );

  const insertBlock = useCallback(
    async (hit: Hit) => {
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

  const openPreview = useCallback(async (hit: Hit) => {
    setPreviewHit(hit);
    setPreviewContent(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/chunks/${hit.chunkId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Texte indisponible.");
        setPreviewHit(null);
        return;
      }
      setPreviewContent(String(json.content ?? ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
      setPreviewHit(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col overflow-hidden border-l border-brand-justice/10 bg-[#f7f4ef]">
        <div className="flex-shrink-0 space-y-3 border-b border-brand-justice/10 bg-[#f7f4ef] p-4">
          <p className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            {analyzing ? (
              <>
                <span className="inline-flex gap-0.5" aria-hidden>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-justice [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-justice [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-justice [animation-delay:300ms]" />
                </span>
                Adili analyse le contexte du dossier…
              </>
            ) : (
              <span className="line-clamp-2">
                <span className="font-medium text-brand-justice">
                  {affaireReference}
                </span>
                {" — "}
                {documentTitre}
              </span>
            )}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <div className="flex items-center gap-2 rounded-lg border border-brand-justice/15 bg-white px-3 py-2 shadow-sm">
              <Search
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="compensation unilatérale crédit commercial OH…"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
                aria-label="Rechercher dans le corpus"
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || query.trim().length < 3}
                className="h-7 shrink-0 px-2.5 text-[11px] font-semibold"
                aria-label={loading ? "Recherche en cours" : "Envoyer la recherche"}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  "Envoyer"
                )}
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                  filter === f.id
                    ? "bg-brand-justice text-white shadow-sm"
                    : "bg-white/80 text-muted-foreground hover:bg-white"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {error && (
            <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[12px] text-destructive">
              {error}
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Recherche en cours…
            </div>
          )}

          {!loading && hits.length > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between px-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  Résultats pertinents
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-justice">
                  {filteredHits.length} source
                  {filteredHits.length > 1 ? "s" : ""}
                </span>
              </div>

              <ul className="space-y-3">
                {filteredHits.map((hit) => {
                  const type = inferSourceType(hit);
                  const styles = cardStyles(type);
                  const inserting = insertingId === hit.chunkId;
                  return (
                    <li key={hit.chunkId}>
                      <article
                        className={cn(
                          "overflow-hidden rounded-lg border-2 bg-white shadow-sm",
                          styles.border
                        )}
                      >
                        <div className="p-3">
                          <div className="flex gap-2.5">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                                styles.iconWrap
                              )}
                            >
                              <SourceIcon type={type} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "text-[10px] font-semibold uppercase tracking-wide",
                                  styles.sourceText
                                )}
                              >
                                {sourceCategoryLabel(hit)}
                              </p>
                              <h3 className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">
                                {cardTitle(hit)}
                              </h3>
                              <p className="mt-1 text-[10.5px] text-muted-foreground">
                                {metadataLine(hit)}
                              </p>
                            </div>
                          </div>

                          <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
                            {highlightSnippet(
                              hit.snippet,
                              submittedQuery || query
                            )}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => void insertBlock(hit)}
                              disabled={disabled || inserting}
                              className="inline-flex items-center gap-1.5 rounded-md bg-brand-justice px-2.5 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-brand-justice/90 disabled:opacity-50"
                            >
                              {inserting ? (
                                <Loader2
                                  className="h-3.5 w-3.5 animate-spin"
                                  aria-hidden
                                />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                              )}
                              Insérer
                            </button>
                            <button
                              type="button"
                              onClick={() => insertReference(hit)}
                              disabled={disabled || inserting}
                              className="inline-flex items-center gap-1.5 rounded-md border border-brand-justice/15 bg-brand-parchment/40 px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:bg-brand-parchment disabled:opacity-50"
                            >
                              <Quote className="h-3.5 w-3.5" aria-hidden />
                              Insérer la réf.
                            </button>
                            <button
                              type="button"
                              onClick={() => void openPreview(hit)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-brand-justice/15 bg-brand-parchment/40 px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition hover:bg-brand-parchment"
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              Voir texte
                            </button>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>

              {filteredHits.length === 0 && (
                <p className="py-6 text-center text-[12px] text-muted-foreground">
                  Aucun résultat pour ce filtre. Essayez « Tous ».
                </p>
              )}
            </>
          )}

          {!loading && hits.length === 0 && !error && (
            <p className="rounded-lg border border-dashed border-brand-justice/15 bg-white/60 px-3 py-8 text-center text-[12px] text-muted-foreground">
              Recherchez un article du corpus, CCJA ou droit national
              camerounais pour l&apos;insérer dans votre {docTypeLabel.toLowerCase()}.
            </p>
          )}

          <div className="mt-5 rounded-lg border border-brand-justice/10 bg-white/70 p-3">
            <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-brand-gold" aria-hidden />
              Suggestions Adili pour ce dossier
            </p>
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(s);
                      void search(s);
                    }}
                    className="flex w-full items-start gap-2 rounded-md px-1 py-0.5 text-left text-[12px] leading-snug text-foreground/85 transition hover:bg-brand-parchment/50"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold"
                      aria-hidden
                    />
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 truncate text-[10px] text-muted-foreground/70">
              {affaireTitre}
            </p>
          </div>
        </div>
      </aside>

      <Dialog
        open={Boolean(previewHit)}
        onOpenChange={(open) => !open && setPreviewHit(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {previewHit ? cardTitle(previewHit) : "Texte source"}
            </DialogTitle>
            {previewHit && (
              <p className="text-sm text-muted-foreground">
                {sourceCategoryLabel(previewHit)}
              </p>
            )}
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          ) : previewContent ? (
            <CorpusExtract text={previewContent} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
