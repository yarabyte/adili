"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SearchHit } from "@/lib/search";

export type SynthesisStatus = "idle" | "streaming" | "done" | "error";

export type SynthesisErrorCode =
  | "unauthenticated"
  | "rate_limited"
  | "quota_exceeded"
  | "subscription_expired"
  | "unavailable"
  | "invalid";

export type SynthesisStreamState = {
  text: string;
  status: SynthesisStatus;
  error: string | null;
  errorCode: SynthesisErrorCode | null;
  retryAfterMs: number | null;
  /** Synthèses restantes sur la fenêtre horaire (anti-abus). */
  remaining: number | null;
  limit: number | null;
  /** Quota mensuel IA (plan). */
  monthlyRemaining: number | null;
  monthlyLimit: number | null;
  /** Force une nouvelle synthèse (annule la précédente). */
  regenerate: () => void;
};

type ServerEvent =
  | { type: "rate_limit"; remaining: number; limit: number }
  | {
      type: "quota";
      restantMensuel: number;
      quotaMensuel: number;
      packRestant: number;
      via: string;
    }
  | { type: "text"; content: string }
  | { type: "done" }
  | {
      type: "error";
      message: string;
      code?: SynthesisErrorCode;
      retryAfterMs?: number;
      details?: Record<string, unknown>;
    };

/**
 * Lance un appel SSE à `/api/search/synthesize` dès qu'une nouvelle requête + chunks
 * sont disponibles, et expose le texte streamé caractère par caractère.
 */
export function useSynthesisStream(
  query: string,
  chunks: SearchHit[]
): SynthesisStreamState {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<SynthesisStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<SynthesisErrorCode | null>(null);
  const [retryAfterMs, setRetryAfterMs] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [monthlyRemaining, setMonthlyRemaining] = useState<number | null>(null);
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const chunkSignature = useMemo(
    () => chunks.map((c) => c.chunkId).join("|"),
    [chunks]
  );

  const chunksRef = useRef(chunks);
  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  const regenerate = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!query.trim() || chunkSignature.length === 0) {
      setStatus("idle");
      setText("");
      setError(null);
      setErrorCode(null);
      setRetryAfterMs(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("streaming");
    setText("");
    setError(null);
    setErrorCode(null);
    setRetryAfterMs(null);

    let cancelled = false;
    const currentChunks = chunksRef.current;

    (async () => {
      try {
        const res = await fetch("/api/search/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, chunks: currentChunks }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Synthèse indisponible (HTTP ${res.status}).`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let separator: number;
          while ((separator = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, separator);
            buffer = buffer.slice(separator + 2);
            const line = rawEvent
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!line) continue;
            try {
              const event = JSON.parse(line.slice(6)) as ServerEvent;
              if (cancelled) return;
              if (event.type === "text") {
                setText((prev) => prev + event.content);
              } else if (event.type === "rate_limit") {
                setRemaining(event.remaining);
                setLimit(event.limit);
              } else if (event.type === "quota") {
                setMonthlyRemaining(event.restantMensuel);
                setMonthlyLimit(event.quotaMensuel);
              } else if (event.type === "done") {
                setStatus((s) => (s === "error" ? s : "done"));
              } else if (event.type === "error") {
                setError(event.message);
                setErrorCode(event.code ?? "unavailable");
                setRetryAfterMs(event.retryAfterMs ?? null);
                setStatus("error");
              }
            } catch {
              // Évènement malformé, on l'ignore silencieusement.
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        if ((err as { name?: string })?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query, chunkSignature, nonce]);

  return {
    text,
    status,
    error,
    errorCode,
    retryAfterMs,
    remaining,
    limit,
    monthlyRemaining,
    monthlyLimit,
    regenerate,
  };
}
