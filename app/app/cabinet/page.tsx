import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Building2, Crown, Lock, Mail, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { cabinets, invitations, users } from "@/lib/db/schema";
import {
  getCurrentProfile,
  isCabinetAdmin,
  isCabinetOwner,
} from "@/lib/auth/profile";

import { CabinetProfileCard } from "./cabinet-profile-card";
import {
  CabinetSettingsForm,
  type CabinetSettingsValues,
} from "./cabinet-settings-form";
import { InvitationForm } from "./invitation-form";
import { MemberRowActions } from "./member-row-actions";
import { formatMemberDisplayName } from "@/lib/users/display-name";
import { revokeInvitation } from "@/app/actions/invitations";

export const metadata = { title: "Cabinet · Adili" };
export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  avocat: "Avocat",
  collaborateur: "Collaborateur",
};

function memberInitials(fullName: string | null, email: string): string {
  const name = fullName?.replace(/^(maître|maitre)\s+/i, "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default async function CabinetPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  const cabinetId = session.profile.cabinetId;

  const [cabinet] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.id, cabinetId))
    .limit(1);

  const canManage = cabinet ? isCabinetAdmin(session, cabinet) : false;
  const isOwner = cabinet ? isCabinetOwner(session, cabinet) : false;

  const cabinetProfile: CabinetSettingsValues | null = cabinet
    ? {
        name: cabinet.name,
        city: cabinet.city,
        country: cabinet.country,
        address: cabinet.address,
        phone: cabinet.phone,
        registreCommerce: cabinet.registreCommerce,
        niu: cabinet.niu,
        logoUrl: cabinet.logoUrl,
      }
    : null;

  const members = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      titre: users.titre,
      barreau: users.barreau,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.cabinetId, cabinetId))
    .orderBy(asc(users.createdAt));

  const pendingInvitations = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(
      and(eq(invitations.cabinetId, cabinetId), isNull(invitations.acceptedAt))
    )
    .orderBy(desc(invitations.createdAt));

  return (
    <div className="space-y-10">
      <header className="space-y-3 border-b border-brand-justice/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-justice/80">
          Cabinet
        </p>
        <h1 className="font-heading text-4xl font-semibold leading-tight text-brand-ink sm:text-5xl">
          {cabinet?.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {[cabinet?.city, cabinet?.country].filter(Boolean).join(" · ") ||
            "Lieu non renseigné"}
          {" · "}
          {members.length} membre{members.length > 1 ? "s" : ""}
        </p>
      </header>

      {cabinetProfile && (
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-xl font-semibold text-brand-ink">
              Identité du cabinet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isOwner
                ? "Coordonnées officielles et logo — visibles sur les exports PDF."
                : "Informations renseignées par le propriétaire du cabinet."}
            </p>
          </div>
          {isOwner ? (
            <div className="rounded-2xl border border-brand-justice/10 bg-card p-6 shadow-sm">
              <CabinetSettingsForm cabinet={cabinetProfile} />
            </div>
          ) : (
            <CabinetProfileCard cabinet={cabinetProfile} />
          )}
        </section>
      )}

      {canManage ? (
        <section className="rounded-2xl border border-brand-justice/10 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-gold/10 text-brand-gold">
              <Building2 className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="font-heading text-xl font-semibold text-brand-ink">
                Inviter un collaborateur
              </h2>
              <p className="text-sm text-muted-foreground">
                Un email d&apos;invitation sera envoyé. Le lien est valable 7
                jours.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <InvitationForm />
          </div>
        </section>
      ) : (
        <section
          role="note"
          className="flex items-start gap-3 rounded-2xl border border-brand-justice/10 bg-brand-parchment-dark/30 p-4 text-sm text-muted-foreground"
        >
          <Lock
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-justice/70"
            aria-hidden
          />
          <p>
            Vous consultez le cabinet en lecture seule. Seuls les
            administrateurs peuvent inviter, retirer ou modifier les membres.
          </p>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading text-xl font-semibold text-brand-ink">
            Membres
          </h2>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {members.length} total
          </span>
        </div>
        {members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-brand-justice/15 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun membre actif pour l&apos;instant.
          </p>
        ) : (
          <ul className="divide-y divide-brand-justice/10 overflow-hidden rounded-xl border border-brand-justice/10 bg-card shadow-sm">
            {members.map((m) => {
              const isOwnerRow = cabinet?.ownerId === m.id;
              const isSelf = m.id === session.user.id;

              return (
                <li
                  key={m.id}
                  className="grid gap-4 px-4 py-4 transition-colors hover:bg-brand-parchment-dark/25 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                >
                  <div className="flex min-w-0 gap-3">
                    <span
                      className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-justice/12 text-xs font-semibold text-brand-justice"
                      aria-hidden
                    >
                      {memberInitials(m.fullName, m.email)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {formatMemberDisplayName(
                            m.fullName,
                            m.email,
                            m.titre
                          )}
                        </p>
                        {isOwnerRow && (
                          <span
                            title="Propriétaire du cabinet"
                            className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200"
                          >
                            <Crown className="h-3 w-3" aria-hidden />
                            Propriétaire
                          </span>
                        )}
                        {isSelf && !isOwnerRow && (
                          <span className="text-[11px] text-muted-foreground">
                            (vous)
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.email}
                      </p>
                      {m.barreau && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                          {m.barreau}
                        </p>
                      )}
                    </div>
                  </div>
                  <MemberRowActions
                    userId={m.id}
                    email={m.email}
                    fullName={m.fullName}
                    titre={m.titre}
                    barreau={m.barreau}
                    currentRole={
                      m.role as "admin" | "avocat" | "collaborateur"
                    }
                    isCabinetOwner={isOwnerRow}
                    canManage={canManage}
                    isSelf={isSelf}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading text-xl font-semibold text-brand-ink">
            Invitations en attente
          </h2>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {pendingInvitations.length} en cours
          </span>
        </div>
        {pendingInvitations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-brand-justice/15 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune invitation en attente.
          </p>
        ) : (
          <ul className="divide-y divide-brand-justice/10 overflow-hidden rounded-xl border border-brand-justice/10 bg-card shadow-sm">
            {pendingInvitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-brand-parchment-dark/25"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-parchment-dark text-brand-justice/80">
                    <Mail className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {inv.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rôle proposé :{" "}
                      <span className="font-medium text-foreground/90">
                        {ROLE_LABEL[inv.role] ?? inv.role}
                      </span>
                      {" · "}
                      expire le {formatDate(inv.expiresAt)}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <form action={revokeInvitation}>
                    <input type="hidden" name="id" value={inv.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="border-brand-justice/20"
                      aria-label={`Révoquer l'invitation de ${inv.email}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Révoquer
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
