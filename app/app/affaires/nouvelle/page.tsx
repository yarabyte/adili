import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { clients, users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";

import { AffaireForm } from "./affaire-form";

export const metadata = { title: "Nouvelle affaire · Adili" };
export const dynamic = "force-dynamic";

export default async function NouvelleAffairePage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");
  const cabinetId = session.profile.cabinetId;

  const [clientsList, members] = await Promise.all([
    db
      .select({ id: clients.id, nom: clients.nom, type: clients.type })
      .from(clients)
      .where(eq(clients.cabinetId, cabinetId))
      .orderBy(asc(clients.nom)),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        titre: users.titre,
        role: users.role,
      })
      .from(users)
      .where(eq(users.cabinetId, cabinetId))
      .orderBy(asc(users.fullName)),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-3 border-b border-brand-justice/10 pb-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 self-start text-muted-foreground"
        >
          <Link href="/app/affaires">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Retour aux affaires
          </Link>
        </Button>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
            Module Affaires
          </p>
          <h1 className="font-heading text-3xl font-semibold leading-tight text-brand-ink sm:text-4xl">
            Nouvelle affaire
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Créez le dossier contentieux : il regroupera les pièces rédigées,
            les membres affectés, les échéances et l&apos;historique des
            actions.
          </p>
        </div>
      </header>

      <AffaireForm
        clients={clientsList}
        members={members.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          email: m.email,
          titre: m.titre,
          role: m.role,
        }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
