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
  "h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60";

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

function TitreSelect({
  currentTitre,
}: {
  currentTitre: TitreProfessionnel | "";
}) {
  const { pending } = useFormStatus();

  return (
    <select
      name="titre"
      defaultValue={currentTitre}
      aria-label="Titre professionnel"
      disabled={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={`${selectClassName} min-w-[7.5rem]`}
    >
      <option value="">— Titre —</option>
      {(Object.keys(TITRES_PROFESSIONNELS) as TitreProfessionnel[]).map(
        (t) => (
          <option key={t} value={t}>
            {TITRES_PROFESSIONNELS[t]}
          </option>
        )
      )}
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
      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      aria-label={`Retirer ${memberLabel} du cabinet`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <UserMinus className="h-4 w-4" aria-hidden />
      )}
      <span className="hidden sm:inline">Retirer</span>
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
    <div className="mt-3 w-full rounded-lg border border-brand-justice/15 bg-brand-parchment-dark/25 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-brand-ink">Modifier le membre</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted/50"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form action={action} className="space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <p className="text-[11px] text-muted-foreground">{email}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`edit-name-${userId}`} className="text-xs">
              Nom complet
            </Label>
            <Input
              id={`edit-name-${userId}`}
              name="fullName"
              required
              minLength={2}
              maxLength={120}
              defaultValue={storedName}
              placeholder="Prénom Nom"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Pour Avocat ou Huissier, saisissez le nom sans « Maître » — le
              préfixe est ajouté automatiquement.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-titre-${userId}`} className="text-xs">
              Titre
            </Label>
            <select
              id={`edit-titre-${userId}`}
              name="titre"
              defaultValue={titre ?? ""}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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
            <Label htmlFor={`edit-barreau-${userId}`} className="text-xs">
              Barreau
            </Label>
            <Input
              id={`edit-barreau-${userId}`}
              name="barreau"
              maxLength={120}
              defaultValue={barreauFieldDefault(barreau)}
              placeholder={DEFAULT_BARREAU}
              className="h-9 text-sm"
            />
          </div>
        </div>
        {state.error && (
          <p role="alert" className="text-xs text-destructive">
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

export function MemberRowActions({
  userId,
  email,
  fullName,
  titre,
  barreau,
  currentRole,
  isCabinetOwner,
  canManage,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  titre: string | null;
  barreau: string | null;
  currentRole: Role;
  isCabinetOwner: boolean;
  canManage: boolean;
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
    roleState.error ??
    titreState.error ??
    removeState.error ??
    null;
  const success =
    roleState.message ?? titreState.message ?? removeState.message ?? null;
  const memberLabel = fullName || email;

  const titreKey =
    titre && titre in TITRES_PROFESSIONNELS
      ? (titre as TitreProfessionnel)
      : "";
  const titreLabel = labelTitreProfessionnel(titre);

  if (!canManage || isCabinetOwner) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {titreLabel && (
            <span className="rounded-full border border-brand-justice/20 bg-brand-parchment-dark/40 px-2.5 py-0.5 text-[11px] font-medium text-brand-ink">
              {titreLabel}
            </span>
          )}
          <span className="rounded-full border border-brand-gold/30 bg-brand-gold/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-brand-ink">
            {ROLE_LABEL[currentRole] ?? currentRole}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-1 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <form action={titreAction} className="flex items-center">
          <input type="hidden" name="userId" value={userId} />
          <TitreSelect currentTitre={titreKey} />
        </form>
        <form action={roleAction} className="flex items-center">
          <input type="hidden" name="userId" value={userId} />
          <RoleSelect currentRole={localRole} onLocalChange={setLocalRole} />
        </form>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-brand-justice/20"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Modifier</span>
        </Button>
        <form action={removeAction}>
          <input type="hidden" name="userId" value={userId} />
          <RemoveButton memberLabel={memberLabel} />
        </form>
      </div>
      {feedback && (
        <p
          role="alert"
          className="text-right text-[11px] leading-tight text-destructive"
        >
          {feedback}
        </p>
      )}
      {!feedback && success && (
        <p
          role="status"
          className="text-right text-[11px] leading-tight text-emerald-700 dark:text-emerald-300"
        >
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
