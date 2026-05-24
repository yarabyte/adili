"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDocumentHeartbeat } from "@/hooks/use-document-heartbeat";

/**
 * État du verrou d'édition d'un document, vu côté client.
 *
 *   loading           — appel initial en cours
 *   owned             — l'utilisateur courant détient le verrou
 *   locked-by-other   — un autre utilisateur édite (lecture seule)
 *   forbidden         — l'utilisateur n'a pas le droit d'éditer
 *   error             — échec réseau / serveur
 *   idle              — désactivé (utile pour conditionner l'appel)
 */
export type LockStatus =
  | "loading"
  | "owned"
  | "locked-by-other"
  | "forbidden"
  | "error"
  | "idle";

export type LockHolder = {
  userId: string;
  fullName: string | null;
  email: string;
};

export type DocumentLockState = {
  status: LockStatus;
  /** Présent si `status === "owned"` */
  acquiredAt?: Date;
  /** Présent si `status === "locked-by-other"` */
  holder?: LockHolder;
  since?: Date;
  /** Présent si `status === "error"` */
  error?: string;
};

/**
 * Cadence des appels /lock côté client :
 *  - `OWNED_MS`   : heartbeat normal tant qu'on détient le verrou.
 *    Doit rester < `LOCK_TIMEOUT_MS` côté serveur (2 min) avec une marge
 *    confortable. 60 s = 1 heartbeat manqué → encore safe pendant 60 s.
 *  - `WAITING_MS` : polling court quand le verrou est détenu par autrui.
 *    Permet de récupérer la main rapidement dès qu'il devient stale
 *    (typiquement : l'utilisateur précédent s'est déconnecté sans
 *    libérer). 20 s = on prend la main au pire 20 s après l'expiration
 *    serveur (≈ 2 min 20 s après la dernière respiration de l'autre).
 */
const OWNED_HEARTBEAT_MS = 60_000;
const WAITING_POLL_MS = 20_000;

export function useDocumentLock(
  documentId: string | null | undefined,
  options: { enabled?: boolean } = {}
): {
  state: DocumentLockState;
  refresh: () => Promise<void>;
  release: () => Promise<void>;
} {
  const enabled = options.enabled !== false && !!documentId;
  const [state, setState] = useState<DocumentLockState>({
    status: enabled ? "loading" : "idle",
  });
  const mountedRef = useRef(true);

  // POST /lock — acquérir OU heartbeat (le serveur déduplique).
  const callAcquire = useCallback(async (): Promise<void> => {
    if (!documentId) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/lock`, {
        method: "POST",
      });
      if (!mountedRef.current) return;

      if (res.status === 423) {
        const body = (await res.json().catch(() => null)) as
          | { holder?: LockHolder; since?: string }
          | null;
        setState({
          status: "locked-by-other",
          holder: body?.holder,
          since: body?.since ? new Date(body.since) : undefined,
        });
        return;
      }
      if (res.status === 403) {
        setState({ status: "forbidden" });
        return;
      }
      if (!res.ok) {
        setState({
          status: "error",
          error: `Échec d'acquisition du verrou (HTTP ${res.status}).`,
        });
        return;
      }
      const data = (await res.json()) as {
        acquiredAt?: string;
      };
      setState({
        status: "owned",
        acquiredAt: data.acquiredAt ? new Date(data.acquiredAt) : new Date(),
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setState({
        status: "error",
        error: err instanceof Error ? err.message : "Erreur réseau.",
      });
    }
  }, [documentId]);

  // DELETE /lock — libère explicitement (utilisé à l'unmount React).
  const callRelease = useCallback(async (): Promise<void> => {
    if (!documentId) return;
    try {
      await fetch(`/api/documents/${documentId}/lock`, {
        method: "DELETE",
        keepalive: true,
      });
    } catch {
      /* best-effort */
    }
  }, [documentId]);

  // Initial acquire + beforeunload release via sendBeacon.
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || !documentId) return;

    setState({ status: "loading" });
    void callAcquire();

    const onBeforeUnload = () => {
      // sendBeacon est asynchrone et fire-and-forget — parfait pour
      // libérer le verrou avant la fermeture de l'onglet.
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/documents/${documentId}/unlock`);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Pour l'unmount "soft" (navigation interne), DELETE fonctionne et
      // `keepalive: true` permet de ne pas annuler la requête.
      void callRelease();
    };
  }, [documentId, enabled, callAcquire, callRelease]);

  // Battement adapté à l'état :
  //  - `owned`           → heartbeat lent (60 s) pour ne pas saturer
  //                        inutilement le serveur.
  //  - `locked-by-other` → polling court (20 s) pour reprendre la main
  //                        dès que le détenteur devient inactif.
  const heartbeatEnabled = enabled && state.status === "owned";
  const waitingPollEnabled = enabled && state.status === "locked-by-other";
  useDocumentHeartbeat(callAcquire, OWNED_HEARTBEAT_MS, heartbeatEnabled);
  useDocumentHeartbeat(callAcquire, WAITING_POLL_MS, waitingPollEnabled);

  return {
    state,
    refresh: callAcquire,
    release: callRelease,
  };
}
