import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Globe,
  LayoutDashboard,
  Radio,
  ScrollText,
  TrendingUp,
} from "lucide-react";

export type AnalyticsNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  description?: string;
};

export const ANALYTICS_NAV_ITEMS: AnalyticsNavItem[] = [
  {
    href: "/admin/analytics",
    label: "Vue d'ensemble",
    icon: LayoutDashboard,
    exact: true,
    description: "KPIs 360°",
  },
  {
    href: "/admin/analytics/traffic",
    label: "Trafic",
    icon: Globe,
    description: "Pages & sources",
  },
  {
    href: "/admin/analytics/users/online",
    label: "Live now",
    icon: Radio,
    description: "Temps réel",
  },
  {
    href: "/admin/analytics/business",
    label: "Business",
    icon: TrendingUp,
    description: "Revenus & conversion",
  },
  {
    href: "/admin/analytics/ia",
    label: "IA",
    icon: Brain,
    description: "Usage & coûts",
  },
  {
    href: "/admin/analytics/events",
    label: "Événements",
    icon: ScrollText,
    description: "Flux brut",
  },
];

export function isAnalyticsNavActive(
  pathname: string,
  item: AnalyticsNavItem
): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function isAnalyticsSection(pathname: string): boolean {
  return pathname === "/admin/analytics" || pathname.startsWith("/admin/analytics/");
}
