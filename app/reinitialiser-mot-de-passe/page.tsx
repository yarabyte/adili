import { Suspense } from "react";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { RecoverySessionGate } from "@/components/auth/recovery-session-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Nouveau mot de passe · Adili",
};

export const dynamic = "force-dynamic";

export default async function ReinitialiserMotDePassePage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const hasSession = Boolean(data.user);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-justice/10 bg-card p-8 shadow-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <AdiliLogo href="/" height={40} priority className="mx-auto" />
          <h1 className="mt-6 font-heading text-3xl font-semibold text-brand-ink">
            Nouveau mot de passe
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Choisissez un mot de passe sécurisé pour votre compte Adili.
          </p>
        </div>
        <div className="mt-8">
          {hasSession ? (
            <ResetPasswordForm />
          ) : (
            <Suspense
              fallback={
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Chargement…
                </p>
              }
            >
              <RecoverySessionGate />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
