"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  archiveAffaire,
  closeAffaire,
  reopenAffaire,
} from "@/app/actions/affaires";

type Statut = "ouvert" | "en_cours" | "en_delibere" | "clos" | "archive";

export function AffaireStatusActions({
  affaireId,
  statut,
}: {
  affaireId: string;
  statut: Statut;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<unknown>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statut !== "clos" && statut !== "archive" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-brand-justice/25"
          disabled={pending}
          onClick={() =>
            run(
              () => closeAffaire(affaireId),
              "Clôturer cette affaire ? Vous pourrez la rouvrir plus tard."
            )
          }
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          )}
          Clôturer
        </Button>
      )}
      {statut !== "archive" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-brand-justice/25"
          disabled={pending}
          onClick={() =>
            run(
              () => archiveAffaire(affaireId),
              "Archiver cette affaire ? Elle restera consultable mais ne sera plus active."
            )
          }
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Archive className="h-4 w-4" aria-hidden />
          )}
          Archiver
        </Button>
      )}
      {(statut === "clos" || statut === "archive") && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800"
          disabled={pending}
          onClick={() => run(() => reopenAffaire(affaireId))}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RotateCcw className="h-4 w-4" aria-hidden />
          )}
          Rouvrir
        </Button>
      )}
    </div>
  );
}
