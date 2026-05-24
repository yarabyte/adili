import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { connexionPath, readAuthReturnPath } from "@/lib/auth/redirect";

const PROTECTED_PREFIXES = ["/app", "/admin"];
const AUTH_PAGES = ["/connexion", "/inscription"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const returnPath = `${pathname}${search}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-url", returnPath);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !user) {
    return NextResponse.redirect(
      new URL(connexionPath(returnPath), request.url)
    );
  }

  if (pathname === "/inscription" && !request.nextUrl.searchParams.get("plan")) {
    return NextResponse.redirect(new URL("/tarifs", request.url));
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/auth/after", request.url));
  }

  const isOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  if (isOnboarding && !user) {
    return NextResponse.redirect(
      new URL(connexionPath(returnPath), request.url)
    );
  }

  if (pathname === "/reinitialiser-mot-de-passe" && !user) {
    const redirectUrl = new URL("/connexion", request.url);
    redirectUrl.searchParams.set("erreur", "lien-reinitialisation");
    return NextResponse.redirect(redirectUrl);
  }

  supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  // Réappliquer les cookies Supabase sur la réponse enrichie
  const cookieStore = request.cookies.getAll();
  if (cookieStore.length) {
  }
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Hors API : les routes /api/* ont leur propre client Supabase dans le
     * handler ; les appeler via le middleware ajoutait un getUser() réseau
     * sur chaque heartbeat / requête fréquente (verrou, recherche, etc.).
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
