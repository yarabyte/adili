const AUTH_PATH_PREFIXES = ["/connexion", "/inscription"] as const;

/**
 * Cible de redirection après connexion : chemin interne uniquement,
 * jamais vers les pages d’auth (évite les boucles).
 */
export function safeAuthRedirectPath(
  path: string | null | undefined,
  fallback = "/app"
): string {
  const trimmed = path?.trim() ?? "";
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  if (AUTH_PATH_PREFIXES.some((p) => trimmed === p || trimmed.startsWith(`${p}/`))) {
    return fallback;
  }
  return trimmed;
}

/** Lit `redirect` ou l’alias historique `next` depuis les query params. */
export function readAuthReturnPath(
  params: { redirect?: string; next?: string } | null | undefined
): string {
  return safeAuthRedirectPath(params?.redirect ?? params?.next);
}

/**
 * URL de la page de connexion avec retour post-auth (`?redirect=`).
 * Pour `/app` (défaut), pas de query inutile.
 */
export function connexionPath(returnPath?: string | null): string {
  const target = safeAuthRedirectPath(returnPath);
  if (target === "/app") return "/connexion";
  return `/connexion?redirect=${encodeURIComponent(target)}`;
}
