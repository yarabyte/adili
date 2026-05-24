import Link from "next/link";
import { AdiliLogo } from "@/components/brand/adili-logo";
import { EtudiantApplyForm } from "@/components/billing/etudiant-apply-form";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/profile";

export const metadata = {
  title: "Programme étudiant · Adili",
  description: "Accès gratuit Adili pour étudiants en droit — validation sur justificatif.",
};
export const dynamic = "force-dynamic";

export default async function EtudiantsPage() {
  const session = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-brand-parchment">
      <header className="border-b border-brand-justice/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <AdiliLogo href="/" height={32} />
          {session ? (
            <Button asChild size="sm">
              <Link href="/app">Mon espace</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/inscription?plan=etudiant">Créer un compte</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="font-heading text-3xl font-bold text-brand-justice">
          Programme étudiant
        </h1>
        <p className="mt-3 text-muted-foreground">
          Accès gratuit (30 requêtes IA / mois) après validation de votre statut
          — réponse sous 72 h.
        </p>

        {!session ? (
          <div className="mt-8 rounded-xl border border-brand-gold/30 bg-brand-gold/10 p-6">
            <p className="text-sm">
              <Link href="/connexion" className="font-medium underline">
                Connectez-vous
              </Link>{" "}
              ou{" "}
              <Link href="/inscription" className="font-medium underline">
                créez un compte
              </Link>{" "}
              pour soumettre votre demande.
            </p>
          </div>
        ) : (
          <section className="mt-8 rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
            <EtudiantApplyForm />
          </section>
        )}
      </main>
    </div>
  );
}
