"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/admin/analytics": "Vue d'ensemble",
  "/admin/analytics/traffic": "Trafic",
  "/admin/analytics/users/online": "Live now",
  "/admin/analytics/business": "Business",
  "/admin/analytics/ia": "Usage IA",
  "/admin/analytics/events": "Événements",
};

export function AnalyticsPageTitle() {
  const pathname = usePathname() ?? "/admin/analytics";
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([href]) => pathname.startsWith(href))?.[1] ??
    "Analytics";

  return (
    <h1 className="font-heading text-2xl font-semibold text-brand-justice">
      {title}
    </h1>
  );
}
