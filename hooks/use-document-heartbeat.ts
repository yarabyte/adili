"use client";

import { useEffect } from "react";

/**
 * Lance un battement périodique tant que `enabled` est vrai et que le
 * document est visible (Page Visibility API). Stoppe automatiquement à
 * l'unmount, quand `enabled` repasse à faux, ou quand l'onglet est caché.
 *
 * @param onTick    Callback à exécuter à chaque tick (typiquement, un POST
 *                  vers l'API lock pour rafraîchir `verrou_acquis_at`).
 * @param intervalMs Période entre deux ticks. Défaut : 60 000 ms.
 * @param enabled    Active/désactive le battement.
 */
export function useDocumentHeartbeat(
  onTick: () => void,
  intervalMs: number = 60_000,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId != null) return;
      intervalId = setInterval(onTick, intervalMs);
    };
    const stop = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Tick immédiat en revenant sur l'onglet pour éviter un trou de
        // refresh, puis relancer le rythme.
        onTick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [onTick, intervalMs, enabled]);
}
