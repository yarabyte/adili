"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Sections de la landing, dans l’ordre du document. */
const LANDING_SECTION_IDS = [
  "corpus",
  "corpus-cameroun",
  "fonctionnalites",
  "comment-ca-marche",
  "a-propos",
] as const;

type LandingSectionId = (typeof LANDING_SECTION_IDS)[number];

type NavLinkConfig = {
  label: string;
  href: string;
  className?: string;
  /** Sections qui activent ce lien (scroll-spy). */
  sectionIds?: readonly LandingSectionId[];
  /** Chemin exact pour les pages hors landing. */
  path?: string;
};

function buildNavLinks(homeHref: string): NavLinkConfig[] {
  const anchor = (hash: string) => (homeHref ? `${homeHref}${hash}` : hash);

  return [
    {
      label: "Fonctionnalités",
      href: anchor("#fonctionnalites"),
      sectionIds: ["fonctionnalites"],
      className: "hidden sm:inline-flex",
    },
    {
      label: "Comment ça marche",
      href: anchor("#comment-ca-marche"),
      sectionIds: ["comment-ca-marche"],
      className: "hidden md:inline-flex",
    },
    {
      label: "Corpus",
      href: anchor("#corpus"),
      sectionIds: ["corpus", "corpus-cameroun"],
      className: "hidden sm:inline-flex",
    },
    {
      label: "Tarifs",
      href: "/tarifs",
      path: "/tarifs",
      className: "hidden sm:inline-flex",
    },
    {
      label: "À propos",
      href: anchor("#a-propos"),
      sectionIds: ["a-propos"],
      className: "hidden md:inline-flex",
    },
  ];
}

function resolveActiveSection(): LandingSectionId | null {
  const headerOffset = 88;
  let active: LandingSectionId | null = null;

  for (const id of LANDING_SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top;
    if (top <= headerOffset) {
      active = id;
    }
  }

  return active;
}

function isLinkActive(
  pathname: string,
  activeSection: LandingSectionId | null,
  link: NavLinkConfig
): boolean {
  if (link.path) {
    return pathname === link.path || pathname.startsWith(`${link.path}/`);
  }
  if (pathname !== "/" || !link.sectionIds?.length) return false;
  return activeSection !== null && link.sectionIds.includes(activeSection);
}

const navLinkBase =
  "text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-justice/30";

function navLinkClass(active: boolean, extra?: string) {
  return cn(
    navLinkBase,
    extra,
    active
      ? "bg-brand-justice/10 font-semibold text-brand-justice shadow-sm ring-1 ring-brand-justice/15"
      : "text-muted-foreground hover:bg-brand-justice/5 hover:text-foreground"
  );
}

type SiteHeaderNavProps = {
  isAuthed: boolean;
  homeHref?: string;
};

export function SiteHeaderNav({ isAuthed, homeHref = "" }: SiteHeaderNavProps) {
  const pathname = usePathname() ?? "";
  const [activeSection, setActiveSection] = useState<LandingSectionId | null>(
    null
  );

  const updateSection = useCallback(() => {
    if (pathname !== "/") {
      setActiveSection(null);
      return;
    }
    setActiveSection(resolveActiveSection());
  }, [pathname]);

  useEffect(() => {
    updateSection();

    if (pathname !== "/") return;

    const onScroll = () => updateSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname, updateSection]);

  useEffect(() => {
    if (pathname !== "/" || typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (
      LANDING_SECTION_IDS.includes(hash as LandingSectionId) &&
      hash !== activeSection
    ) {
      const t = window.setTimeout(updateSection, 120);
      return () => window.clearTimeout(t);
    }
  }, [pathname, activeSection, updateSection]);

  const navLinks = buildNavLinks(homeHref);
  const connexionMuted = cn(navLinkBase, "text-muted-foreground hover:text-foreground");

  return (
    <nav
      className="flex flex-shrink-0 items-center gap-1 sm:gap-2"
      aria-label="Navigation principale"
    >
      {navLinks.map((link) => {
        const active = isLinkActive(pathname, activeSection, link);
        return (
          <Button
            key={link.label}
            variant="ghost"
            size="sm"
            className={navLinkClass(active, link.className)}
            asChild
          >
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          </Button>
        );
      })}
      {isAuthed ? (
        <Button size="sm" className="text-[13px]" asChild>
          <Link href="/app">Mon espace</Link>
        </Button>
      ) : (
        <>
          <Button variant="ghost" size="sm" className={connexionMuted} asChild>
            <Link href="/connexion">Connexion</Link>
          </Button>
          <Button size="sm" className="text-[13px]" asChild>
            <Link href="/tarifs">Créer un compte</Link>
          </Button>
        </>
      )}
    </nav>
  );
}
