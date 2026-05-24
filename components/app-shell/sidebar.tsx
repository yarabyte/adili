"use client";

import {
  Briefcase,
  Building2,
  HelpCircle,
  LayoutDashboard,
  Plus,
  Search,
  Settings2,
  Library,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import type { RecentAffaireSidebarItem } from "@/components/app-shell/app-shell";
import { cn } from "@/lib/utils";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type PrimaryItem = {
  href: string;
  label: string;
  icon: IconType;
};

const PRIMARY: PrimaryItem[] = [
  { href: "/app", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/app/affaires", label: "Affaires", icon: Briefcase },
  { href: "/recherche", label: "Recherche corpus", icon: Search },
  { href: "/app/cabinet", label: "Cabinet & équipe", icon: Building2 },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  recentAffaires,
}: {
  recentAffaires: RecentAffaireSidebarItem[];
}) {
  const pathname = usePathname() ?? "";

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col overflow-y-auto border-r border-brand-gold/15 bg-brand-ink text-white/65 lg:flex">
      <div className="px-3 pb-2 pt-4">
        <Link
          href="/app/affaires/nouvelle"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-br from-brand-gold to-amber-800 px-3 py-2 text-[12.5px] font-medium tracking-wide text-white shadow-sm transition-opacity hover:opacity-95"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Nouvelle affaire
        </Link>

        <div className="space-y-0.5">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
                  active
                    ? "bg-brand-gold/15 text-brand-gold-soft"
                    : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mx-3 my-3 h-px bg-white/10" />

      <div className="px-3 pb-2 pt-1">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
          Dossiers récents
        </p>
        {recentAffaires.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 bg-white/[0.02] px-2 py-3 text-[11.5px] italic text-white/35">
            Ouvrez une affaire pour la retrouver ici.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {recentAffaires.map((a) => {
              const href = `/app/affaires/${a.id}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={a.id}>
                  <Link
                    href={href}
                    className={cn(
                      "block rounded-md px-2 py-1.5 transition-colors",
                      active
                        ? "bg-brand-gold/15 text-brand-gold-soft"
                        : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="block truncate font-mono text-[10.5px] text-white/45">
                      {a.reference}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] leading-snug">
                      {a.intitule}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto border-t border-white/10 px-3 py-3">
        <div className="space-y-0.5">
          <SidebarMutedItem icon={Library} label="Base de connaissances" />
          <SidebarMutedItem
            icon={Settings2}
            label="Paramètres"
            href="/app/parametres"
          />
          <SidebarMutedItem icon={HelpCircle} label="Aide" />
        </div>
      </div>
    </aside>
  );
}

function SidebarMutedItem({
  icon: Icon,
  label,
  href,
}: {
  icon: IconType;
  label: string;
  href?: string;
}) {
  const className =
    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] transition-colors";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(className, "text-white/55 hover:bg-white/[0.06] hover:text-white")}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <div
      className={cn(className, "cursor-not-allowed text-white/35")}
      aria-disabled="true"
      title="Bientôt"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </div>
  );
}
