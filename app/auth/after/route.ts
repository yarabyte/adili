import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { syncUserFromAuthMetadata } from "@/lib/onboarding/sync-user";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Point d'entrée après confirmation email ou OAuth : redirige vers la bonne
 * étape d'onboarding (plan stocké dans user_metadata).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/connexion?compte=confirme", url.origin)
    );
  }

  await syncUserFromAuthMetadata(user);
  const session = await getCurrentProfile();
  const destPath = session ? await resolvePostAuthPath(session) : "/app";

  const dest = new URL(destPath, url.origin);
  dest.searchParams.set("email_confirme", "1");

  return NextResponse.redirect(dest);
}
