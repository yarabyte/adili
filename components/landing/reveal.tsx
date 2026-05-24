"use client";

import { createElement, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type RevealTag = "div" | "li" | "section" | "article" | "span";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Délai d'entrée en ms (utile pour staggerer une grille). */
  delay?: number;
  /** Direction d'entrée. */
  direction?: "up" | "down" | "left" | "right" | "none";
  /** Amplitude de translation. */
  amount?: "default" | "sm";
  /** Seuil d'intersection (fraction de l'élément visible avant déclenchement). */
  threshold?: number;
  /** Tag HTML rendu (défaut : div). Indispensable pour rester valide en `<ul>`. */
  as?: RevealTag;
};

const HIDDEN_TRANSFORM: Record<RevealProps["direction"] & string, string> = {
  up: "translate-y-6",
  down: "-translate-y-6",
  left: "translate-x-6",
  right: "-translate-x-6",
  none: "",
};

const HIDDEN_TRANSFORM_SM: Record<RevealProps["direction"] & string, string> = {
  up: "translate-y-3",
  down: "-translate-y-3",
  left: "translate-x-3",
  right: "-translate-x-3",
  none: "",
};

/**
 * Apparition douce au scroll : fade + légère translation, déclenchée une seule
 * fois quand le bloc entre dans le viewport. Respecte `prefers-reduced-motion`
 * (l'élément apparaît instantanément à 100 % d'opacité).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  amount = "default",
  threshold = 0.12,
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);

  const hiddenTransform =
    amount === "sm"
      ? HIDDEN_TRANSFORM_SM[direction]
      : HIDDEN_TRANSFORM[direction];

  return createElement(
    as,
    {
      ref,
      style: { transitionDelay: visible ? `${delay}ms` : "0ms" },
      className: cn(
        "transform-gpu transition-[opacity,transform] duration-[700ms] ease-out motion-reduce:transition-none",
        visible
          ? "translate-x-0 translate-y-0 opacity-100"
          : `opacity-0 ${hiddenTransform}`,
        className
      ),
    },
    children
  );
}
