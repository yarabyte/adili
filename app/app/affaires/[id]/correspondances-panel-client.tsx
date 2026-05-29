"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Mail,
  PencilLine,
  PenSquare,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CORRESPONDANCE_TEMPLATES,
  correspondanceTypeLabel,
} from "@/lib/documents/correspondance";
import {
  STATUTS_DOCUMENT_COLOR,
  STATUTS_DOCUMENT_LABEL,
  type StatutDocument,
} from "@/lib/constants/statuts";

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

export type CorrespondanceRow = {
  id: string;
  titre: string;
  typeDocument: string;
  statut: StatutDocument;
  updatedAt: string;
  auteurId: string | null;
  auteurName: string | null;
  auteurEmail: string | null;
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function newCourrierHref(affaireId: string, type: string): string {
  const params = new URLSearchParams({
    type,
    from: "correspondances",
  });
  return `/app/affaires/${affaireId}/documents/nouvelle?${params}`;
}

export function CorrespondancesPanelClient({
  affaireId,
  correspondances,
  canCreate,
}: {
  affaireId: string;
  correspondances: CorrespondanceRow[];
  canCreate: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-brand-ink">
            Correspondances
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Courriers et notes adressés au client ou aux tiers — rédigés comme
            les autres pièces, avec export PDF.
          </p>
        </div>
        {canCreate ? (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={newCourrierHref(affaireId, "lettre_officielle")}>
              <Plus className="h-4 w-4" />
              Nouveau courrier
            </Link>
          </Button>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-justice/15 bg-brand-parchment-dark/30 px-3 py-1 text-[12px] text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden />
            Lecture seule
          </span>
        )}
      </div>

      {canCreate && (
        <section
          aria-label="Modèles de courrier"
          className="grid gap-3 sm:grid-cols-3"
        >
          {CORRESPONDANCE_TEMPLATES.map((tpl) => (
            <Link
              key={tpl.type}
              href={newCourrierHref(affaireId, tpl.type)}
              className="group flex flex-col rounded-xl border border-brand-justice/12 bg-card p-4 shadow-sm transition hover:border-brand-gold/40 hover:shadow-md"
            >
              <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-justice/8 text-brand-justice group-hover:bg-brand-gold/15 group-hover:text-brand-ink">
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <span className="font-medium text-foreground">
                {correspondanceTypeLabel(tpl.type)}
              </span>
              <span className="mt-1 flex-1 text-[12px] leading-snug text-muted-foreground">
                {tpl.description}
              </span>
              <span className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-brand-justice opacity-0 transition group-hover:opacity-100">
                Rédiger →
              </span>
            </Link>
          ))}
        </section>
      )}

      <section aria-label="Courriers de l'affaire">
        <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Courriers enregistrés ({correspondances.length})
        </h4>

        {correspondances.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-justice/20 bg-muted/20 px-4 py-10 text-center">
            <Mail
              className="mx-auto h-8 w-8 text-brand-justice/40"
              aria-hidden
            />
            <p className="mt-3 text-sm font-medium text-foreground">
              Aucune correspondance
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate
                ? "Choisissez un modèle ci-dessus pour rédiger le premier courrier."
                : "Aucun courrier n'a encore été créé sur cette affaire."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {correspondances.map((doc) => {
              const Icon = STATUS_ICON[doc.statut];
              return (
                <li key={doc.id}>
                  <Link
                    href={`/app/affaires/${affaireId}/documents/${doc.id}`}
                    className="flex items-start gap-3 rounded-xl border border-brand-justice/10 bg-card px-4 py-3 shadow-sm transition hover:border-brand-gold/35 hover:shadow-md"
                  >
                    <span
                      className={`mt-0.5 inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUTS_DOCUMENT_COLOR[doc.statut]}`}
                    >
                      <Icon className="mr-1 inline h-3 w-3" aria-hidden />
                      {STATUTS_DOCUMENT_LABEL[doc.statut]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{doc.titre}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {correspondanceTypeLabel(doc.typeDocument)}
                        {doc.auteurName ? ` · ${doc.auteurName}` : ""}
                        {" · "}
                        {formatWhen(doc.updatedAt)}
                      </p>
                    </div>
                    <PenSquare
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
