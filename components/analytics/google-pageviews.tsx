"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { isPublicMarketingPath } from "@/lib/analytics/site-tracking";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, string>
    ) => void;
  }
}

type GooglePageviewsProps = {
  mode: "gtm" | "ga4";
  measurementId?: string;
};

/** Pageviews virtuels pour les navigations client (App Router). */
export function GooglePageviews({ mode, measurementId }: GooglePageviewsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !isPublicMarketingPath(pathname)) return;

    const query = searchParams?.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    if (mode === "gtm") {
      window.dataLayer?.push({
        event: "page_view",
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
      });
      return;
    }

    if (mode === "ga4" && measurementId && window.gtag) {
      window.gtag("config", measurementId, {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [mode, measurementId, pathname, searchParams]);

  return null;
}
