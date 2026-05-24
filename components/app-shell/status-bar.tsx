import { BookOpenCheck, Library, ShieldCheck } from "lucide-react";

export type StatusBarProps = {
  sources: number;
  chunks: number;
};

export function StatusBar({ sources, chunks }: StatusBarProps) {
  return (
    <footer className="hidden h-7 shrink-0 items-center gap-4 border-t border-brand-gold/15 bg-brand-parchment-dark px-4 text-[11px] text-foreground/50 sm:flex">
      <span className="flex items-center gap-1.5 text-brand-sage">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-brand-sage" />
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-sage opacity-50" />
        </span>
        Adili connecté
      </span>
      <span className="flex items-center gap-1.5">
        <Library className="h-3 w-3" aria-hidden />
        <span className="tabular-nums">{sources}</span>
        &nbsp;textes juridiques indexés
      </span>
      <span className="hidden items-center gap-1.5 md:flex">
        <BookOpenCheck className="h-3 w-3" aria-hidden />
        <span className="tabular-nums">{chunks.toLocaleString("fr-FR")}</span>
        &nbsp;extraits sémantiques
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3" aria-hidden />
        Données privées · Cabinet cloisonné
      </span>
    </footer>
  );
}
