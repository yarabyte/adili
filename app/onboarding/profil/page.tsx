import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { UserRound } from "lucide-react";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { cabinets } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { signOut } from "@/app/actions/auth";

import { ProfilForm } from "./profil-form";

export const metadata = { title: "Compléter votre profil · Adili" };
export const dynamic = "force-dynamic";

export default async function OnboardingProfilPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");

  // Pas encore de cabinet → on n'est pas un invité, on doit créer un cabinet.
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  // Profil déjà renseigné (au moins nom + téléphone) → rien à compléter.
  if (session.profile?.fullName && session.profile?.phone) {
    redirect("/app?welcome=invitation-accepted");
  }

  const [cabinet] = await db
    .select({ name: cabinets.name, city: cabinets.city, country: cabinets.country })
    .from(cabinets)
    .where(eq(cabinets.id, session.profile.cabinetId))
    .limit(1);

  const defaultFullName =
    session.profile.fullName ??
    (session.user.user_metadata?.full_name as string | undefined) ??
    "";
  const defaultPhone = session.profile.phone ?? "";
  const defaultBarreau = session.profile.barreau ?? "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-justice/10 bg-card p-8 shadow-xl sm:p-10">
        <div className="flex flex-col items-center text-center">
          <AdiliLogo href="/" height={40} priority className="mx-auto" />
          <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/12">
            <UserRound className="h-7 w-7 text-brand-gold" aria-hidden />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-gold">
            Étape finale
          </p>
          <h1 className="mt-1.5 font-heading text-2xl font-semibold leading-tight text-brand-ink">
            Compléter votre profil
          </h1>
          {cabinet?.name && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Bienvenue dans{" "}
              <strong className="text-foreground">{cabinet.name}</strong>
              {cabinet.city || cabinet.country
                ? ` · ${[cabinet.city, cabinet.country].filter(Boolean).join(", ")}`
                : ""}
              .
            </p>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-brand-justice/10 bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Vous rejoignez ce cabinet en tant que membre. Les informations du
          cabinet sont gérées par les administrateurs — vous n&apos;avez qu&apos;à
          renseigner vos coordonnées personnelles ci-dessous.
        </div>

        <div className="mt-6">
          <ProfilForm
            defaultFullName={defaultFullName}
            defaultPhone={defaultPhone}
            defaultBarreau={defaultBarreau}
            redirectTo="/app?welcome=invitation-accepted"
          />
        </div>

        <form action={signOut} className="mt-6 text-center">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Se déconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}
