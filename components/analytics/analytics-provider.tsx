"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { analytics } from "@/lib/analytics/client";
import { shouldTrackWebPath } from "@/lib/analytics/geo";

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageStartTime = useRef(Date.now());
  const lastPath = useRef("");

  useEffect(() => {
    if (!pathname || !shouldTrackWebPath(pathname)) return;

    const query = searchParams?.toString();
    const currentPath = query ? `${pathname}?${query}` : pathname;

    if (lastPath.current && lastPath.current !== currentPath) {
      const duration = Date.now() - pageStartTime.current;
      analytics?.track("page_exit", {
        path: lastPath.current.split("?")[0],
        duration_ms: duration,
      });
    }

    analytics?.trackPageView({ path: pathname });

    pageStartTime.current = Date.now();
    lastPath.current = currentPath;

    const utmSource = searchParams?.get("utm_source");
    const utmMedium = searchParams?.get("utm_medium");
    const utmCampaign = searchParams?.get("utm_campaign");
    if (utmSource || utmMedium || utmCampaign) {
      sessionStorage.setItem(
        "adili_utm",
        JSON.stringify({
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
        })
      );
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!pathname || !shouldTrackWebPath(pathname)) return;

    const milestones = [25, 50, 75, 100];
    const reached = new Set<number>();

    const onScroll = () => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const scrollPercent = (window.scrollY / maxScroll) * 100;
      for (const m of milestones) {
        if (scrollPercent >= m && !reached.has(m)) {
          reached.add(m);
          analytics?.track("scroll_depth", { depth: m, path: pathname });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </>
  );
}
