import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité · Adili",
};

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
          Retour à l&apos;accueil
        </Link>
      </p>
      <h1 className="mt-6 font-heading text-3xl font-semibold text-brand-ink">
        Politique de confidentialité
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Ce document est en cours de rédaction. Il décrira le traitement des
        données personnelles, les finalités, la durée de conservation et vos
        droits (accès, rectification, suppression, etc.) conformément au droit
        applicable.
      </p>
    </div>
  );
}
