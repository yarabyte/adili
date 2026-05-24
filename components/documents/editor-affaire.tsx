"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import NextLink from "next/link";
import {
  ChevronLeft,
  Cloud,
  CloudOff,
  FileDown,
  Loader2,
  Save,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { saveDocument } from "@/app/actions/documents";
import { useDocumentAutosave } from "@/hooks/use-document-autosave";
import { useDocumentLock } from "@/hooks/use-document-lock";
import { CitationBlock } from "@/lib/documents/tiptap/citation-block";
import { CitationMark } from "@/lib/documents/tiptap/citation-mark";

/**
 * Force un objet en POJO (plain object) avant de l'envoyer à une Server
 * Action : TipTap renvoie un arbre dont certains nœuds ProseMirror ont un
 * prototype `null`, ce que Next.js refuse (erreur « Only plain objects,
 * and a few built-ins, can be passed to Server Actions »).
 */
function toPlainJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
import { LABELS_DOCUMENTS } from "@/lib/constants/types-documents";
import {
  STATUTS_DOCUMENT_COLOR,
  STATUTS_DOCUMENT_LABEL,
  type StatutDocument,
} from "@/lib/constants/statuts";
import { cn } from "@/lib/utils";

import { downloadDocumentPdf } from "@/lib/documents/pdf/download-document-pdf";

import { CitationInserter } from "./citation-inserter";
import { EditorToolbar } from "./editor-toolbar";
import { LockBanner } from "./lock-banner";
import { WorkflowActions } from "./workflow-actions";

export interface EditorAffaireProps {
  document: {
    id: string;
    affaireId: string;
    titre: string;
    typeDocument: string;
    statut: StatutDocument;
    contenuTiptap: unknown;
    contenuText: string | null;
    updatedAt: string;
  };
  affaire: {
    id: string;
    reference: string;
    titre: string;
  };
  permissions: {
    canEdit: boolean;
    canSubmit: boolean;
    canValidate: boolean;
    canReopen: boolean;
    canDelete: boolean;
  };
}

export function EditorAffaire({
  document,
  affaire,
  permissions,
}: EditorAffaireProps) {
  // ─── Verrou (acquis si on a l'édition + statut éditable) ─────────
  const isEditableStatus =
    document.statut === "brouillon" || document.statut === "rejete";
  const wantsLock = permissions.canEdit && isEditableStatus;
  const { state: lockState } = useDocumentLock(document.id, {
    enabled: wantsLock,
  });
  const ownsLock = lockState.status === "owned";

  // L'éditeur n'est interactif que si on a la main et que le doc est éditable.
  const editable = wantsLock && ownsLock;

  // ─── Autosave (debounce 1.5s) ────────────────────────────────────
  const autosave = useDocumentAutosave<{
    contenuTiptap: unknown;
    contenuText: string;
  }>({
    enabled: editable,
    delayMs: 1500,
    save: async (payload) => {
      const res = await saveDocument(document.id, {
        // Sécurité : on re-clone au cas où le payload viendrait d'un
        // chemin n'ayant pas appelé toPlainJson en amont.
        contenuTiptap: toPlainJson(payload.contenuTiptap),
        contenuText: payload.contenuText,
        createSnapshot: false,
      });
      return res;
    },
  });

  // ─── TipTap ──────────────────────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Commencez à rédiger votre conclusion, mémoire ou contrat…",
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "underline text-brand-justice",
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      CitationMark,
      CitationBlock,
    ],
    content: document.contenuTiptap as object,
    onUpdate: ({ editor }) => {
      if (!editable) return;
      autosave.trigger({
        contenuTiptap: toPlainJson(editor.getJSON()),
        contenuText: editor.getText(),
      });
    },
  });

  // Synchronisation editable / TipTap quand l'état du verrou change.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  // Raccourci ⌘S / Ctrl+S → snapshot manuel (et flush autosave).
  const saveNow = useCallback(async () => {
    if (!editor || !editable) return;
    const json = toPlainJson(editor.getJSON());
    const text = editor.getText();
    await autosave.saveNow({ contenuTiptap: json, contenuText: text });
    // Snapshot explicite : on relance un save dédié avec createSnapshot=true,
    // qui crée la ligne dans document_versions.
    await saveDocument(document.id, {
      contenuTiptap: json,
      contenuText: text,
      createSnapshot: true,
    });
  }, [editor, editable, autosave, document.id]);

  // Flush bloquant utilisé avant les actions workflow (soumettre /
  // valider / rejeter / rouvrir). Garantit que la frappe la plus récente
  // est persistée avant que le serveur ne fige une version.
  const flushBeforeWorkflow = useCallback(async (): Promise<void> => {
    if (!editor) return;
    if (!editable) return; // pas de verrou ou pas droit d'édition : rien à pousser
    await autosave.saveNow({
      contenuTiptap: toPlainJson(editor.getJSON()),
      contenuText: editor.getText(),
    });
  }, [editor, editable, autosave]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isSave =
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        void saveNow();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const typeLabel = useMemo(
    () =>
      LABELS_DOCUMENTS[
        document.typeDocument as keyof typeof LABELS_DOCUMENTS
      ] ?? document.typeDocument,
    [document.typeDocument]
  );

  // Détecte un document figé (validé / archivé) sans contenu — typiquement
  // un bug de course où la frappe n'a pas été flushée avant la soumission.
  // L'admin peut alors « Rouvrir en brouillon » pour reprendre la main.
  const isFrozenEmpty = useMemo(() => {
    if (document.statut !== "valide" && document.statut !== "archive") {
      return false;
    }
    if (document.contenuText && document.contenuText.trim().length > 0) {
      return false;
    }
    const json = document.contenuTiptap as
      | { content?: Array<{ content?: unknown[] }> }
      | null;
    if (!json || !Array.isArray(json.content)) return true;
    return !json.content.some(
      (n) => Array.isArray(n.content) && n.content.length > 0
    );
  }, [document.statut, document.contenuText, document.contenuTiptap]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-brand-parchment/40">
      <header className="z-20 flex flex-shrink-0 flex-col border-b border-brand-justice/10 bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-1 h-9 shrink-0 gap-1.5 px-2 text-muted-foreground"
            >
              <NextLink href={`/app/affaires/${affaire.id}`}>
                <ChevronLeft className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Retour à l&apos;affaire</span>
              </NextLink>
            </Button>
            <div className="min-w-0 border-l border-brand-justice/10 pl-3">
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-brand-justice/80">
                {affaire.reference}
                <span className="mx-1.5 font-normal text-muted-foreground/60">
                  ·
                </span>
                <span className="normal-case tracking-normal text-muted-foreground">
                  {affaire.titre}
                </span>
              </p>
              <h1 className="mt-1 font-heading text-xl font-semibold leading-tight text-brand-ink sm:text-2xl">
                {document.titre}
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">{typeLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                STATUTS_DOCUMENT_COLOR[document.statut]
              )}
            >
              {STATUTS_DOCUMENT_LABEL[document.statut]}
            </span>
            <AutosaveBadge
              editable={editable}
              status={autosave.status}
              savedAt={autosave.savedAt}
              error={autosave.error}
            />
            <div className="flex items-center gap-1 rounded-lg border border-brand-justice/15 bg-brand-parchment/50 p-0.5">
              {editable && (
                <button
                  type="button"
                  onClick={() => void saveNow()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition hover:bg-card"
                  title="Créer un point de sauvegarde (⌘S)"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  Version
                </button>
              )}
              <button
                type="button"
                disabled={pdfLoading}
                onClick={async () => {
                  setPdfError(null);
                  setPdfLoading(true);
                  try {
                    if (editable) await flushBeforeWorkflow();
                    await downloadDocumentPdf(
                      document.id,
                      affaire.id,
                      document.titre
                    );
                  } catch (err) {
                    setPdfError(
                      err instanceof Error
                        ? err.message
                        : "Export PDF impossible."
                    );
                  } finally {
                    setPdfLoading(false);
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition hover:bg-card disabled:opacity-60"
                title="Télécharger le PDF (A4)"
              >
                {pdfLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <FileDown className="h-3.5 w-3.5" aria-hidden />
                )}
                PDF
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-justice/8 bg-brand-parchment/30 px-4 py-2.5 sm:px-5">
          <div className="min-w-0 flex-1 space-y-1">
            <LockBanner documentId={document.id} state={lockState} />
            {pdfError && (
              <p className="text-[12px] text-destructive" role="alert">
                {pdfError}
              </p>
            )}
          </div>
          <WorkflowActions
            documentId={document.id}
            affaireId={affaire.id}
            status={document.statut}
            hideStatusBadge
            permissions={{
              canSubmit: permissions.canSubmit,
              canValidate: permissions.canValidate,
              canReopen: permissions.canReopen,
              canDelete: permissions.canDelete,
            }}
            onBeforeAction={flushBeforeWorkflow}
          />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-brand-justice/8 bg-card/60 px-4 py-2 backdrop-blur-sm lg:px-6">
            <EditorToolbar editor={editor} disabled={!editable} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-6">
            <div className="mx-auto w-full max-w-[820px] space-y-4">
              {!permissions.canEdit && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-[12.5px] text-amber-900 dark:text-amber-200">
                  <ShieldAlert
                    className="mr-1 inline h-3.5 w-3.5 align-text-bottom"
                    aria-hidden
                  />
                  Lecture seule — votre rôle sur cette affaire ne permet pas
                  d&apos;éditer.
                </div>
              )}

              {isFrozenEmpty && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-900 dark:text-amber-200">
                  <p className="font-medium">
                    Cette pièce a été figée sans contenu.
                  </p>
                  <p className="mt-1 text-[12px] opacity-90">
                    La frappe n&apos;avait pas été sauvegardée avant la
                    soumission.{" "}
                    {permissions.canReopen
                      ? "Cliquez sur « Rouvrir en brouillon » dans la barre ci-dessus pour reprendre la rédaction — la version validée vide reste dans l'historique."
                      : "Demandez à un administrateur du cabinet de la rouvrir en brouillon, ou créez une nouvelle pièce."}
                  </p>
                </div>
              )}

              <div
                className={cn(
                  "tiptap-document min-h-[min(70vh,920px)] rounded-xl border bg-card p-8 shadow-md ring-1 ring-brand-justice/10 sm:p-10",
                  editable
                    ? "border-brand-justice/15"
                    : "cursor-default border-brand-justice/10"
                )}
              >
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </main>

        <CitationInserter editor={editor} disabled={!editable} />
      </div>
    </div>
  );
}

function AutosaveBadge({
  editable,
  status,
  savedAt,
  error,
}: {
  editable: boolean;
  status: "idle" | "dirty" | "saving" | "saved" | "error";
  savedAt: Date | null;
  error: string | null;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (status !== "saved") return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [status]);

  if (!editable) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
        aria-live="polite"
      >
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
        Lecture seule
      </span>
    );
  }

  let label: React.ReactNode;
  let tone = "text-muted-foreground";
  let Icon: React.ComponentType<{ className?: string }> = Cloud;
  switch (status) {
    case "saving":
      label = "Enregistrement…";
      Icon = Loader2;
      tone = "text-foreground";
      break;
    case "dirty":
      label = "Modifications non enregistrées";
      tone = "text-amber-700";
      Icon = Cloud;
      break;
    case "saved":
      label = savedAt
        ? `Enregistré ${formatRelativeTime(savedAt, tick)}`
        : "Enregistré";
      tone = "text-emerald-700";
      Icon = Cloud;
      break;
    case "error":
      label = error ?? "Échec de la sauvegarde";
      tone = "text-destructive";
      Icon = CloudOff;
      break;
    default:
      label = "Prêt";
      break;
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[12px]", tone)}
      aria-live="polite"
    >
      <Icon
        className={cn("h-3.5 w-3.5", status === "saving" && "animate-spin")}
        aria-hidden
      />
      {label}
    </span>
  );
}

function formatRelativeTime(date: Date, tick: number): string {
  void tick; // ré-render quand `tick` change pour rafraîchir "il y a X s"
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
