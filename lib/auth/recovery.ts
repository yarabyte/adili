/** Page où l'utilisateur choisit son nouveau mot de passe. */
export const RESET_PASSWORD_PATH = "/reinitialiser-mot-de-passe";

/**
 * URL de redirection Supabase après clic sur l'email (flux PKCE).
 * Doit être listée dans Authentication → URL Configuration → Redirect URLs.
 */
export function passwordRecoveryCallbackUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  const next = encodeURIComponent(RESET_PASSWORD_PATH);
  return `${base}/auth/callback?next=${next}`;
}
