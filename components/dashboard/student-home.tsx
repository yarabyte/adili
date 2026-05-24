import Link from "next/link";
import { FileText, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCorpusStatsLine, type CorpusBreakdown } from "@/lib/corpus/stats";

export function StudentHome({
  displayName,
  corpus,
}: {
  displayName: string;
  corpus: CorpusBreakdown;
}) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold text-brand-justice">
          Bonjour {displayName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accès étudiant validé — recherche juridique et comptes rendus. Les
          dossiers d&apos;affaires sont réservés aux cabinets professionnels.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/recherche"
          className="group rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <Search className="h-8 w-8 text-brand-justice" aria-hidden />
          <h2 className="mt-4 font-semibold">Recherche IA</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatCorpusStatsLine(corpus.total)}
          </p>
          <Button className="mt-4" size="sm" variant="outline">
            Ouvrir
          </Button>
        </Link>
        <div className="rounded-xl border border-dashed border-brand-justice/15 bg-card/60 p-6 opacity-90">
          <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 font-semibold text-muted-foreground">
            Comptes rendus
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Disponible depuis votre espace une fois les modules activés sur votre
            compte.
          </p>
        </div>
      </div>
    </div>
  );
}
