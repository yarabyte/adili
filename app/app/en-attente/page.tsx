import { Clock } from "lucide-react";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getLatestStudentValidation } from "@/lib/onboarding/student";
import { redirect } from "next/navigation";

export const metadata = { title: "Validation en cours · Adili" };
export const dynamic = "force-dynamic";

export default async function EnAttentePage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");

  const validation = await getLatestStudentValidation(session.user.id);
  if (!validation || validation.statut !== "en_attente") {
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-justice/10 bg-card p-8 text-center shadow-xl">
        <AdiliLogo href="/" height={36} className="mx-auto" />
        <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold/15">
          <Clock className="h-7 w-7 text-brand-gold" aria-hidden />
        </div>
        <h1 className="mt-6 font-heading text-xl font-semibold">
          Dossier en cours d&apos;examen
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          École : <strong>{validation.ecole}</strong>
          <br />
          Réponse sous 72 h ouvrées. Vous recevrez un email à{" "}
          <strong>{session.user.email}</strong>.
        </p>
        <form action={signOut} className="mt-8">
          <Button type="submit" variant="outline" size="sm">
            Se déconnecter
          </Button>
        </form>
      </div>
    </div>
  );
}
