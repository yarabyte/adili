"use client";

import type { LucideIcon } from "lucide-react";

import { AdminCard, AdminCardHeader } from "@/components/admin/admin-card";
import { cn } from "@/lib/utils";

const ICON_TONES = {
  justice: "bg-brand-justice/10 text-brand-justice ring-brand-justice/15",
  sage: "bg-brand-sage/15 text-brand-sage ring-brand-sage/20",
  gold: "bg-brand-gold/15 text-brand-ink ring-brand-gold/25",
  sky: "bg-sky-500/10 text-sky-700 ring-sky-500/15 dark:text-sky-300",
  violet: "bg-violet-500/10 text-violet-700 ring-violet-500/15 dark:text-violet-300",
} as const;

export function AnalyticsChartCard({
  title,
  subtitle,
  icon: Icon,
  tone = "justice",
  children,
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: keyof typeof ICON_TONES;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <AdminCard className={cn("overflow-hidden", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
              ICON_TONES[tone]
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <AdminCardHeader title={title} subtitle={subtitle} />
        </div>
        {action}
      </div>
      {children}
    </AdminCard>
  );
}

export function AnalyticsKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[7.5rem] animate-pulse rounded-xl border border-brand-justice/10 bg-muted/30"
        />
      ))}
    </div>
  );
}
