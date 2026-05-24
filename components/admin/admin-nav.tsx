"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  GraduationCap,
  Building2,
  Landmark,
  LayoutDashboard,
  Rocket,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { AdminNavCounts } from "@/lib/admin/nav-counts";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  countKey?: keyof AdminNavCounts;
  exact?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  {
    href: "/admin/leads-grand-cabinet",
    label: "Leads GC",
    icon: Building2,
    countKey: "leadsGc",
  },
  { href: "/admin/ecoles", label: "Écoles", icon: GraduationCap },
  { href: "/admin/revenue", label: "Revenus", icon: TrendingUp },
  { href: "/admin/subscriptions", label: "Abonnements", icon: CreditCard },
  {
    href: "/admin/payments-pending",
    label: "Virements",
    icon: Landmark,
    countKey: "virements",
  },
  {
    href: "/admin/beta-applications",
    label: "Beta",
    icon: Rocket,
    countKey: "beta",
  },
  {
    href: "/admin/etudiants-validation",
    label: "Étudiants",
    icon: GraduationCap,
    countKey: "etudiants",
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminNav({
  counts,
  onNavigate,
  className,
}: {
  counts: AdminNavCounts;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname() ?? "";

  return (
    <nav className={cn("flex flex-col gap-0.5", className)} aria-label="Administration">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const badge =
          item.countKey && counts[item.countKey] > 0
            ? counts[item.countKey]
            : null;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-justice text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-brand-justice/8 hover:text-brand-justice"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-primary-foreground" : "text-brand-justice/70 group-hover:text-brand-justice"
              )}
              aria-hidden
            />
            <span className="flex-1 truncate">{item.label}</span>
            {badge != null && (
              <span
                className={cn(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-brand-gold/20 text-brand-gold"
                )}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
