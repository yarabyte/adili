"use client";

import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardCopy,
  Lock,
  Loader2,
  RefreshCw,
  Sparkles,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { SynthesisErrorCode } from "@/hooks/use-synthesis-stream";
import { cn } from "@/lib/utils";

export type SynthesisPanelProps = {
  status: "idle" | "streaming" | "done" | "error";
  text: string;
  error: string | null;
  errorCode: SynthesisErrorCode | null;
  retryAfterMs: number | null;
  remaining: number | null;
  limit: number | null;
  monthlyRemaining?: number | null;
  monthlyLimit?: number | null;
  onCite: (n: number) => void;
  onRegenerate: () => void;
};

/**
 * Affiche la synthèse IA streamée : skeleton initial, markdown léger,
 * citations [N] cliquables, bouton copier + régénérer.
 */
export function SynthesisPanel({
  status,
  text,
  error,
  errorCode,
  retryAfterMs,
  remaining,
  limit,
  monthlyRemaining,
  monthlyLimit,
  onCite,
  onRegenerate,
}: SynthesisPanelProps) {
  const [copied, setCopied] = useState(false);

  const showSkeleton = status === "streaming" && text.length === 0;
  const showError = status === "error";
  const showMonthlyQuota =
    status !== "error" &&
    typeof monthlyRemaining === "number" &&
    typeof monthlyLimit === "number" &&
    monthlyLimit > 0;
  const showHourlyQuota =
    status !== "error" &&
    typeof remaining === "number" &&
    typeof limit === "number" &&
    limit > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard refusé : silencieux */
    }
  };

  return (
    <section
      aria-label="Synthèse juridique"
      className="relative overflow-hidden rounded-2xl border border-brand-justice/15 bg-gradient-to-br from-card via-card to-secondary/40 shadow-sm"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent"
        aria-hidden
      />
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-justice/10 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Synthèse juridique
            </h2>
            <p className="text-xs text-muted-foreground">
              {status === "streaming"
                ? "Adili rédige une synthèse à partir des extraits ci-dessous…"
                : "Générée à partir des extraits affichés — vérifiez chaque citation."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showMonthlyQuota && (
            <span
              className="hidden rounded-full border border-brand-justice/15 bg-secondary/60 px-2.5 py-1 text-[11px] font-medium tabular-nums text-brand-justice md:inline"
              title="Quota IA mensuel (plan)"
            >
              {monthlyRemaining}/{monthlyLimit} ce mois
            </span>
          )}
          {showHourlyQuota && (
            <span
              className="hidden rounded-full border border-brand-justice/10 bg-secondary/40 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground lg:inline"
              title="Limite horaire anti-abus"
            >
              {remaining}/{limit}/h
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={text.length === 0}
            className="text-muted-foreground hover:bg-brand-gold/10"
            aria-label="Copier la synthèse"
          >
            {copied ? (
              <ClipboardCheck className="h-4 w-4" aria-hidden />
            ) : (
              <ClipboardCopy className="h-4 w-4" aria-hidden />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copié" : "Copier"}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={
              status === "streaming" ||
              errorCode === "rate_limited" ||
              errorCode === "quota_exceeded" ||
              errorCode === "subscription_expired"
            }
            className="border-brand-justice/25"
            aria-label="Régénérer la synthèse"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                status === "streaming" && "animate-spin"
              )}
              aria-hidden
            />
            <span className="hidden sm:inline">Régénérer</span>
          </Button>
        </div>
      </header>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        {showSkeleton && <SkeletonLines />}

        {showError && (
          <SynthesisErrorBlock
            message={error ?? "Synthèse indisponible."}
            code={errorCode}
            retryAfterMs={retryAfterMs}
          />
        )}

        {!showSkeleton && !showError && text.length > 0 && (
          <SynthesisMarkdown
            text={text}
            onCite={onCite}
            streaming={status === "streaming"}
          />
        )}
      </div>
    </section>
  );
}

function SynthesisErrorBlock({
  message,
  code,
  retryAfterMs,
}: {
  message: string;
  code: SynthesisErrorCode | null;
  retryAfterMs: number | null;
}) {
  if (code === "unauthenticated") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-brand-justice/15 bg-brand-justice/5 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-justice" aria-hidden />
          <p className="leading-relaxed">{message}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" variant="outline" className="border-brand-justice/25">
            <Link href="/inscription">Créer un compte</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/connexion">Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (code === "quota_exceeded" || code === "subscription_expired") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm text-brand-ink sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
          <p className="leading-relaxed">{message}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="border-brand-justice/25">
            <Link href="/app/billing/packs">Pack 100 req.</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/app/billing">Facturation</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (code === "rate_limited") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm text-brand-ink">
        <div className="flex items-start gap-3">
          <Timer className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
          <p className="leading-relaxed">{message}</p>
        </div>
        {retryAfterMs != null && retryAfterMs > 0 && (
          <RetryCountdown retryAfterMs={retryAfterMs} />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
}

function RetryCountdown({ retryAfterMs }: { retryAfterMs: number }) {
  const [remaining, setRemaining] = useState(retryAfterMs);

  useEffect(() => {
    setRemaining(retryAfterMs);
    const target = Date.now() + retryAfterMs;
    const id = window.setInterval(() => {
      const left = target - Date.now();
      setRemaining(left > 0 ? left : 0);
      if (left <= 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryAfterMs]);

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  if (remaining <= 0) {
    return (
      <p className="pl-7 text-xs text-brand-ink/80">
        Le quota vient de se libérer — relancez la synthèse.
      </p>
    );
  }
  return (
    <p className="pl-7 text-xs tabular-nums text-brand-ink/80">
      Nouveau quota dans {minutes}&nbsp;min&nbsp;
      {seconds.toString().padStart(2, "0")}&nbsp;s.
    </p>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-brand-gold" aria-hidden />
        L&apos;assistant analyse les sources…
      </div>
      <div className="mt-2 space-y-2">
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

// ───────────────────────── Markdown léger + citations ─────────────────────────

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let currentList: string[] | null = null;
  let paraLines: string[] = [];

  const flushPara = () => {
    if (paraLines.length === 0) return;
    blocks.push({ kind: "paragraph", text: paraLines.join("\n").trim() });
    paraLines = [];
  };
  const flushList = () => {
    if (!currentList) return;
    blocks.push({ kind: "list", items: currentList });
    currentList = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const listMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    if (listMatch) {
      flushPara();
      currentList = currentList ?? [];
      currentList.push(listMatch[1]);
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    paraLines.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "cite"; ids: number[] };

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Ordre : bold (**...**) > italic (*...*) > citation ([1] / [1,2])
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*\n]+)\*)|(\[(\d+(?:\s*,\s*\d+)*)\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      tokens.push({ type: "text", value: text.slice(last, m.index) });
    }
    if (m[1]) tokens.push({ type: "bold", value: m[2] });
    else if (m[3]) tokens.push({ type: "italic", value: m[4] });
    else if (m[5]) {
      const ids = m[6]
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      tokens.push({ type: "cite", ids });
    }
    last = regex.lastIndex;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
}

function InlineRenderer({
  text,
  onCite,
}: {
  text: string;
  onCite: (n: number) => void;
}) {
  const tokens = useMemo(() => tokenizeInline(text), [text]);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.type === "text") {
          return <Fragment key={i}>{renderTextWithBreaks(tok.value)}</Fragment>;
        }
        if (tok.type === "bold") return <strong key={i}>{tok.value}</strong>;
        if (tok.type === "italic") return <em key={i}>{tok.value}</em>;
        return (
          <sup
            key={i}
            className="ml-0.5 inline-flex items-center align-super text-[0.72em] font-medium text-brand-justice"
          >
            {tok.ids.map((n, idx) => (
              <Fragment key={`${i}-${n}-${idx}`}>
                {idx > 0 && <span className="px-0.5">,</span>}
                <a
                  href={`#chunk-${n}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onCite(n);
                  }}
                  className="rounded px-0.5 text-brand-justice underline decoration-brand-gold decoration-2 underline-offset-2 transition-colors hover:bg-brand-gold/15 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Voir l'extrait ${n}`}
                >
                  [{n}]
                </a>
              </Fragment>
            ))}
          </sup>
        );
      })}
    </>
  );
}

function renderTextWithBreaks(value: string) {
  const parts = value.split("\n");
  return parts.flatMap((segment, i) =>
    i === 0
      ? [<Fragment key={`s-${i}`}>{segment}</Fragment>]
      : [<br key={`br-${i}`} />, <Fragment key={`s-${i}`}>{segment}</Fragment>]
  );
}

function SynthesisMarkdown({
  text,
  onCite,
  streaming,
}: {
  text: string;
  onCite: (n: number) => void;
  streaming: boolean;
}) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="prose-like space-y-4 text-[15px] leading-relaxed text-foreground">
      {blocks.map((block, i) => {
        if (block.kind === "list") {
          return (
            <ul key={i} className="ml-5 list-disc space-y-1.5 marker:text-brand-gold">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineRenderer text={item} onCite={onCite} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <InlineRenderer text={block.text} onCite={onCite} />
            {streaming && i === blocks.length - 1 && (
              <span
                className="ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] animate-pulse bg-brand-justice/60 align-middle"
                aria-hidden
              />
            )}
          </p>
        );
      })}
    </div>
  );
}
