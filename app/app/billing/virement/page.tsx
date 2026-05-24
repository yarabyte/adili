import { and, desc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UploadPreuveForm } from "@/components/billing/upload-preuve-form";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/profile";
import { formatFcfa } from "@/lib/billing/format";
import { db } from "@/lib/db/client";
import { paiements } from "@/lib/db/schema";

export const metadata = { title: "Virement · Adili" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: { ref?: string; paiement?: string };
};

export default async function VirementInstructionsPage({ searchParams }: Props) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) redirect("/connexion");

  const paiementId = searchParams.paiement;
  const [paiement] = paiementId
    ? await db
        .select()
        .from(paiements)
        .where(eq(paiements.id, paiementId))
        .limit(1)
    : await db
        .select()
        .from(paiements)
        .where(
          and(
            eq(paiements.cabinetId, session.profile.cabinetId),
            eq(paiements.methode, "virement"),
            eq(paiements.statut, "en_attente")
          )
        )
        .orderBy(desc(paiements.createdAt))
        .limit(1);

  const ref = searchParams.ref ?? paiement?.referenceVirement;
  const rib = process.env.ADILI_BANK_RIB ?? process.env.LEXAI_BANK_RIB;
  const bank = process.env.ADILI_BANK_NAME ?? process.env.LEXAI_BANK_NAME;
  const titulaire =
    process.env.ADILI_BANK_TITULAIRE ?? process.env.LEXAI_BANK_TITULAIRE;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/app/billing">
          <ChevronLeft className="h-4 w-4" />
          Facturation
        </Link>
      </Button>

      <header>
        <h1 className="font-heading text-2xl font-semibold text-brand-justice">
          Instructions de virement
        </h1>
        {paiement && (
          <p className="mt-1 text-sm text-muted-foreground">
            Montant : {formatFcfa(paiement.montantFcfa)}
          </p>
        )}
      </header>

      <section className="rounded-xl border border-brand-justice/10 bg-card p-6 text-sm shadow-sm">
        <dl className="space-y-3">
          <div>
            <dt className="text-muted-foreground">Référence obligatoire</dt>
            <dd className="font-mono text-lg font-semibold">{ref ?? "—"}</dd>
          </div>
          {titulaire && (
            <div>
              <dt className="text-muted-foreground">Titulaire</dt>
              <dd>{titulaire}</dd>
            </div>
          )}
          {bank && (
            <div>
              <dt className="text-muted-foreground">Banque</dt>
              <dd>{bank}</dd>
            </div>
          )}
          {rib && (
            <div>
              <dt className="text-muted-foreground">RIB / IBAN</dt>
              <dd className="font-mono">{rib}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-muted-foreground">
          Indiquez la référence dans le libellé du virement. L&apos;activation intervient
          après validation manuelle (sous 48 h ouvrées).
        </p>
      </section>

      {paiement && !paiement.preuveVirementUrl && (
        <section className="rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
          <h2 className="font-semibold">Preuve de virement</h2>
          <UploadPreuveForm paiementId={paiement.id} />
        </section>
      )}

      {paiement?.preuveVirementUrl && (
        <p className="text-sm text-emerald-700">
          Preuve reçue — en attente de validation par notre équipe.
        </p>
      )}
    </div>
  );
}
