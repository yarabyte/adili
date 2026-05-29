"use client";

import { Clock } from "lucide-react";
import type { CameroonCorpusEntry } from "@/lib/corpus/cameroon-roadmap";

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
  const allItems = [...preview, ...more];

  return (
    <PlannedCorpusItems items={allItems} />
  );
}
