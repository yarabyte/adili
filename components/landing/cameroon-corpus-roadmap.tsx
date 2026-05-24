import { Check, Clock, FileText } from "lucide-react";

import { CameroonPlannedList } from "@/components/landing/cameroon-planned-list";
import {
  CAMEROON_CORPUS_AVAILABLE,
  CAMEROON_CORPUS_TARGET_LABEL,
  cameroonCorpusProgress,
  splitCameroonPlannedCorpus,
} from "@/lib/corpus/cameroon-roadmap";
import { formatCorpusStatsLine, type CorpusStats } from "@/lib/corpus/stats";
import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

type CameroonCorpusRoadmapProps = {
  cameroonStats: CorpusStats;
  className?: string;
};

function CorpusList({
  items,
  variant,
}: {
  items: readonly { title: string; detail?: string }[];
  variant: "live" | "planned";
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item.title}
          className="flex items-start gap-2.5 rounded-lg border border-brand-justice/8 bg-background/60 px-3 py-2.5"
        >
          {variant === "live" ? (
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-sage"
              aria-hidden
            />
          ) : (
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold"
              aria-hidden
            />
          )}
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

export function CameroonCorpusRoadmap({
  cameroonStats,
  className,
}: CameroonCorpusRoadmapProps) {
  const { available, planned, pctAvailable } = cameroonCorpusProgress();
  const { preview: plannedPreview, more: plannedMore } = splitCameroonPlannedCorpus();
  const indexed = cameroonStats.sources > 0;

  return (
    <section
      id="corpus-cameroun"
      className={cn(
        "scroll-mt-20 border-b border-brand-justice/10 bg-card/40 py-14 sm:py-20",
        className
      )}
      aria-labelledby="cameroon-corpus-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
              Droit national · Cameroun
            </p>
            <h2
              id="cameroon-corpus-heading"
              className="mt-2 font-heading text-2xl font-semibold text-brand-ink sm:text-3xl"
            >
              Corpus camerounais : disponible et à venir
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              En complément des actes uniformes OHADA, Adili indexe les textes
              nationaux applicables devant les juridictions camerounaises — avec
              la même recherche sémantique et les mêmes citations vérifiables.
            </p>
            {indexed ? (
              <p className="mt-2 text-sm font-medium tabular-nums text-brand-justice">
                {formatCorpusStatsLine(cameroonStats)} — droit camerounais
              </p>
            ) : null}
          </div>
        </Reveal>

        <Reveal delay={80} className="mx-auto mt-8 max-w-2xl">
          <div className="rounded-xl border border-brand-justice/10 bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-brand-ink">
                {available} texte{available > 1 ? "s" : ""} disponible
                {available > 1 ? "s" : ""}
                <span className="text-muted-foreground">
                  {" "}
                  · {planned} prévu{planned > 1 ? "s" : ""} d&apos;ici le{" "}
                  {CAMEROON_CORPUS_TARGET_LABEL}
                </span>
              </span>
              <span className="text-xs font-semibold tabular-nums text-brand-justice">
                {pctAvailable} %
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-brand-justice/10"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-brand-sage transition-all duration-500"
                style={{ width: `${pctAvailable}%` }}
              />
            </div>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <Reveal delay={120}>
            <div className="h-full rounded-2xl border border-brand-sage/25 bg-card p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-sage/15 text-brand-sage">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <span className="rounded-full border border-brand-sage/30 bg-brand-sage/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-sage">
                    Disponible
                  </span>
                  <h3 className="mt-1 font-heading text-lg font-semibold text-brand-ink">
                    Recherche active
                  </h3>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                Textes déjà intégrés au corpus national — interrogeables depuis{" "}
                <strong className="font-medium text-brand-ink">Recherche corpus</strong>
                .
              </p>
              <div className="mt-5">
                <CorpusList items={CAMEROON_CORPUS_AVAILABLE} variant="live" />
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="h-full rounded-2xl border border-brand-gold/30 bg-card p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gold/15 text-brand-gold">
                  <Clock className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <span className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-ink">
                    À venir
                  </span>
                  <h3 className="mt-1 font-heading text-lg font-semibold text-brand-ink">
                    Reste à faire d&apos;ici le {CAMEROON_CORPUS_TARGET_LABEL}
                  </h3>
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                Prochaines publications indexées — priorisation selon les retours
                des cabinets en bêta et la disponibilité des textes officiels.
              </p>
              <div className="mt-5">
                <CameroonPlannedList preview={plannedPreview} more={plannedMore} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
