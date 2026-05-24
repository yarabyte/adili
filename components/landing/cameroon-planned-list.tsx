"use client";

import { ChevronDown, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CameroonCorpusEntry } from "@/lib/corpus/cameroon-roadmap";
import { CAMEROON_CORPUS_TARGET_LABEL } from "@/lib/corpus/cameroon-roadmap";

function PlannedCorpusItems({ items }: { items: readonly CameroonCorpusEntry[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item.title}
          className="flex items-start gap-2.5 rounded-lg border border-brand-justice/8 bg-background/60 px-3 py-2.5"
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-ink">{item.title}</p>
            {item.detail ? (
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                {item.detail}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

type CameroonPlannedListProps = {
  preview: readonly CameroonCorpusEntry[];
  more: readonly CameroonCorpusEntry[];
};

export function CameroonPlannedList({ preview, more }: CameroonPlannedListProps) {
  const hasMore = more.length > 0;

  return (
    <div>
      <PlannedCorpusItems items={preview} />

      {hasMore ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 w-full border-brand-gold/35 bg-brand-gold/5 text-brand-ink hover:bg-brand-gold/10"
            >
              <ChevronDown className="h-4 w-4 text-brand-gold" aria-hidden />
              Voir plus
              <span className="text-muted-foreground">
                ({more.length} texte{more.length > 1 ? "s" : ""})
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[min(85vh,640px)] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Feuille de route — droit camerounais</DialogTitle>
              <DialogDescription>
                Textes prévus d&apos;ici le {CAMEROON_CORPUS_TARGET_LABEL}, en
                complément de ceux déjà listés. Priorisation selon les retours
                des cabinets en bêta.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2">
              <PlannedCorpusItems items={more} />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
