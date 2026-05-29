"use client";

import {
  Briefcase,
  Building2,
  ContactRound,
  HelpCircle,
  LayoutDashboard,
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

/** Classes statiques (Tailwind ne scanne pas `lib/`). */
const AFFAIRE_DOT_CLASSES = [
  "bg-amber-400",
  "bg-sky-400",
  "bg-emerald-400",
  "bg-rose-400",
  "bg-orange-600",
] as const;

const PRIMARY: PrimaryItem[] = [
  { href: "/app", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/recherche", label: "Recherche corpus", icon: Search },
  { href: "/app/affaires", label: "Affaires", icon: Briefcase },
  { href: "/app/clients", label: "Clients", icon: ContactRound },
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
        <div className="space-y-0.5">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
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
          <ul className="space-y-1">
            {recentAffaires.map((a) => {
              const active =
                pathname === a.href || pathname.startsWith(`${a.href}/`);
              return (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    className={cn(
                      "flex gap-2.5 rounded-md px-2 py-2 transition-colors",
                      active
                        ? "bg-brand-gold/15"
                        : "hover:bg-white/[0.06]"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full ring-1 ring-white/10",
                        AFFAIRE_DOT_CLASSES[
                          a.dotIndex % AFFAIRE_DOT_CLASSES.length
                        ]
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-medium leading-snug",
                          active ? "text-brand-gold-soft" : "text-white/80"
                        )}
                      >
                        {a.intitule}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-white/40">
                        {a.activityType} · {a.activityTime}
                      </span>
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
