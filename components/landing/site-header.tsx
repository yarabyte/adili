import { AdiliLogo } from "@/components/brand/adili-logo";
import { SiteHeaderNav } from "@/components/landing/site-header-nav";

type SiteHeaderProps = {
  isAuthed: boolean;
  /** Préfixe pour les ancres de la landing (ex. `/` → `/#fonctionnalites`). */
  homeHref?: string;
};

export function SiteHeader({ isAuthed, homeHref = "" }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-justice/10 bg-brand-parchment/85 backdrop-blur-md supports-[backdrop-filter]:bg-brand-parchment/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <AdiliLogo href="/" height={34} priority />
          <span className="hidden rounded-full border border-brand-justice/20 bg-brand-justice/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-justice/80 sm:inline">
            OHADA · Beta
          </span>
        </div>
        <SiteHeaderNav isAuthed={isAuthed} homeHref={homeHref} />
      </div>
    </header>
  );
}
