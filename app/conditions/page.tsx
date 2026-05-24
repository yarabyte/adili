import Link from "next/link";

export const metadata = {
  title: "Conditions générales d'utilisation · Adili",
};

export default function ConditionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
          Retour à l&apos;accueil
        </Link>
      </p>
      <h1 className="mt-6 font-heading text-3xl font-semibold text-brand-ink">
        Conditions générales d&apos;utilisation
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Ce document est en cours de rédaction. Il précisera les règles
        d&apos;utilisation du service Adili, les obligations des utilisateurs
        et les limites de responsabilité. Pour toute question, contactez le
        support de votre cabinet ou l&apos;équipe produit.
      </p>
    </div>
  );
}
