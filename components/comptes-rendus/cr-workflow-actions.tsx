"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileDown,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  deleteCompteRendu,
  finaliserCompteRendu,
  rejeterCompteRendu,
  rouvrirCompteRendu,
  soumettreCompteRendu,
  validerCompteRendu,
} from "@/app/actions/comptes-rendus";
import type { StatutCompteRendu } from "@/lib/constants/statuts-compte-rendu";
import { downloadCompteRenduPdf } from "@/lib/comptes-rendus/pdf/download-compte-rendu-pdf";

export function CrWorkflowActions({
  compteRenduId,
  affaireId,
  titre,
  statut,
  soumisValidation,
  permissions,
}: {
  compteRenduId: string;
  affaireId: string;
  titre: string;
  statut: StatutCompteRendu;
  soumisValidation: boolean;
  permissions: {
    canFinaliser: boolean;
    canSoumettre: boolean;
    canValider: boolean;
    canRejeter: boolean;
    canReopen: boolean;
    canDelete: boolean;
    isAuteur: boolean;
  };
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [pdfPending, setPdfPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  function run(action: () => Promise<{ ok?: boolean; error?: string; message?: string }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
      if (res.message) setMessage(res.message);
      if (res.ok) router.refresh();
    });
  }

  async function finalizeAndDownloadPdf() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await finaliserCompteRendu(compteRenduId);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.ok) {
        try {
          setPdfPending(true);
          await downloadCompteRenduPdf(compteRenduId, affaireId, titre);
          setMessage(
            (res.message ? `${res.message} ` : "") + "PDF téléchargé."
          );
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Finalisé, mais le PDF n'a pas pu être téléchargé."
          );
          if (res.message) setMessage(res.message);
        } finally {
          setPdfPending(false);
        }
        router.refresh();
      }
    });
  }

  async function validateAndDownloadPdf() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await validerCompteRendu(compteRenduId);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.ok) {
        try {
          setPdfPending(true);
          await downloadCompteRenduPdf(compteRenduId, affaireId, titre);
          setMessage("Compte rendu validé. PDF téléchargé.");
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Validé, mais le PDF n'a pas pu être téléchargé."
          );
        } finally {
          setPdfPending(false);
        }
        router.refresh();
      }
    });
  }

  function downloadPdfOnly() {
    setError(null);
    startTransition(async () => {
      try {
        setPdfPending(true);
        await downloadCompteRenduPdf(compteRenduId, affaireId, titre);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Téléchargement PDF impossible."
        );
      } finally {
        setPdfPending(false);
      }
    });
  }

  const locked =
    statut === "finalise" || statut === "valide" || statut === "en_revue";

  const showPdfButton = statut === "finalise" || statut === "valide";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {statut === "brouillon" && permissions.canFinaliser && permissions.isAuteur && !soumisValidation && (
          <Button
            type="button"
            size="sm"
            disabled={pending || pdfPending}
            onClick={() => void finalizeAndDownloadPdf()}
          >
            {pending || pdfPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Finaliser et PDF
          </Button>
        )}
        {statut === "brouillon" && permissions.canSoumettre && permissions.isAuteur && soumisValidation && (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => run(() => soumettreCompteRendu(compteRenduId))}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Soumettre à validation
          </Button>
        )}
        {statut === "en_revue" && permissions.canValider && (
          <Button
            type="button"
            size="sm"
            disabled={pending || pdfPending}
            onClick={() => void validateAndDownloadPdf()}
          >
            {pending || pdfPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Valider et PDF
          </Button>
        )}
        {statut === "en_revue" && permissions.canRejeter && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setRejectOpen((v) => !v)}
          >
            <XCircle className="h-4 w-4" />
            Rejeter
          </Button>
        )}
        {showPdfButton && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pdfPending}
            onClick={() => void downloadPdfOnly()}
          >
            {pdfPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Télécharger PDF
          </Button>
        )}
        {locked && permissions.canReopen && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => rouvrirCompteRendu(compteRenduId))}
          >
            <RotateCcw className="h-4 w-4" />
            Rouvrir en brouillon
          </Button>
        )}
        {permissions.canDelete && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={pending}
            onClick={async () => {
              const ok = await confirm({
                title: "Supprimer ce compte rendu ?",
                description: "Cette action est définitive.",
                confirmLabel: "Supprimer",
                variant: "destructive",
              });
              if (!ok) return;
              startTransition(async () => {
                const res = await deleteCompteRendu(compteRenduId);
                if (res.error) setError(res.error);
                if (res.ok) router.push(`/app/affaires/${affaireId}?tab=comptes_rendus`);
              });
            }}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        )}
      </div>

      {rejectOpen && (
        <div className="space-y-2 rounded-lg border border-brand-justice/12 bg-card p-3">
          <label className="text-sm font-medium" htmlFor="reject-reason">
            Motif du rejet
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending || rejectReason.trim().length < 3}
            onClick={() =>
              run(() =>
                rejeterCompteRendu(compteRenduId, { raison: rejectReason })
              )
            }
          >
            Confirmer le rejet
          </Button>
        </div>
      )}

      {message && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
