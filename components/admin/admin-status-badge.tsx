import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  actif: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25",
  beta_gratuit: "bg-sky-500/15 text-sky-900 ring-sky-500/25",
  suspendu: "bg-red-500/15 text-red-900 ring-red-500/25",
  en_attente_paiement: "bg-amber-500/15 text-amber-950 ring-amber-500/25",
  annule: "bg-muted text-muted-foreground ring-border",
  en_attente: "bg-amber-500/15 text-amber-950 ring-amber-500/25",
  en_revue: "bg-violet-500/15 text-violet-900 ring-violet-500/25",
  nouveau: "bg-sky-500/15 text-sky-900 ring-sky-500/25",
  traite: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25",
};

const LABELS: Record<string, string> = {
  actif: "Actif",
  beta_gratuit: "Beta gratuit",
  suspendu: "Suspendu",
  en_attente_paiement: "En attente paiement",
  annule: "Annulé",
  en_attente: "En attente",
  en_revue: "En revue",
  nouveau: "Nouveau",
  traite: "Traité",
};

export function AdminStatusBadge({
  statut,
  className,
}: {
  statut: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        STYLES[statut] ?? "bg-muted text-muted-foreground ring-border",
        className
      )}
    >
      {LABELS[statut] ?? statut.replaceAll("_", " ")}
    </span>
  );
}
