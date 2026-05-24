"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Sparkles,
  Star,
  ThumbsUp,
} from "lucide-react";

import { cn } from "@/lib/utils";

const AUTO_MS = 6500;

const CHROME_TITLES = ["adili.app · recherche", "adili.app · affaires"] as const;

export function HeroProductMockup() {
  const [active, setActive] = useState(0);
  const [pauseAuto, setPauseAuto] = useState(false);

  const go = useCallback((dir: -1 | 1) => {
    setActive((i) => {
      const n = 2;
      return (i + dir + n) % n;
    });
  }, []);

  useEffect(() => {
    if (pauseAuto) return undefined;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      go(1);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [pauseAuto, go]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPauseAuto(true)}
      onMouseLeave={() => setPauseAuto(false)}
    >
      <div
        className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-brand-gold/20 via-transparent to-brand-justice/15 blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-brand-justice/15 bg-card shadow-2xl">
        <div className="flex h-9 items-center gap-1.5 border-b border-brand-justice/10 bg-brand-parchment-dark/60 px-3">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-crimson/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-gold/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-sage/60" />
          <span className="ml-3 truncate text-[11px] font-medium tracking-wide text-muted-foreground transition-opacity duration-300">
            {CHROME_TITLES[active]}
          </span>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center gap-2 rounded-lg border border-brand-justice/15 bg-brand-parchment/60 px-3 py-2.5">
            <FileSearch className="h-4 w-4 shrink-0 text-brand-justice/60" aria-hidden />
            <p className="min-w-0 truncate text-[13px] text-foreground/80">
              conditions de validité d&apos;une convention d&apos;arbitrage OHADA
            </p>
            <span className="ml-auto shrink-0 rounded bg-brand-justice px-2 py-0.5 text-[10px] font-medium text-white">
              ↵
            </span>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-lg">
              <div
                className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(-${active * 100}%)` }}
              >
                <div className="w-full shrink-0 px-0.5 sm:px-0">
                  <article className="overflow-hidden rounded-lg border border-brand-gold/40 bg-card shadow-sm">
                    <div className="border-l-4 border-brand-gold pl-3 pr-3 py-3 sm:py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-justice">
                            OHADA · Acte Uniforme sur l&apos;Arbitrage
                          </p>
                          <p className="mt-0.5 truncate text-[13px] font-semibold text-brand-ink">
                            Art. 3 AUA — Forme de la convention
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="rounded-full border border-brand-gold/35 bg-brand-gold/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-brand-ink">
                            Pertinence&nbsp;91&nbsp;%
                          </span>
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-brand-sage/40 bg-brand-sage/10 px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums text-brand-sage">
                            <ThumbsUp className="h-2.5 w-2.5" aria-hidden />
                            +12&nbsp;%
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/75">
                        La convention d&apos;arbitrage doit être établie soit par
                        écrit, soit par tout autre moyen permettant d&apos;en
                        administrer la preuve…
                      </p>
                      <div className="mt-2 flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={
                              "h-3 w-3 " +
                              (n <= 4
                                ? "fill-brand-gold text-brand-gold"
                                : "text-brand-justice/20")
                            }
                            aria-hidden
                          />
                        ))}
                        <span className="ml-1.5 text-[10px] text-muted-foreground">
                          4.3/5 · 9 avis
                        </span>
                      </div>
                    </div>
                  </article>
                </div>

                <div className="w-full shrink-0 px-0.5 sm:px-0">
                  <article className="overflow-hidden rounded-lg border border-brand-justice/25 bg-card shadow-sm">
                    <div className="border-l-4 border-brand-justice pl-3 pr-3 py-3 sm:py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-justice/10 text-brand-justice">
                            <Briefcase className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-justice">
                              Module affaires · Cabinet
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[12px] font-semibold text-brand-ink">
                              2026-042 · SARL Kotto c/ Crédit LC
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                            Ouvert
                          </span>
                          <span className="rounded-full border border-brand-justice/20 bg-brand-parchment-dark/50 px-2 py-0.5 text-[10px] font-medium text-brand-ink">
                            Conclusions
                          </span>
                        </div>
                      </div>
                      <p className="mt-2.5 text-[12.5px] leading-relaxed text-foreground/75">
                        Pièce en rédaction · citations{" "}
                        <span className="rounded bg-brand-gold/20 px-1 font-semibold text-brand-ink">
                          Art. 132 AUPC
                        </span>{" "}
                        et{" "}
                        <span className="rounded bg-brand-gold/20 px-1 font-semibold text-brand-ink">
                          Art. 36 AUDA
                        </span>{" "}
                        insérées depuis le corpus. Soumission au responsable
                        pour validation.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span className="rounded-md border border-brand-justice/12 bg-brand-parchment-dark/40 px-2 py-0.5">
                          Membres
                        </span>
                        <span className="rounded-md border border-brand-justice/12 bg-brand-parchment-dark/40 px-2 py-0.5">
                          Confidentialité
                        </span>
                        <span className="rounded-md border border-brand-justice/12 bg-brand-parchment-dark/40 px-2 py-0.5">
                          Export PDF
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 sm:px-0">
              <button
                type="button"
                onClick={() => go(-1)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-justice/15 bg-card text-brand-justice shadow-sm transition-colors hover:bg-brand-parchment-dark/50"
                aria-label="Slide précédent"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <div
                className="flex justify-center gap-1.5"
                role="tablist"
                aria-label="Changer de carte"
              >
                {[0, 1].map((i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={active === i}
                    aria-label={
                      i === 0
                        ? "Voir la carte recherche corpus"
                        : "Voir la carte dossiers et affaires"
                    }
                    onClick={() => setActive(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      active === i
                        ? "w-7 bg-brand-justice"
                        : "w-1.5 bg-brand-justice/25 hover:bg-brand-justice/45"
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(1)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-justice/15 bg-card text-brand-justice shadow-sm transition-colors hover:bg-brand-parchment-dark/50"
                aria-label="Slide suivant"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-brand-justice/15 bg-gradient-to-br from-brand-justice/[0.04] to-brand-gold/[0.05] p-3.5 sm:p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-justice">
                Synthèse juridique IA · sourcée
              </p>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/85">
              La validité d&apos;une convention d&apos;arbitrage en droit OHADA
              repose sur deux conditions cumulatives&nbsp;: la capacité des
              parties{" "}
              <span className="cursor-pointer rounded bg-brand-gold/20 px-1 text-[11px] font-semibold text-brand-ink">
                [1]
              </span>{" "}
              et un consentement libre exprimé par écrit ou par tout autre moyen
              probant{" "}
              <span className="cursor-pointer rounded bg-brand-gold/20 px-1 text-[11px] font-semibold text-brand-ink">
                [2]
              </span>
              …
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
