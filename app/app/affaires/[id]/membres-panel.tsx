"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Loader2,
  UserMinus,
  UserPlus,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  addAffaireMembre,
  removeAffaireMembre,
  updateAffaireMembreRole,
} from "@/app/actions/affaire-membres";
import { ROLES_AFFAIRE_LABEL } from "@/lib/constants/statuts";
import { formatMemberDisplayName } from "@/lib/users/display-name";

type RoleAffaire = "responsable" | "contributeur" | "lecteur";

type Membre = {
  userId: string;
  role: RoleAffaire;
  addedAt: Date;
  userFullName: string | null;
  userEmail: string;
  userTitre: string | null;
};

type AddableUser = {
  id: string;
  fullName: string | null;
  email: string;
  titre: string | null;
  role: "admin" | "avocat" | "collaborateur";
};

type Adversaire = { nom: string; qualite?: string | null; conseil?: string | null };

export function MembresPanel({
  affaireId,
  responsableId,
  membres,
  addableUsers,
  canManage,
  currentUserId,
  adversaires,
}: {
  affaireId: string;
  responsableId: string;
  membres: Membre[];
  addableUsers: AddableUser[];
  canManage: boolean;
  currentUserId: string;
  adversaires: Adversaire[];
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <header className="flex items-baseline justify-between gap-2">
          <h3 className="font-heading text-lg font-semibold text-brand-ink">
            Équipe affectée
          </h3>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {membres.length} membre{membres.length > 1 ? "s" : ""}
          </span>
        </header>

        {canManage && addableUsers.length > 0 && (
          <AddMemberForm affaireId={affaireId} addableUsers={addableUsers} />
        )}

        {membres.length === 0 ? (
          <p className="rounded-xl border border-dashed border-brand-justice/15 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun membre affecté.
          </p>
        ) : (
          <ul className="divide-y divide-brand-justice/10 overflow-hidden rounded-xl border border-brand-justice/10 bg-card shadow-sm">
            {membres.map((m) => (
              <MembreRow
                key={m.userId}
                affaireId={affaireId}
                membre={m}
                isResponsable={m.userId === responsableId}
                isSelf={m.userId === currentUserId}
                canManage={canManage}
              />
            ))}
          </ul>
        )}
      </section>

      {adversaires.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-heading text-lg font-semibold text-brand-ink">
            Parties adverses
          </h3>
          <ul className="divide-y divide-brand-justice/10 overflow-hidden rounded-xl border border-brand-justice/10 bg-card shadow-sm">
            {adversaires.map((a, i) => (
              <li
                key={i}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="font-medium text-foreground">{a.nom}</span>
                <span className="text-[12.5px] text-muted-foreground">
                  {[a.qualite, a.conseil ? `Conseil : ${a.conseil}` : null]
                    .filter(Boolean)
                    .join(" · ") || ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AddMemberForm({
  affaireId,
  addableUsers,
}: {
  affaireId: string;
  addableUsers: AddableUser[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [role, setRole] = useState<RoleAffaire>("contributeur");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!userId) {
      setError("Sélectionnez un membre du cabinet.");
      return;
    }
    startTransition(async () => {
      const res = await addAffaireMembre(affaireId, { userId, role });
      if (res.error) setError(res.error);
      else {
        setUserId("");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-brand-justice/10 bg-card p-3 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          aria-label="Membre à ajouter"
          disabled={pending}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Choisir un membre du cabinet…</option>
          {addableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {formatMemberDisplayName(u.fullName, u.email, u.titre)}
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleAffaire)}
          aria-label="Rôle sur l'affaire"
          disabled={pending}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {(Object.keys(ROLES_AFFAIRE_LABEL) as RoleAffaire[]).map((r) => (
            <option key={r} value={r}>
              {ROLES_AFFAIRE_LABEL[r]}
            </option>
          ))}
        </select>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden />
          )}
          Ajouter
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function MembreRow({
  affaireId,
  membre,
  isResponsable,
  isSelf,
  canManage,
}: {
  affaireId: string;
  membre: Membre;
  isResponsable: boolean;
  isSelf: boolean;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function changeRole(role: RoleAffaire) {
    setError(null);
    startTransition(async () => {
      const res = await updateAffaireMembreRole(affaireId, {
        userId: membre.userId,
        role,
      });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function remove() {
    if (
      !window.confirm(
        `Retirer ${formatMemberDisplayName(membre.userFullName, membre.userEmail, membre.userTitre)} de cette affaire ?`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await removeAffaireMembre(affaireId, membre.userId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  const showActions = canManage && !isResponsable;

  return (
    <li className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-brand-parchment-dark/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-justice/10 text-brand-justice">
          {isResponsable ? (
            <Crown className="h-4 w-4 text-amber-600" aria-hidden />
          ) : (
            <UserRound className="h-4 w-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {formatMemberDisplayName(
              membre.userFullName,
              membre.userEmail,
              membre.userTitre
            )}
            {isSelf && (
              <span className="ml-1 text-[12px] font-normal text-muted-foreground">
                (vous)
              </span>
            )}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {membre.userEmail}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {showActions ? (
          <>
            <select
              value={membre.role}
              onChange={(e) => changeRole(e.target.value as RoleAffaire)}
              disabled={pending}
              aria-label="Rôle"
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
            >
              {(Object.keys(ROLES_AFFAIRE_LABEL) as RoleAffaire[]).map((r) => (
                <option key={r} value={r}>
                  {ROLES_AFFAIRE_LABEL[r]}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={remove}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Retirer"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <UserMinus className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </>
        ) : (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
              isResponsable
                ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                : "border-brand-gold/30 bg-brand-gold/10 text-brand-ink"
            }`}
          >
            {ROLES_AFFAIRE_LABEL[membre.role]}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

