import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { AppShell } from "@/components/app-shell/app-shell";
import { StudentShell } from "@/components/app-shell/student-shell";
import { Button } from "@/components/ui/button";
import { buildAppShellData } from "@/lib/auth/shell";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getIntendedPlan } from "@/lib/onboarding/intended-plan";
import {
  getLatestStudentValidation,
  isStudentValidationActive,
} from "@/lib/onboarding/student";
import { formatMemberDisplayName } from "@/lib/users/display-name";

import { SearchClient } from "./search-client";

export const metadata = {
  title: "Recherche · Adili",
  description: "Recherche sémantique dans le corpus OHADA.",
};

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const seed = (searchParams?.q ?? "").trim().slice(0, 500);

  const session = await getCurrentProfile();
  const isAuthed = Boolean(session);

  const heading = (
    <header className="space-y-3 border-b border-brand-justice/10 pb-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
        Recherche · réservée au droit OHADA
      </p>
      <h1 className="font-heading text-4xl font-semibold leading-tight text-brand-ink sm:text-5xl">
        Le moteur de recherche des avocats et praticiens du droit OHADA
      </h1>
      <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Posez une question comme à un confrère&nbsp;: Adili compare votre
        formulation aux articles indexés des actes uniformes, classe les
        passages applicables, puis — pour les avocats et praticiens du droit
        connectés — rédige une synthèse sourcée avec citations cliquables.
      </p>
    </header>
  );

  if (session && getIntendedPlan(session) === "etudiant") {
    const validation = await getLatestStudentValidation(session.user.id);
    if (!validation || validation.statut === "en_attente") {
      redirect("/app/en-attente");
    }
    if (!isStudentValidationActive(validation)) {
      redirect("/onboarding/etudiant?renouvel=1");
    }
    const displayName = formatMemberDisplayName(
      session.profile?.fullName,
      session.user.email,
      session.profile?.titre
    );
    return (
      <StudentShell
        displayName={displayName}
        email={session.user.email ?? ""}
      >
        <div className="space-y-8">
          {heading}
          <SearchClient isAuthed={isAuthed} defaultQuery={seed} />
        </div>
      </StudentShell>
    );
  }

  const shellData =
    session && session.profile?.cabinetId ? await buildAppShellData(session) : null;

  const content = (
    <div className="space-y-8">
      {heading}
      <SearchClient isAuthed={isAuthed} defaultQuery={seed} />
    </div>
  );

  if (shellData) {
    return <AppShell data={shellData}>{content}</AppShell>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-parchment">
      <header className="sticky top-0 z-40 border-b border-brand-justice/10 bg-background/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <AdiliLogo href="/" height={32} />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Accueil
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="hidden sm:inline-flex"
            >
              <Link href="/connexion">Se connecter</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {content}
      </main>
    </div>
  );
}
