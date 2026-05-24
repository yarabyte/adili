"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type QuotaPayload = {
  consomme: number;
  quotaMensuel: number;
  restantMensuel: number;
  packRestant: number;
  restantTotal: number;
};

export function QuotaIndicator({
  className,
  linkToBilling = true,
}: {
  className?: string;
  /** Lien vers `/app/billing` (propriétaire du cabinet uniquement). */
  linkToBilling?: boolean;
}) {
  const [data, setData] = useState<QuotaPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/quota/current");
        if (!res.ok) return;
        const json = (await res.json()) as QuotaPayload;
        if (!cancelled) setData(json);
      } catch {
        /* silencieux */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const pct =
    data.quotaMensuel > 0
      ? Math.min(100, Math.round((data.consomme / data.quotaMensuel) * 100))
      : 0;
  const warn = pct >= 80;
  const critical = data.restantTotal <= 0;

  const badgeClass = cn(
    "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums sm:inline-flex",
    critical
      ? "border-destructive/50 bg-destructive/20 text-red-100"
      : warn
        ? "border-brand-gold/50 bg-brand-gold/15 text-brand-gold-soft"
        : "border-white/20 bg-white/10 text-white/80",
    linkToBilling && !critical && !warn && "hover:bg-white/15 transition-colors",
    className
  );

  const content = (
    <>
      <Sparkles className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span>
        {data.restantTotal}/{data.quotaMensuel}
        {data.packRestant > 0 ? ` (+${data.packRestant})` : ""}
      </span>
    </>
  );

  if (!linkToBilling) {
    return (
      <span
        className={badgeClass}
        title="Quota IA mensuel (ce mois)"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href="/app/billing"
      className={badgeClass}
      title="Quota IA mensuel — facturation"
    >
      {content}
    </Link>
  );
}
