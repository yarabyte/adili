"use client";

import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

import { signOut } from "@/app/actions/auth";
import { AdiliLogo } from "@/components/brand/adili-logo";
import { AdminNav } from "@/components/admin/admin-nav";
import type { AdminNavCounts } from "@/lib/admin/nav-counts";

type AdminShellProps = {
  children: React.ReactNode;
  counts: AdminNavCounts;
  role: string;
  email: string;
};

export function AdminShell({
  children,
  counts,
  role,
  email,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const pendingTotal =
    counts.virements + counts.beta + counts.etudiants;

  return (
    <div className="adili-workspace flex min-h-screen bg-brand-parchment">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-brand-justice/10 bg-card lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-brand-justice/10 px-5">
          <AdiliLogo href="/admin" height={26} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <AdminNav counts={counts} />
        </div>
        <div className="border-t border-brand-justice/10 p-4">
          <p className="truncate text-sm font-medium text-foreground">{email}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {role.replaceAll("_", " ")}
          </p>
          <Link
            href="/app"
            className="mt-3 inline-flex text-sm font-medium text-brand-justice hover:underline"
          >
            ← Retour à l&apos;application
          </Link>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive hover:underline"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre mobile */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-brand-justice/10 bg-card/95 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-brand-justice hover:bg-muted"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <AdiliLogo href="/admin" height={24} />
          </div>
          {pendingTotal > 0 && (
            <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-bold text-brand-gold">
              {pendingTotal} en attente
            </span>
          )}
          <Link
            href="/app"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            App
          </Link>
        </header>

        {mobileOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-brand-ink/40 lg:hidden"
              aria-label="Fermer"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-brand-justice/10 bg-card shadow-xl lg:hidden">
              <div className="flex h-14 items-center border-b border-brand-justice/10 px-4">
                <span className="text-sm font-semibold text-brand-justice">
                  Administration
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <AdminNav
                  counts={counts}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              <div className="border-t border-brand-justice/10 p-4">
                <p className="truncate text-xs font-medium text-foreground">
                  {email}
                </p>
                <Link
                  href="/app"
                  className="mt-3 inline-flex text-sm font-medium text-brand-justice hover:underline"
                  onClick={() => setMobileOpen(false)}
                >
                  ← Retour à l&apos;application
                </Link>
                <form action={signOut} className="mt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive hover:underline"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden />
                    Déconnexion
                  </button>
                </form>
              </div>
            </aside>
          </>
        )}

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
