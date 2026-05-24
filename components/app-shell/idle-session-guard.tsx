"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const IDLE_MINUTES = Math.max(
  1,
  Number.parseInt(process.env.NEXT_PUBLIC_SESSION_IDLE_MINUTES ?? "20", 10) || 20
);
const COUNTDOWN_SECONDS = Math.max(
  10,
  Number.parseInt(
    process.env.NEXT_PUBLIC_SESSION_IDLE_COUNTDOWN_SECONDS ?? "60",
    10
  ) || 60
);

const IDLE_MS = IDLE_MINUTES * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

/** Dernière interaction utilisateur (partagé avec le calcul du temps restant). */
let lastActivityAt = Date.now();

function remainingSeconds(): number {
  const deadline = lastActivityAt + IDLE_MS;
  const overdueSec = Math.max(0, Math.floor((Date.now() - deadline) / 1000));
  return Math.max(0, COUNTDOWN_SECONDS - overdueSec);
}

/**
 * Après une période sans interaction, affiche une fenêtre avec compte à
 * rebours avant déconnexion automatique. « Rester connecté » réinitialise
 * le minuteur d'inactivité.
 */
export function IdleSessionGuard() {
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  openRef.current = open;

  const syncGlobalActivity = useCallback(() => {
    const t = Date.now();
    lastActivityRef.current = t;
    lastActivityAt = t;
  }, []);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const armIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      setOpen(true);
    }, IDLE_MS);
  }, [clearIdleTimer]);

  const stayConnected = useCallback(() => {
    setOpen(false);
    syncGlobalActivity();
    armIdleTimer();
  }, [armIdleTimer, syncGlobalActivity]);

  const onActivity = useCallback(() => {
    if (openRef.current) {
      stayConnected();
      return;
    }
    syncGlobalActivity();
    armIdleTimer();
  }, [armIdleTimer, stayConnected, syncGlobalActivity]);

  useEffect(() => {
    syncGlobalActivity();
    armIdleTimer();

    const throttled = (() => {
      let t: ReturnType<typeof setTimeout> | null = null;
      return () => {
        if (t) return;
        t = setTimeout(() => {
          t = null;
          onActivity();
        }, 1000);
      };
    })();

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, throttled, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > IDLE_MS + COUNTDOWN_SECONDS * 1000) {
        void signOut();
        return;
      }
      if (elapsed > IDLE_MS && !openRef.current) {
        setOpen(true);
        return;
      }
      if (!openRef.current) armIdleTimer();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearIdleTimer();
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, throttled);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [armIdleTimer, clearIdleTimer, onActivity, syncGlobalActivity]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let left = remainingSeconds();
    if (left <= 0) {
      void signOut();
      return;
    }
    setSecondsLeft(left);
    const id = setInterval(() => {
      left -= 1;
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(id);
        void signOut();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current?.querySelector<HTMLButtonElement>(
      "[data-idle-primary]"
    );
    el?.focus();
  }, [open]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-ink/55 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-session-title"
        aria-describedby="idle-session-desc"
        className="w-full max-w-md rounded-2xl border border-brand-gold/30 bg-card p-6 shadow-2xl"
      >
        <p
          id="idle-session-title"
          className="font-heading text-2xl font-semibold text-brand-ink"
        >
          Déconnexion imminente
        </p>
        <p
          id="idle-session-desc"
          className="mt-2 text-sm leading-relaxed text-muted-foreground"
        >
          Aucune activité depuis {IDLE_MINUTES} minute
          {IDLE_MINUTES > 1 ? "s" : ""}. Pour la sécurité de votre cabinet, la
          session sera fermée automatiquement.
        </p>
        <div className="mt-6 flex flex-col items-center rounded-xl border border-brand-justice/10 bg-brand-parchment-dark/50 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-justice/70">
            Temps restant
          </p>
          <p
            className="mt-1 font-heading text-5xl font-semibold tabular-nums tracking-tight text-brand-justice"
            aria-live="polite"
          >
            {mm}:{ss}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-brand-justice/25 sm:order-1"
            onClick={() => void signOut()}
          >
            Se déconnecter maintenant
          </Button>
          <Button
            type="button"
            className="sm:order-2"
            data-idle-primary
            onClick={stayConnected}
          >
            Rester connecté
          </Button>
        </div>
      </div>
    </div>
  );
}
