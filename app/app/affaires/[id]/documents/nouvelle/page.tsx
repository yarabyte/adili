import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft, FilePlus2 } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { affaires } from "@/lib/db/schema";
import {
  getEffectiveRole,
  hasPermission,
} from "@/lib/permissions/affaires";

import { NewDocumentForm } from "./new-document-form";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
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
      titre: affaires.intitule,
    })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);
  if (!affaire) notFound();

  const ctx = await getEffectiveRole(session, affaireId);
  if (!ctx || !hasPermission(ctx.role, "document", "creer")) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <Link
          href={`/app/affaires/${affaireId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Retour à l&apos;affaire
        </Link>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-6 text-sm text-amber-900 dark:text-amber-200">
          Vous n&apos;avez pas le droit de créer une nouvelle pièce sur cette
          affaire. Demandez au responsable ou à un administrateur du cabinet de
          vous ajouter comme contributeur.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link
          href={`/app/affaires/${affaireId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Retour à l&apos;affaire
        </Link>
        <div className="space-y-1">
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground">
            {affaire.reference} · {affaire.titre}
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <FilePlus2 className="h-6 w-6 text-brand-justice" aria-hidden />
            Nouvelle pièce
          </h1>
          <p className="text-sm text-muted-foreground">
            Démarrez une nouvelle pièce vide. Vous pourrez ensuite la rédiger
            dans l&apos;éditeur, insérer des citations OHADA et la soumettre
            pour validation.
          </p>
        </div>
      </header>

      <NewDocumentForm affaireId={affaireId} />
    </div>
  );
}
