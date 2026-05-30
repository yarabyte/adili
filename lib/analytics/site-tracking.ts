/** Chemins exclus du suivi (espace connecté, admin, API, impression). */
export function isPublicMarketingPath(pathname: string): boolean {
  if (pathname.startsWith("/app") || pathname === "/app") return false;
  if (pathname.startsWith("/admin") || pathname === "/admin") return false;
  if (pathname.startsWith("/api") || pathname === "/api") return false;
  if (pathname.startsWith("/print") || pathname === "/print") return false;
  return true;
}

export type GoogleAnalyticsConfig = {
  measurementId: string;
};

export type GoogleTagManagerConfig = {
  containerId: string;
};

export function getGoogleTagManagerConfig(): GoogleTagManagerConfig | null {
  const containerId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  if (!containerId || !/^GTM-[A-Z0-9]+$/i.test(containerId)) return null;
  return { containerId: containerId.toUpperCase() };
}

export function getGoogleAnalyticsConfig(): GoogleAnalyticsConfig | null {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return null;
  return { measurementId: measurementId.toUpperCase() };
}

/** GTM prioritaire ; GA4 direct si GTM absent (évite le double comptage). */
export function getSiteAnalyticsMode(): "gtm" | "ga4" | null {
  if (getGoogleTagManagerConfig()) return "gtm";
  if (getGoogleAnalyticsConfig()) return "ga4";
  return null;
}
