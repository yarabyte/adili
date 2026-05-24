import Link from "next/link";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { GrandCabinetContactForm } from "@/components/onboarding/grand-cabinet-contact-form";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Grand Cabinet · Contact · Adili",
  description: "Offre sur mesure pour grands cabinets.",
};

export default function GrandCabinetPage() {
  return (
    <div className="min-h-screen bg-brand-parchment">
      <header className="border-b border-brand-justice/10 px-4 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <AdiliLogo href="/" height={32} />
          <Button asChild variant="ghost" size="sm">
            <Link href="/tarifs">← Tarifs</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="font-heading text-3xl font-bold text-brand-justice">
          Grand Cabinet
        </h1>
        <p className="mt-3 text-muted-foreground">
          Tarif négocié, quotas et utilisateurs sur mesure. Pas d&apos;inscription
          en ligne — notre équipe vous recontacte sous 48 h ouvrées.
        </p>
        <div className="mt-8 rounded-2xl border border-brand-justice/10 bg-card p-6 shadow-sm">
          <GrandCabinetContactForm />
        </div>
      </main>
    </div>
  );
}
