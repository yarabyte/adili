import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ContactRound } from "lucide-react";

import { ClientsManager } from "@/components/clients/clients-manager";
import type { ClientListItem } from "@/components/clients/clients-manager";
import { Button } from "@/components/ui/button";
import { getCurrentProfile, isCabinetOwner } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { affaires, cabinets, clients } from "@/lib/db/schema";

export const metadata = { title: "Clients · Adili" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  const cabinetId = session.profile.cabinetId;

  const [[cabinet], rows] = await Promise.all([
    db
      .select({ ownerId: cabinets.ownerId })
      .from(cabinets)
      .where(eq(cabinets.id, cabinetId))
      .limit(1),
    db
      .select({
        id: clients.id,
        nom: clients.nom,
        type: clients.type,
        contact: clients.contact,
        updatedAt: clients.updatedAt,
        affairesCount: sql<number>`count(${affaires.id})::int`,
      })
      .from(clients)
      .leftJoin(affaires, eq(affaires.clientId, clients.id))
      .where(eq(clients.cabinetId, cabinetId))
      .groupBy(clients.id)
      .orderBy(asc(clients.nom)),
  ]);

  const canDelete = cabinet ? isCabinetOwner(session, cabinet) : false;

  const clientItems: ClientListItem[] = rows.map((r) => ({
    id: r.id,
    nom: r.nom,
    type: r.type,
    contact: (r.contact as ClientListItem["contact"]) ?? null,
    affairesCount: Number(r.affairesCount ?? 0),
    updatedAt:
      r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : String(r.updatedAt),
  }));

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
          <h1 className="flex items-center gap-2 font-heading text-3xl font-semibold leading-tight text-brand-ink sm:text-4xl">
            <ContactRound className="h-8 w-8 text-brand-justice" aria-hidden />
            Clients
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Gérez le référentiel clients de votre cabinet. Ils sont proposés lors
            de la création d&apos;une nouvelle affaire.
          </p>
        </div>
      </header>

      <ClientsManager clients={clientItems} canDelete={canDelete} />
    </div>
  );
}
