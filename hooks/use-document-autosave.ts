"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

/**
 * Sauvegarde automatique avec debounce, garde anti-concurrence et signal
 * d'état pour l'UI ("Enregistré il y a 2 s"). Le hook ne sait rien de
 * TipTap : on lui pousse `payload` (snapshot sérialisable) et il appelle
 * `save(payload)` au repos.
 */
export function useDocumentAutosave<TPayload>(opts: {
  enabled: boolean;
  delayMs?: number;
  save: (payload: TPayload) => Promise<{ ok?: boolean; error?: string }>;
}) {
  const { enabled, save } = opts;
  const delayMs = opts.delayMs ?? 1500;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<unknown> | null>(null);
  const pendingPayloadRef = useRef<TPayload | null>(null);

  const flush = useCallback(async () => {
    if (!enabled) return;
    const payload = pendingPayloadRef.current;
    if (payload == null) return;
    pendingPayloadRef.current = null;

    // Si une sauvegarde est déjà en cours, on attend qu'elle finisse et
    // on enchaîne avec le dernier payload (déjà reprogrammé via trigger).
    if (inFlightRef.current) {
      await inFlightRef.current;
    }

    setStatus("saving");
    setError(null);
    const promise = save(payload);
    inFlightRef.current = promise;
    try {
      const res = await promise;
      if (res.error) {
        setStatus("error");
        setError(res.error);
      } else {
        setStatus("saved");
        setSavedAt(new Date());
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      inFlightRef.current = null;
    }
  }, [enabled, save]);

  const trigger = useCallback(
    (payload: TPayload) => {
      pendingPayloadRef.current = payload;
      setStatus("dirty");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, delayMs);
    },
    [delayMs, flush]
  );

  // Flush manuel (Ctrl+S / bouton)
  const saveNow = useCallback(
    async (payload?: TPayload) => {
      if (payload != null) pendingPayloadRef.current = payload;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      await flush();
    },
    [flush]
  );

  // Flush automatique à l'unmount (best-effort)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, savedAt, error, trigger, saveNow };
}
