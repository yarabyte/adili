import { redirect } from "next/navigation";
import { ChevronLeft, KeyRound, Mail, UserRound } from "lucide-react";
import Link from "next/link";

import { ProfilForm } from "@/app/onboarding/profil/profil-form";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/profile";

import { PasswordForm } from "./password-form";

export const metadata = { title: "Mes paramètres · Adili" };
export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  const defaultFullName =
    session.profile.fullName ??
    (session.user.user_metadata?.full_name as string | undefined) ??
    "";
  const defaultPhone = session.profile.phone ?? "";
  const defaultBarreau = session.profile.barreau ?? "";
  const defaultTitre = session.profile.titre ?? "";
  const email = session.user.email ?? session.profile.email;

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 self-start text-muted-foreground"
      >
        <Link href="/app">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Retour
        </Link>
      </Button>

      <header className="space-y-2 border-b border-brand-justice/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
          Compte
        </p>
        <h1 className="font-heading text-3xl font-semibold text-brand-ink sm:text-4xl">
          Mes paramètres
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Modifiez vos coordonnées personnelles et votre mot de passe.
        </p>
      </header>

      <section className="space-y-5 rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-justice/10 text-brand-justice">
            <UserRound className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold text-brand-ink">
              Profil
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nom, téléphone et barreau d&apos;inscription.
            </p>
          </div>
        </div>

        <ProfilForm
          defaultFullName={defaultFullName}
          defaultPhone={defaultPhone}
          defaultBarreau={defaultBarreau}
          defaultTitre={defaultTitre}
          submitLabel="Enregistrer le profil"
        />
      </section>

      <section className="space-y-4 rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-justice/10 text-brand-justice">
            <Mail className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold text-brand-ink">
              Adresse email
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Utilisée pour la connexion. Pour la modifier, contactez le support
              ou utilisez le flux de changement d&apos;email Supabase.
            </p>
            {email && (
              <p className="mt-2 font-mono text-sm text-foreground">{email}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-xl border border-brand-justice/10 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-justice/10 text-brand-justice">
            <KeyRound className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold text-brand-ink">
              Mot de passe
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez un mot de passe d&apos;au moins 8 caractères, non
              réutilisé ailleurs.
            </p>
          </div>
        </div>

        <PasswordForm />
      </section>
    </div>
  );
}
