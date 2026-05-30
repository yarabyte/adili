"use client";

import { CalendarDays } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "24h", label: "24 h" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
] as const;

export function PeriodSelector({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin/analytics";
  const searchParams = useSearchParams();
  const current = searchParams?.get("period") ?? "7d";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-brand-justice/10 bg-card p-1 shadow-sm",
        className
      )}
    >
      <span className="hidden items-center gap-1.5 pl-2 text-xs text-muted-foreground sm:flex">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        Période
      </span>
      {PERIODS.map((p) => {
        const active = current === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-brand-justice text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-brand-justice/8 hover:text-brand-justice"
            )}
            aria-pressed={active}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
