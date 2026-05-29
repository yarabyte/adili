import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft, FilePlus2, Mail } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { affaires } from "@/lib/db/schema";
import {
  getEffectiveRole,
  hasPermission,
} from "@/lib/permissions/affaires";
import {
  correspondanceTypeLabel,
  isCorrespondanceType,
} from "@/lib/documents/correspondance";

import { NewDocumentForm } from "./new-document-form";

export const dynamic = "force-dynamic";

type SearchParams = {
  type?: string;
  from?: string;
};

export default async function NewDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id: affaireId } = await params;
  const sp = (await searchParams) ?? {};
  const fromCorrespondances = sp.from === "correspondances";
  const presetType =
    sp.type && isCorrespondanceType(sp.type) ? sp.type : undefined;

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
          href={`/app/affaires/${affaireId}${fromCorrespondances ? "?tab=correspondances" : ""}`}
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

  const backHref = `/app/affaires/${affaireId}${fromCorrespondances ? "?tab=correspondances" : ""}`;
  const title = fromCorrespondances
    ? presetType
      ? correspondanceTypeLabel(presetType)
      : "Nouveau courrier"
    : "Nouvelle pièce";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link
          href={backHref}
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
            {fromCorrespondances ? (
              <Mail className="h-6 w-6 text-brand-justice" aria-hidden />
            ) : (
              <FilePlus2 className="h-6 w-6 text-brand-justice" aria-hidden />
            )}
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {fromCorrespondances
              ? "Rédigez un courrier au client ou à un tiers. Il apparaîtra dans l'onglet Correspondances."
              : "Démarrez une nouvelle pièce vide. Vous pourrez ensuite la rédiger dans l'éditeur, insérer des citations OHADA et la soumettre pour validation."}
          </p>
        </div>
      </header>

      <NewDocumentForm
        affaireId={affaireId}
        defaultType={presetType}
        correspondanceOnly={fromCorrespondances}
      />
    </div>
  );
}
