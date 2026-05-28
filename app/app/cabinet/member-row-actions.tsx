"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Pencil, UserMinus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TITRES_PROFESSIONNELS,
  labelTitreProfessionnel,
  type TitreProfessionnel,
} from "@/lib/constants/titres-professionnels";
import { barreauFieldDefault, DEFAULT_BARREAU } from "@/lib/constants/barreau";
import { cn } from "@/lib/utils";
import {
  removeMember,
  updateMemberDetails,
  updateMemberRole,
  updateMemberTitre,
  type MemberActionState,
} from "@/app/actions/members";

type Role = "admin" | "avocat" | "collaborateur";

const initialState: MemberActionState = {};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  avocat: "Avocat",
  collaborateur: "Collaborateur",
};

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60";

function MemberBadge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "gold" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        variant === "gold" &&
          "border-brand-gold/35 bg-brand-gold/10 uppercase tracking-wider text-brand-ink",
        variant === "muted" &&
          "border-brand-justice/15 bg-brand-parchment-dark/50 text-brand-ink",
        variant === "default" &&
          "border-brand-justice/20 bg-background text-foreground"
      )}
    >
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function RoleSelect({
  currentRole,
  onLocalChange,
}: {
  currentRole: Role;
  onLocalChange: (role: Role) => void;
}) {
  const { pending } = useFormStatus();

  return (
    <select
      name="role"
      defaultValue={currentRole}
      aria-label="Rôle dans le cabinet"
      disabled={pending}
      onChange={(e) => {
        onLocalChange(e.target.value as Role);
        e.currentTarget.form?.requestSubmit();
      }}
      className={selectClassName}
    >
      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  );
}

function TitreSelect({ currentTitre }: { currentTitre: TitreProfessionnel | "" }) {
  const { pending } = useFormStatus();

  return (
    <select
      name="titre"
      defaultValue={currentTitre}
      aria-label="Titre professionnel"
      disabled={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={selectClassName}
    >
      <option value="">Non renseigné</option>
      {(Object.keys(TITRES_PROFESSIONNELS) as TitreProfessionnel[]).map((t) => (
        <option key={t} value={t}>
          {TITRES_PROFESSIONNELS[t]}
        </option>
      ))}
    </select>
  );
}

function RemoveButton({ memberLabel }: { memberLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={(e) => {
        if (
          !window.confirm(
            `Retirer ${memberLabel} du cabinet ?\n\nIl perdra immédiatement l'accès. Son compte reste actif et il pourra rejoindre un autre cabinet sur invitation.`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      aria-label={`Retirer ${memberLabel} du cabinet`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <UserMinus className="h-4 w-4" aria-hidden />
      )}
      Retirer
    </Button>
  );
}

function MemberEditPanel({
  userId,
  email,
  fullName,
  titre,
  barreau,
  onClose,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  titre: string | null;
  barreau: string | null;
  onClose: () => void;
}) {
  const [state, action] = useFormState(updateMemberDetails, initialState);
  const storedName = (fullName ?? "").replace(/^(maître|maitre)\s+/i, "").trim();

  useEffect(() => {
    if (state.message) onClose();
  }, [state.message, onClose]);

  return (
    <div className="col-span-full mt-1 rounded-lg border border-brand-justice/15 bg-brand-parchment-dark/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-brand-ink">Profil du membre</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form action={action} className="space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <p className="text-xs text-muted-foreground">{email}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`edit-name-${userId}`}>Nom complet</Label>
            <Input
              id={`edit-name-${userId}`}
              name="fullName"
              required
              minLength={2}
              maxLength={120}
              defaultValue={storedName}
              placeholder="Prénom Nom"
            />
            <p className="text-[11px] text-muted-foreground">
              Pour avocat ou huissier, saisissez le nom sans « Maître » — le
              préfixe est ajouté automatiquement.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-titre-${userId}`}>Titre professionnel</Label>
            <select
              id={`edit-titre-${userId}`}
              name="titre"
              defaultValue={titre ?? ""}
              className={selectClassName}
            >
              <option value="">Non renseigné</option>
              {(Object.keys(TITRES_PROFESSIONNELS) as TitreProfessionnel[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {TITRES_PROFESSIONNELS[t]}
                  </option>
                )
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-barreau-${userId}`}>Barreau</Label>
            <Input
              id={`edit-barreau-${userId}`}
              name="barreau"
              maxLength={120}
              defaultValue={barreauFieldDefault(barreau)}
              placeholder={DEFAULT_BARREAU}
            />
          </div>
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <SaveDetailsButton />
        </div>
      </form>
    </div>
  );
}

function SaveDetailsButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      Enregistrer
    </Button>
  );
}

function ReadOnlyMeta({
  titreLabel,
  roleLabel,
}: {
  titreLabel: string | null;
  roleLabel: string;
}) {
  return (
    <div className="flex min-w-[12rem] flex-col gap-2 sm:min-w-[14rem]">
      <div>
        <FieldLabel>Titre professionnel</FieldLabel>
        <MemberBadge variant="muted">
          {titreLabel ?? "Non renseigné"}
        </MemberBadge>
      </div>
      <div>
        <FieldLabel>Rôle cabinet</FieldLabel>
        <MemberBadge variant="gold">{roleLabel}</MemberBadge>
      </div>
    </div>
  );
}

export function MemberRowActions({
  userId,
  email,
  fullName,
  titre,
  barreau,
  currentRole,
  isCabinetOwner,
  canManage,
  isSelf,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  titre: string | null;
  barreau: string | null;
  currentRole: Role;
  isCabinetOwner: boolean;
  canManage: boolean;
  isSelf?: boolean;
}) {
  const [roleState, roleAction] = useFormState(updateMemberRole, initialState);
  const [titreState, titreAction] = useFormState(updateMemberTitre, initialState);
  const [removeState, removeAction] = useFormState(removeMember, initialState);
  const [localRole, setLocalRole] = useState<Role>(currentRole);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setLocalRole(currentRole);
  }, [currentRole]);

  const feedback =
    roleState.error ?? titreState.error ?? removeState.error ?? null;
  const success =
    roleState.message ?? titreState.message ?? removeState.message ?? null;
  const memberLabel = fullName || email;

  const titreKey =
    titre && titre in TITRES_PROFESSIONNELS
      ? (titre as TitreProfessionnel)
      : "";
  const titreLabel = labelTitreProfessionnel(titre);
  const roleLabel = ROLE_LABEL[currentRole] ?? currentRole;

  if (!canManage || isCabinetOwner || isSelf) {
    return (
      <div className="w-full sm:w-auto">
        <ReadOnlyMeta titreLabel={titreLabel} roleLabel={roleLabel} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 sm:w-auto sm:min-w-[min(100%,20rem)]">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <form action={titreAction}>
            <input type="hidden" name="userId" value={userId} />
            <FieldLabel>Titre professionnel</FieldLabel>
            <TitreSelect currentTitre={titreKey} />
          </form>
        </div>
        <div>
          <form action={roleAction}>
            <input type="hidden" name="userId" value={userId} />
            <FieldLabel>Rôle cabinet</FieldLabel>
            <RoleSelect currentRole={localRole} onLocalChange={setLocalRole} />
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-brand-justice/10 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 border-brand-justice/20 sm:flex-none"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Profil
        </Button>
        <form action={removeAction} className="flex-1 sm:flex-none">
          <input type="hidden" name="userId" value={userId} />
          <RemoveButton memberLabel={memberLabel} />
        </form>
      </div>

      {feedback && (
        <p role="alert" className="text-xs text-destructive">
          {feedback}
        </p>
      )}
      {!feedback && success && (
        <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">
          {success}
        </p>
      )}

      {editing && (
        <MemberEditPanel
          userId={userId}
          email={email}
          fullName={fullName}
          titre={titre}
          barreau={barreau}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
