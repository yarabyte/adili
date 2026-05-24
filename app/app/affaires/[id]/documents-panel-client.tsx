"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Lock,
  PencilLine,
  PenSquare,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { LABELS_DOCUMENTS } from "@/lib/constants/types-documents";
import {
  STATUTS_DOCUMENT_COLOR,
  STATUTS_DOCUMENT_LABEL,
  type StatutDocument,
} from "@/lib/constants/statuts";
import {
  DOCUMENT_CATEGORIES,
  getDocumentCategory,
} from "@/lib/documents/category";

const STATUS_ICON: Record<
  StatutDocument,
  React.ComponentType<{ className?: string }>
> = {
  brouillon: PencilLine,
  en_revue: Clock,
  valide: CheckCircle2,
  rejete: FileText,
  archive: FileText,
};

const STATUTS = Object.keys(
  STATUTS_DOCUMENT_LABEL
) as StatutDocument[];

const DOC_PAGE_SIZE = 15;

const selectClassName =
  "h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export type DocumentRow = {
  id: string;
  titre: string;
  typeDocument: string;
  statut: StatutDocument;
  updatedAt: string;
  auteurId: string | null;
  auteurName: string | null;
  auteurEmail: string | null;
};

export function DocumentsPanelClient({
  affaireId,
  documents,
  canCreate,
}: {
  affaireId: string;
  documents: DocumentRow[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const filterCat = params?.get("docCat") ?? "";
  const filterStatut = params?.get("docStatut") ?? "";
  const filterAuteur = params?.get("docAuteur") ?? "";
  const pageParam = Math.max(
    1,
    parseInt(params?.get("docPage") ?? "1", 10) || 1
  );

  const auteurs = useMemo(() => {
    const map = new Map<string, string>();
    for (const doc of documents) {
      if (!doc.auteurId) continue;
      const label = doc.auteurName?.trim() || doc.auteurEmail || doc.auteurId;
      map.set(doc.auteurId, label);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [documents]);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (filterCat) {
        const cat = getDocumentCategory(doc.typeDocument);
        if (cat !== filterCat) return false;
      }
      if (filterStatut && doc.statut !== filterStatut) return false;
      if (filterAuteur) {
        if (!doc.auteurId || doc.auteurId !== filterAuteur) return false;
      }
      return true;
    });
  }, [documents, filterCat, filterStatut, filterAuteur]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / DOC_PAGE_SIZE)
  );
  const currentPage = Math.min(pageParam, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * DOC_PAGE_SIZE;
    return filtered.slice(start, start + DOC_PAGE_SIZE);
  }, [filtered, currentPage]);

  const hasActiveFilters = Boolean(filterCat || filterStatut || filterAuteur);

  function pushParams(next: Record<string, string | null>) {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(next)) {
      if (v && v.length > 0) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    const qs = url.searchParams.toString();
    router.replace(qs ? `${url.pathname}?${qs}` : url.pathname, {
      scroll: false,
    });
  }

  function pushFilters(next: Record<string, string | null>) {
    pushParams({ ...next, docPage: null });
  }

  function clearFilters() {
    pushFilters({ docCat: null, docStatut: null, docAuteur: null });
  }

  if (documents.length === 0) {
    return (
      <EmptyDocuments affaireId={affaireId} canCreate={canCreate} />
    );
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Pièces de l&apos;affaire
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {hasActiveFilters
                ? `${filtered.length} / ${documents.length}`
                : `(${documents.length})`}
            </span>
          </h2>
          <p className="text-[12.5px] text-muted-foreground">
            Cliquez sur une pièce pour la consulter ou la rédiger.
          </p>
        </div>
        {canCreate ? (
          <Button asChild size="sm" className="shrink-0">
            <Link href={`/app/affaires/${affaireId}/documents/nouvelle`}>
              <PenSquare className="h-4 w-4" aria-hidden />
              Nouvelle pièce
            </Link>
          </Button>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-justice/15 bg-brand-parchment-dark/30 px-3 py-1 text-[12px] text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden />
            Lecture seule
          </span>
        )}
      </header>

      <section
        aria-label="Filtres des documents"
        className="flex flex-col gap-3 rounded-xl border border-brand-justice/10 bg-card p-3 shadow-sm lg:flex-row lg:flex-wrap lg:items-center"
      >
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground lg:mr-1">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Filtrer
        </span>

        <select
          value={filterCat}
          onChange={(e) => pushFilters({ docCat: e.target.value || null })}
          className={`${selectClassName} min-w-[180px] flex-1 lg:max-w-[220px]`}
          aria-label="Catégorie de document"
        >
          <option value="">Toutes les catégories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={filterStatut}
          onChange={(e) => pushFilters({ docStatut: e.target.value || null })}
          className={`${selectClassName} min-w-[160px] flex-1 lg:max-w-[200px]`}
          aria-label="Statut du document"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {STATUTS_DOCUMENT_LABEL[s]}
            </option>
          ))}
        </select>

        <select
          value={filterAuteur}
          onChange={(e) => pushFilters({ docAuteur: e.target.value || null })}
          className={`${selectClassName} min-w-[180px] flex-1 lg:max-w-[240px]`}
          aria-label="Auteur du document"
        >
          <option value="">Tous les auteurs</option>
          {auteurs.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="h-4 w-4" aria-hidden />
            Réinitialiser
          </Button>
        )}
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-justice/15 bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
          Aucune pièce ne correspond à ces filtres.
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 block w-full text-brand-justice underline-offset-2 hover:underline"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-brand-justice/10 bg-card">
          <ul className="divide-y divide-brand-justice/10">
            {paginated.map((doc) => (
              <DocumentListItem key={doc.id} affaireId={affaireId} doc={doc} />
            ))}
          </ul>
          <ListPagination
            page={currentPage}
            pageSize={DOC_PAGE_SIZE}
            total={filtered.length}
            onPageChange={(p) =>
              pushParams({ docPage: p <= 1 ? null : String(p) })
            }
          />
        </div>
      )}
    </div>
  );
}

function DocumentListItem({
  affaireId,
  doc,
}: {
  affaireId: string;
  doc: DocumentRow;
}) {
  const StatusIcon = STATUS_ICON[doc.statut] ?? FileText;
  const typeLabel =
    LABELS_DOCUMENTS[doc.typeDocument as keyof typeof LABELS_DOCUMENTS] ??
    doc.typeDocument;
  const category = getDocumentCategory(doc.typeDocument);
  const categoryLabel = category
    ? DOCUMENT_CATEGORIES.find((c) => c.id === category)?.label
    : null;

  return (
    <li>
      <Link
        href={`/app/affaires/${affaireId}/documents/${doc.id}`}
        className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-brand-parchment-dark/30"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-justice/10 text-brand-justice">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-foreground">
              {doc.titre}
            </p>
            <p className="truncate text-[12px] text-muted-foreground">
              {categoryLabel && (
                <span className="text-brand-justice/80">{categoryLabel}</span>
              )}
              {categoryLabel && typeLabel ? " · " : null}
              {typeLabel}
              {doc.auteurName || doc.auteurEmail ? (
                <>
                  {" · "}
                  {doc.auteurName ?? doc.auteurEmail}
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium " +
              (STATUTS_DOCUMENT_COLOR[doc.statut] ??
                "border-muted bg-muted/30 text-foreground")
            }
          >
            <StatusIcon className="h-3 w-3" aria-hidden />
            {STATUTS_DOCUMENT_LABEL[doc.statut] ?? doc.statut}
          </span>
          <span className="hidden text-[11.5px] text-muted-foreground sm:inline">
            {formatDate(doc.updatedAt)}
          </span>
        </div>
      </Link>
    </li>
  );
}

function EmptyDocuments({
  affaireId,
  canCreate,
}: {
  affaireId: string;
  canCreate: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-brand-justice/15 bg-card/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
        <FileText className="h-6 w-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="font-heading text-lg font-semibold text-brand-ink">
          Aucune pièce pour le moment
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          Démarrez une nouvelle pièce pour rédiger conclusions, mémoires ou
          requêtes — vous pourrez y insérer des articles OHADA avec citation
          vérifiable.
        </p>
      </div>
      {canCreate ? (
        <Button asChild>
          <Link href={`/app/affaires/${affaireId}/documents/nouvelle`}>
            <PenSquare className="h-4 w-4" aria-hidden />
            Nouvelle pièce
          </Link>
        </Button>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-brand-justice/15 bg-brand-parchment-dark/30 px-3 py-1 text-[12px] text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden />
          Lecture seule
        </span>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
