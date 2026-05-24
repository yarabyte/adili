import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PACK_IA_100 } from "@/lib/billing/constants";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getQuotaSummaryForUser } from "@/lib/quotas/check-and-consume";

import { PackPurchaseButton } from "./pack-purchase-button";

export const metadata = { title: "Packs IA · Adili" };
export const dynamic = "force-dynamic";

export default async function BillingPacksPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");

  const quota = await getQuotaSummaryForUser(session.user.id);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
      >
        <Link href="/app/billing">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Facturation
        </Link>
      </Button>

      <header>
        <h1 className="font-heading text-2xl font-semibold text-brand-justice">
          Pack {PACK_IA_100.quantite} requêtes IA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PACK_IA_100.prixFcfa.toLocaleString("fr-FR")} FCFA — valable{" "}
          {PACK_IA_100.validiteJours} jours après activation.
        </p>
      </header>

      <section className="rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Utilisé lorsque votre quota mensuel et le dépassement gratuit sont
          épuisés. Les requêtes du pack sont consommées en priorité FIFO sur
          expiration.
        </p>
        {quota && (
          <p className="mt-3 text-sm">
            Restant ce mois :{" "}
            <strong>
              {quota.restantMensuel}
              {quota.packRestant > 0 ? ` (+${quota.packRestant} pack)` : ""}
            </strong>
          </p>
        )}
        <div className="mt-6">
          <PackPurchaseButton />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Paiement Mobile Money (Orange / MTN) via CinetPay — bientôt en
          production. En local :{" "}
          <code className="rounded bg-muted px-1">BILLING_DEV_GRANT_PACKS=true</code>
        </p>
      </section>
    </div>
  );
}
