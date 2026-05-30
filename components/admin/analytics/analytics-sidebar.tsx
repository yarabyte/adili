"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ANALYTICS_NAV_ITEMS,
  isAnalyticsNavActive,
} from "@/lib/admin/analytics-nav";
import { cn } from "@/lib/utils";

export function AnalyticsMobileNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
      aria-label="Analytics"
    >
      {ANALYTICS_NAV_ITEMS.map((item) => {
        const active = isAnalyticsNavActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-brand-justice bg-brand-justice text-primary-foreground"
                : "border-brand-justice/15 bg-card text-muted-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
