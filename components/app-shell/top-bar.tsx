"use client";

import {
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Search,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/actions/auth";
import { QuotaIndicator } from "@/components/billing/quota-indicator";
import { cn } from "@/lib/utils";

type TopBarProps = {
  initials: string;
  displayName: string;
  email: string;
  titreLabel: string | null;
  cabinetName: string | null;
  isCabinetOwner: boolean;
};

const NAV = [
  { href: "/app", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/recherche", label: "Recherche", icon: Search },
  { href: "/app/cabinet", label: "Cabinet", icon: Building2 },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopBar({
  initials,
  displayName,
  email,
  titreLabel,
  cabinetName,
  isCabinetOwner,
}: TopBarProps) {
  const pathname = usePathname() ?? "";

  return (
    <header className="relative z-40 flex h-[52px] shrink-0 items-center gap-3 border-b-2 border-brand-gold bg-brand-justice px-3 text-white sm:gap-5 sm:px-5">
      <Link
        href="/app"
        className="flex shrink-0 items-center gap-2 rounded-md outline-none ring-offset-2 ring-offset-brand-justice focus-visible:ring-2 focus-visible:ring-brand-gold"
      >
        <span className="font-heading text-[22px] font-bold leading-none tracking-wide text-white">
          Adili<span className="text-brand-gold-soft">.</span>
        </span>
      </Link>
      <span className="hidden whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/65 md:inline">
        OHADA · Beta
      </span>

      <nav
        aria-label="Navigation principale"
        className="-mx-1 ml-1 flex flex-1 items-center gap-0.5 overflow-x-auto pr-1 sm:ml-3 sm:overflow-visible"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors sm:px-3",
                active
                  ? "bg-brand-gold/20 text-brand-gold-soft"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <QuotaIndicator linkToBilling={isCabinetOwner} />
        <button
          type="button"
          className="relative hidden h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 text-white/70 transition-colors hover:bg-white/20 sm:flex"
          aria-label="Notifications"
          disabled
          title="Bientôt — notifications cabinet"
        >
          <Bell className="h-4 w-4" aria-hidden />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full border border-brand-justice bg-brand-gold-soft" />
        </button>

        <CabinetMenu
          initials={initials}
          displayName={displayName}
          email={email}
          titreLabel={titreLabel}
          cabinetName={cabinetName}
          isCabinetOwner={isCabinetOwner}
        />
      </div>
    </header>
  );
}

function CabinetMenu({
  initials,
  displayName,
  email,
  titreLabel,
  cabinetName,
  isCabinetOwner,
}: TopBarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-2.5 text-white/85 transition-colors hover:bg-white/20"
      >
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-gradient-to-br from-brand-gold to-amber-800 text-[11px] font-semibold uppercase text-white">
          {initials}
        </span>
        <span className="hidden max-w-[12rem] truncate text-[12px] leading-none sm:inline">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 opacity-70 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-md border border-brand-justice/15 bg-card text-foreground shadow-xl"
        >
          <div className="border-b border-brand-justice/10 px-3 py-3">
            <p className="truncate text-sm font-semibold leading-tight">
              {displayName}
            </p>
            {titreLabel && (
              <p className="mt-0.5 text-xs font-medium text-brand-justice/80">
                {titreLabel}
              </p>
            )}
            {email && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {email}
              </p>
            )}
            {cabinetName && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-justice/10 px-2 py-0.5 text-[11px] font-medium text-brand-justice">
                <Building2 className="h-3 w-3" aria-hidden />
                {cabinetName}
              </p>
            )}
          </div>
          <nav className="py-1.5 text-sm" role="none">
            <Link
              href="/app/cabinet"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              Cabinet
            </Link>
            {isCabinetOwner && (
              <Link
                href="/app/billing"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                <CreditCard
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                Facturation
              </Link>
            )}
            <Link
              href="/app/parametres"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              Mes paramètres
            </Link>
          </nav>
          <form
            action={signOut}
            className="border-t border-brand-justice/10 py-1.5 text-sm"
          >
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Déconnexion
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
