import { Suspense } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

import { AnalyticsMobileNav } from "@/components/admin/analytics/analytics-sidebar";
import { AnalyticsPageTitle } from "@/components/admin/analytics/analytics-page-title";
import { PeriodSelector } from "@/components/admin/analytics/period-selector";
import { requireAdminPage } from "@/lib/admin/require-admin-page";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage("analytics.view");

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-brand-justice/10 bg-card/80 p-4 backdrop-blur-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-gold/25 to-brand-gold/5 ring-1 ring-brand-gold/30">
              <BarChart3
                className="h-5 w-5 text-brand-justice"
                strokeWidth={1.75}
                aria-hidden
              />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-justice/70">
                Analytics
              </p>
              <AnalyticsPageTitle />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-brand-sage/25 bg-brand-sage/10 px-2.5 py-1 text-[11px] font-medium text-brand-sage sm:inline-flex">
              <RefreshCw
                className="h-3 w-3 animate-spin [animation-duration:3s]"
                aria-hidden
              />
              Auto 30 s
            </span>
            <Suspense fallback={null}>
              <PeriodSelector />
            </Suspense>
          </div>
        </div>
        <div className="mt-4 lg:hidden">
          <AnalyticsMobileNav />
        </div>
      </header>
      {children}
    </div>
  );
}
