"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type CrSaveQueueContextValue = {
  /** Exécute les sauvegardes une par une (évite les UPDATE concurrents). */
  enqueue: <T>(fn: () => Promise<T>) => Promise<T>;
  formSaving: boolean;
  setFormSaving: (v: boolean) => void;
};

const CrSaveQueueContext = createContext<CrSaveQueueContextValue | null>(null);

export function CrSaveQueueProvider({ children }: { children: ReactNode }) {
  const tailRef = useRef<Promise<unknown>>(Promise.resolve());
  const [formSaving, setFormSaving] = useState(false);

  const enqueue = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const run = tailRef.current.then(fn, fn) as Promise<T>;
    tailRef.current = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }, []);

  const value = useMemo(
    () => ({ enqueue, formSaving, setFormSaving }),
    [enqueue, formSaving]
  );

  return (
    <CrSaveQueueContext.Provider value={value}>
      {children}
    </CrSaveQueueContext.Provider>
  );
}

const fallbackQueue: CrSaveQueueContextValue = {
  enqueue: (fn) => fn(),
  formSaving: false,
  setFormSaving: () => {},
};

export function useCrSaveQueue(): CrSaveQueueContextValue {
  return useContext(CrSaveQueueContext) ?? fallbackQueue;
}
