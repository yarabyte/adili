"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Archive,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Scale,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  archiveAffaire,
  closeAffaire,
  markAffaireEnCours,
  markAffaireEnDelibere,
  reopenAffaire,
  type AffaireActionState,
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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const confirm = useConfirm();

  async function run(
    action: () => Promise<AffaireActionState>,
    confirmOpts?: Parameters<typeof confirm>[0]
  ) {
    setError(null);
    if (confirmOpts) {
      const ok = await confirm(confirmOpts);
      if (!ok) return;
    }
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const isTerminal = statut === "clos" || statut === "archive";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {statut === "ouvert" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-brand-justice/25"
            disabled={pending}
            onClick={() =>
              run(() => markAffaireEnCours(affaireId), {
                title: "Passer l'affaire en cours ?",
                description:
                  "Le dossier est actif : audiences, échanges et production de pièces.",
                confirmLabel: "Marquer en cours",
              })
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Activity className="h-4 w-4" aria-hidden />
            )}
            Marquer en cours
          </Button>
        )}

        {(statut === "ouvert" || statut === "en_cours") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-amber-500/35 bg-amber-500/5 text-amber-950 hover:bg-amber-500/10 dark:text-amber-100"
            disabled={pending}
            onClick={() =>
              run(() => markAffaireEnDelibere(affaireId), {
                title: "Mettre l'affaire en délibéré ?",
                description:
                  "À utiliser après une audience en délibéré, en attendant le prononcé ou la clôture.",
                confirmLabel: "Mettre en délibéré",
              })
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Scale className="h-4 w-4" aria-hidden />
            )}
            Mettre en délibéré
          </Button>
        )}

        {statut === "en_delibere" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-brand-justice/25"
            disabled={pending}
            onClick={() =>
              run(() => markAffaireEnCours(affaireId), {
                title: "Repasser l'affaire en cours ?",
                description:
                  "Si le délibéré est levé ou que le suivi reprend avant clôture.",
                confirmLabel: "Repasser en cours",
              })
            }
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Activity className="h-4 w-4" aria-hidden />
            )}
            Reprendre le suivi
          </Button>
        )}

        {!isTerminal && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-brand-justice/25"
            disabled={pending}
            onClick={() =>
              run(() => closeAffaire(affaireId), {
                title: "Clôturer cette affaire ?",
                description: "Vous pourrez la rouvrir plus tard.",
                confirmLabel: "Clôturer",
              })
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
              run(() => archiveAffaire(affaireId), {
                title: "Archiver cette affaire ?",
                description:
                  "Elle restera consultable mais ne sera plus active.",
                confirmLabel: "Archiver",
              })
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

        {isTerminal && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800"
            disabled={pending}
            onClick={() =>
              run(() => reopenAffaire(affaireId), {
                title: "Rouvrir cette affaire ?",
                description: "Le dossier repassera en cours de traitement.",
                confirmLabel: "Rouvrir",
              })
            }
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

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
