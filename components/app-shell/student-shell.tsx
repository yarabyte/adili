import Link from "next/link";
import { GraduationCap, LogOut, Search } from "lucide-react";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { QuotaIndicator } from "@/components/billing/quota-indicator";
import { Button } from "@/components/ui/button";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { signOut } from "@/app/actions/auth";

export function StudentShell({
  children,
  displayName,
  email,
}: {
  children: React.ReactNode;
  displayName: string;
  email: string;
}) {
  return (
    <ConfirmProvider>
    <div className="adili-workspace flex min-h-screen flex-col bg-brand-parchment">
      <header className="sticky top-0 z-40 border-b border-brand-justice/10 bg-brand-justice text-primary-foreground shadow-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <AdiliLogo href="/app" height={28} />
            <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden />
              Étudiant
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <QuotaIndicator linkToBilling={false} />
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 bg-white/15 text-white hover:bg-white/25"
            >
              <Link href="/recherche">
                <Search className="h-4 w-4" aria-hidden />
                Recherche
              </Link>
            </Button>
            <span className="hidden max-w-[140px] truncate text-xs text-white/80 md:inline">
              {displayName}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="h-8 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-brand-justice/10 py-4 text-center text-xs text-muted-foreground">
        Compte étudiant · {email}
      </footer>
    </div>
    </ConfirmProvider>
  );
}
