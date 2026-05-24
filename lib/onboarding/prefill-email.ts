const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email passé en query (?email=) pour préremplir l'inscription. */
export function parsePrefillEmail(
  raw: string | string[] | undefined
): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const email = decodeURIComponent(value).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return undefined;
  return email;
}
