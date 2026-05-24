"use client";

import { useState, useTransition } from "react";
import {
  CircleAlert,
  CircleCheck,
  Hand,
  Loader2,
  Lock,
  PencilLine,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DocumentLockState } from "@/hooks/use-document-lock";
import { requestLockHandover } from "@/app/actions/documents";

const MINUTE_MS = 60_000;

function elapsedMinutes(since: Date | undefined): number {
  if (!since) return 0;
  return Math.max(0, Math.floor((Date.now() - since.getTime()) / MINUTE_MS));
}

function holderLabel(state: DocumentLockState): string {
  const h = state.holder;
  if (!h) return "un autre utilisateur";
  return h.fullName?.trim() || h.email;
}

export function LockBanner({
  documentId,
  state,
}: {
  documentId: string;
  state: DocumentLockState;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    msg: string;
  } | null>(null);

  function askForHandover() {
    setFeedback(null);
    startTransition(async () => {
      const res = await requestLockHandover(documentId);
      if (res.error) setFeedback({ tone: "error", msg: res.error });
      else if (res.message) setFeedback({ tone: "success", msg: res.message });
    });
  }

  if (state.status === "loading") {
    return (
      <Pill tone="neutral">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Acquisition du verrou…
      </Pill>
    );
  }

  if (state.status === "owned") {
    return (
      <Pill tone="success">
        <PencilLine className="h-3.5 w-3.5" aria-hidden />
        Vous éditez ce document
        <span className="ml-1 hidden text-emerald-700/80 sm:inline">
          · Verrou actif, libéré automatiquement après 2 min
          d&apos;inactivité.
        </span>
      </Pill>
    );
  }

  if (state.status === "forbidden") {
    return (
      <Banner tone="muted">
        <Lock className="h-4 w-4 flex-shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">Lecture seule</p>
          <p className="text-[12.5px] text-muted-foreground">
            Votre rôle sur cette affaire ne permet pas d&apos;éditer ce
            document.
          </p>
        </div>
      </Banner>
    );
  }

  if (state.status === "error") {
    return (
      <Banner tone="error">
        <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">Connexion au verrou perdue</p>
          <p className="text-[12.5px] opacity-80">
            {state.error ?? "Le navigateur n'a pas pu joindre le serveur."}
          </p>
        </div>
      </Banner>
    );
  }

  if (state.status === "locked-by-other") {
    const minutes = elapsedMinutes(state.since);
    const label = holderLabel(state);

    return (
      <Banner tone="warning">
        <Lock className="h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-medium">
            <span className="text-foreground">Maître {label}</span> édite ce
            document
            {minutes > 0 && (
              <span className="ml-1 text-muted-foreground">
                depuis {minutes} min
              </span>
            )}
            .
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            Vous pouvez consulter et commenter. Si l&apos;utilisateur est
            inactif, le verrou se libère automatiquement après 2 min — vous
            reprendrez la main sans intervention.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-500/30 bg-card text-amber-900 hover:bg-amber-50"
              onClick={askForHandover}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Hand className="h-4 w-4" aria-hidden />
              )}
              Demander la main
            </Button>
            {feedback && (
              <span
                role="status"
                className={
                  "inline-flex items-center gap-1 text-[12px] " +
                  (feedback.tone === "success"
                    ? "text-emerald-700"
                    : "text-destructive")
                }
              >
                {feedback.tone === "success" ? (
                  <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                )}
                {feedback.msg}
              </span>
            )}
          </div>
        </div>
      </Banner>
    );
  }

  // status === "idle" : pas de verrou demandé, rien à afficher.
  return null;
}

// ─── Petits primitifs UI internes ─────────────────────────────────

type Tone = "neutral" | "success" | "warning" | "error" | "muted";

function Pill({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  const TONE: Record<Tone, string> = {
    neutral: "border-brand-justice/20 bg-card text-muted-foreground",
    success:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
    warning:
      "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    muted: "border-brand-justice/15 bg-brand-parchment-dark/30 text-muted-foreground",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium " +
        TONE[tone]
      }
    >
      {children}
    </span>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  const TONE: Record<Tone, string> = {
    neutral: "border-brand-justice/15 bg-card text-foreground",
    success:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-foreground",
    error: "border-destructive/30 bg-destructive/5 text-destructive",
    muted: "border-brand-justice/15 bg-brand-parchment-dark/30 text-foreground",
  };
  return (
    <div
      className={
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm " + TONE[tone]
      }
    >
      {children}
    </div>
  );
}

/**
 * Petit indicateur de connexion (option) — peut être placé à côté du
 * verrou pour signaler en un coup d'œil que les heartbeats passent.
 */
export function LockHeartbeatIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={
        "inline-flex h-2 w-2 rounded-full " +
        (active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")
      }
      title={active ? "Heartbeat actif" : "Heartbeat en pause"}
      aria-label={active ? "Heartbeat actif" : "Heartbeat en pause"}
    >
      <Wifi className="sr-only" aria-hidden />
    </span>
  );
}
