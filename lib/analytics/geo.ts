export type GeoInfo = {
  country: string | null;
  region: string | null;
  city: string | null;
};

export function getGeoFromHeaders(req: Request): GeoInfo {
  return {
    country:
      req.headers.get("cf-ipcountry") ??
      req.headers.get("x-vercel-ip-country") ??
      null,
    region: req.headers.get("x-vercel-ip-country-region") ?? null,
    city: req.headers.get("x-vercel-ip-city") ?? null,
  };
}

/** Chemins exclus du tracking web client (/admin, API, impression). */
export function shouldTrackWebPath(pathname: string): boolean {
  if (pathname.startsWith("/admin") || pathname === "/admin") return false;
  if (pathname.startsWith("/api") || pathname === "/api") return false;
  if (pathname.startsWith("/print") || pathname === "/print") return false;
  return true;
}

export function stripSensitiveQuery(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (/token|password|secret|code|email/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function resolveTrafficSource(
  utmSource: string | null | undefined,
  referrer: string | null | undefined
): string {
  if (utmSource) return utmSource;
  if (!referrer) return "direct";
  const ref = referrer.toLowerCase();
  if (ref.includes("google")) return "google";
  if (ref.includes("linkedin")) return "linkedin";
  if (ref.includes("whatsapp") || ref.includes("wa.me")) return "whatsapp";
  if (ref.includes("facebook") || ref.includes("fb.me")) return "facebook";
  return "other_referral";
}
