"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  deleteDocument,
  rejectDocument,
  reopenDocument,
  submitDocument,
  validateDocument,
} from "@/app/actions/documents";
import {
  STATUTS_DOCUMENT_COLOR,
  STATUTS_DOCUMENT_LABEL,
  type StatutDocument,
} from "@/lib/constants/statuts";
import { cn } from "@/lib/utils";

export function WorkflowActions({
  documentId,
  affaireId,
  status,
  permissions,
  hideStatusBadge = false,
  /**
   * Hook appelé juste avant chaque action workflow (soumettre / valider /
   * rejeter / rouvrir). Sert à flusher l'autosave de l'éditeur pour
   * garantir que la dernière frappe est bien persistée AVANT le snapshot
   * de version créé côté serveur.
   */
  onBeforeAction,
}: {
  documentId: string;
  affaireId: string;
  status: StatutDocument;
  permissions: {
    canSubmit: boolean;
    canValidate: boolean;
    canReopen: boolean;
    canDelete: boolean;
  };
  hideStatusBadge?: boolean;
  onBeforeAction?: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    msg: string;
  } | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const inFinalState = status === "valide" || status === "archive";

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    setFeedback(null);
    startTransition(async () => {
      try {
        // CRITIQUE : on flushe l'autosave AVANT toute transition d'état
        // (soumission / validation / rejet / réouverture). Sinon la frappe
        // récente n'est pas persistée et le snapshot serveur fige du vide.
        if (onBeforeAction) await onBeforeAction();
      } catch (err) {
        setFeedback({
          tone: "error",
          msg:
            err instanceof Error
              ? `Sauvegarde préalable impossible : ${err.message}`
              : "Sauvegarde préalable impossible.",
        });
        return;
      }
      const res = await fn();
      if (res.error) {
        setFeedback({ tone: "error", msg: res.error });
      } else if (res.ok) {
        setFeedback({ tone: "success", msg: "Action enregistrée." });
        setShowRejectForm(false);
        setRejectReason("");
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {!hideStatusBadge && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium",
            STATUTS_DOCUMENT_COLOR[status] ??
              "border-muted bg-muted/30 text-foreground"
          )}
        >
          {STATUTS_DOCUMENT_LABEL[status] ?? status}
        </span>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Soumettre : brouillon ou rejeté → en_revue */}
        {permissions.canSubmit && (status === "brouillon" || status === "rejete") && (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={pending}
            onClick={() =>
              run(() => submitDocument(documentId))
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Soumettre pour validation
          </Button>
        )}

        {/* Valider : admin → en_revue → validé */}
        {permissions.canValidate && status === "en_revue" && (
          <>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={pending}
              onClick={() =>
                run(() => validateDocument(documentId))
              }
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ShieldCheck className="h-4 w-4" aria-hidden />
              )}
              Valider
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/5"
              disabled={pending}
              onClick={() => setShowRejectForm((v) => !v)}
            >
              <ShieldX className="h-4 w-4" aria-hidden />
              Rejeter
            </Button>
          </>
        )}

        {/* Rouvrir en brouillon : admin, sur valide ou rejete */}
        {permissions.canReopen && (status === "valide" || status === "rejete") && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-brand-justice/25 text-brand-justice hover:bg-brand-justice/5"
            disabled={pending}
            onClick={() =>
              run(() => reopenDocument(documentId))
            }
            title="Remet la pièce en brouillon pour reprendre la rédaction."
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden />
            )}
            Rouvrir en brouillon
          </Button>
        )}

        {/* Supprimer : admin uniquement */}
        {permissions.canDelete && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/5"
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  "Supprimer ce document ? Cette action est irréversible."
                )
              )
                return;
              run(async () => {
                const res = await deleteDocument(documentId);
                if (res.ok) {
                  // Redirection vers la fiche affaire après suppression.
                  window.location.assign(`/app/affaires/${affaireId}`);
                }
                return res;
              });
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Supprimer
          </Button>
        )}
      </div>

      {showRejectForm && (
        <form
          className="flex w-full flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (rejectReason.trim().length < 3) {
              setFeedback({
                tone: "error",
                msg: "Précisez le motif du rejet (≥ 3 caractères).",
              });
              return;
            }
            run(() =>
              rejectDocument(documentId, { raison: rejectReason.trim() })
            );
          }}
        >
          <label
            htmlFor="reject-reason"
            className="text-[12px] font-medium text-destructive"
          >
            Motif du rejet (visible dans l&apos;historique)
          </label>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-destructive/30 bg-card px-2 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-destructive"
            placeholder="Ex : Article 134 inversé avec 143, à revoir."
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowRejectForm(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Confirmer le rejet
            </Button>
          </div>
        </form>
      )}

      {feedback && (
        <span
          role="status"
          className={cn(
            "inline-flex items-center gap-1 text-[12.5px]",
            feedback.tone === "success"
              ? "text-emerald-700"
              : "text-destructive"
          )}
        >
          {feedback.tone === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          )}
          {feedback.msg}
        </span>
      )}

      {inFinalState && !hideStatusBadge && (
        <span className="text-right text-[12px] text-muted-foreground">
          Document figé — créez une nouvelle pièce pour repartir d&apos;ici.
        </span>
      )}
    </div>
  );
}
