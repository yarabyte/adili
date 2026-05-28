import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { RESET_PASSWORD_PATH } from "@/lib/auth/recovery";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Valide les liens d’auth email (token_hash) sur le domaine Adili,
 * sans exposer l’URL Supabase dans les messages.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next =
    url.searchParams.get("next") ??
    (type === "recovery" ? RESET_PASSWORD_PATH : "/auth/after");

  if (!tokenHash || !type || !ALLOWED_TYPES.has(type)) {
    return NextResponse.redirect(
      new URL("/connexion?erreur=lien-auth", url.origin)
    );
  }

  const destPath = next.startsWith("/") ? next : "/auth/after";
  const response = NextResponse.redirect(new URL(destPath, url.origin));

  const supabase = createSupabaseRouteHandlerClient(request, response);
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    const erreur =
      type === "recovery" ? "lien-reinitialisation" : "lien-auth";
    return NextResponse.redirect(
      new URL(`/connexion?erreur=${erreur}`, url.origin)
    );
  }

  return response;
}
