import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft, NotebookPen } from "lucide-react";

import { CrForm } from "@/components/comptes-rendus/cr-form";
import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { affaires } from "@/lib/db/schema";
import { listAffaireMembreOptions } from "@/lib/echeances/affaire-members";
import {
  getEffectiveRole,
  hasPermission,
} from "@/lib/permissions/affaires";
import type { AdversaireAffaire } from "@/lib/comptes-rendus/types";

export const dynamic = "force-dynamic";

export default async function NouveauCompteRenduPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: affaireId } = await params;

  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    redirect("/connexion?next=/app");
  }

  const [affaire] = await db
    .select({
      id: affaires.id,
      reference: affaires.reference,
      intitule: affaires.intitule,
      adversaires: affaires.adversaires,
    })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);
  if (!affaire) notFound();

  const ctx = await getEffectiveRole(session, affaireId);
  if (!ctx || !hasPermission(ctx.role, "compte_rendu", "creer")) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <Link
          href={`/app/affaires/${affaireId}?tab=comptes_rendus`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Retour à l&apos;affaire
        </Link>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-6 text-sm text-amber-900 dark:text-amber-200">
          Vous n&apos;avez pas le droit de créer un compte rendu sur cette affaire.
        </div>
      </div>
    );
  }

  const membreOptions = await listAffaireMembreOptions(affaireId);
  const adversaires = (affaire.adversaires ?? []) as AdversaireAffaire[];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link
          href={`/app/affaires/${affaireId}?tab=comptes_rendus`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Retour à l&apos;affaire
        </Link>
        <div className="text-[12px] uppercase tracking-wide text-muted-foreground">
          {affaire.reference} · {affaire.intitule}
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <NotebookPen className="h-6 w-6 text-brand-justice" aria-hidden />
          Nouveau compte rendu
        </h1>
        <p className="text-sm text-muted-foreground">
          Renseignez l&apos;événement rapporté. Vous pourrez rédiger le corps du
          CR juste après la création.
        </p>
      </header>

      <CrForm
        mode="create"
        affaireId={affaireId}
        membreOptions={membreOptions}
        adversaires={adversaires}
      />
    </div>
  );
}
