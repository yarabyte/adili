"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const TICK_MS = 120;
const START = 14;
const CAP = 88;

function isInternalNavLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  if (href.startsWith("http") && !href.startsWith(window.location.origin)) {
    return false;
  }

  try {
    const next = new URL(href, window.location.href);
    const cur = new URL(window.location.href);
    if (next.origin !== cur.origin) return false;
    if (next.pathname === cur.pathname && next.search === cur.search) {
      return Boolean(next.hash);
    }
    return true;
  } catch {
    return false;
  }
}

function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeKeyRef = useRef(routeKey);
  const pendingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimers();
    pendingRef.current = true;
    setVisible(true);
    setProgress(START);

    tickRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= CAP) return p;
        const step = Math.max(1.5, (CAP - p) * 0.12);
        return Math.min(CAP, p + step);
      });
    }, TICK_MS);
  }, [clearTimers]);

  const complete = useCallback(() => {
    if (!pendingRef.current) return;
    clearTimers();
    pendingRef.current = false;
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 320);
  }, [clearTimers]);

  useEffect(() => {
    if (routeKeyRef.current !== routeKey) {
      routeKeyRef.current = routeKey;
      if (pendingRef.current || visible) {
        complete();
      }
    }
  }, [routeKey, complete, visible]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || !isInternalNavLink(anchor)) return;

      start();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!visible && progress === 0) return null;

  return (
  <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px]"
      role="progressbar"
      aria-hidden
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        className="h-full origin-left rounded-r-full bg-gradient-to-r from-brand-justice via-brand-gold to-brand-gold-soft shadow-[0_0_10px_hsl(var(--brand-gold)/0.35)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBar />
    </Suspense>
  );
}
