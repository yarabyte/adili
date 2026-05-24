"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEcheance,
  deleteEcheance,
  updateEcheance,
} from "@/app/actions/echeances";
import type { AffaireMembreOption } from "@/lib/echeances/types";
import { TYPES_ECHEANCE } from "@/lib/validation/echeances";

const TYPE_LABELS: Record<(typeof TYPES_ECHEANCE)[number], string> = {
  audience: "Audience",
  depot: "Dépôt",
  signification: "Signification",
  delai_appel: "Délai d'appel",
  autre: "Autre",
};

export type EcheanceListItem = {
  id: string;
  titre: string;
  description: string | null;
  dateEcheance: string;
  type: (typeof TYPES_ECHEANCE)[number] | null;
  alerteJ7: boolean;
  alerteJ2: boolean;
  alerteJ1: boolean;
  statut: "a_venir" | "passee" | "annulee";
  responsableId: string | null;
  responsableLabel: string | null;
  createdByLabel: string | null;
  createdAt: string;
};

function membreLabel(m: AffaireMembreOption): string {
  const name = m.fullName?.trim() || m.email;
  return `${name} (${m.roleLabel})`;
}

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

function formatEcheanceWhen(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function rowVisualState(row: EcheanceListItem): {
  label: string;
  rowClass: string;
} {
  if (row.statut === "annulee") {
    return { label: "Annulée", rowClass: "opacity-60" };
  }
  if (row.statut === "passee") {
    return { label: "Passée", rowClass: "" };
  }
  const overdue = new Date(row.dateEcheance).getTime() < Date.now();
  if (overdue) {
    return { label: "Échue", rowClass: "border-amber-500/35 bg-amber-500/[0.06]" };
  }
  return { label: "À venir", rowClass: "" };
}

export function EcheancesPanel({
  affaireId,
  echeances,
  membreOptions,
  defaultResponsableId,
  canCreate,
  canModify,
  canDelete,
}: {
  affaireId: string;
  echeances: EcheanceListItem[];
  membreOptions: AffaireMembreOption[];
  defaultResponsableId: string;
  canCreate: boolean;
  canModify: boolean;
  canDelete: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...echeances].sort(
        (a, b) =>
          new Date(a.dateEcheance).getTime() -
          new Date(b.dateEcheance).getTime()
      ),
    [echeances]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-brand-ink">
            Échéances & alertes
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Audiences, dépôts et délais liés au dossier. La personne
            responsable est notifiée par email à l&apos;enregistrement ; les
            rappels J-7, J-2 et J-1 seront envoyés lorsque le service sera
            activé.
          </p>
        </div>
      </div>

      {canCreate && membreOptions.length > 0 && (
        <AddEcheanceForm
          affaireId={affaireId}
          membreOptions={membreOptions}
          defaultResponsableId={defaultResponsableId}
        />
      )}
      {canCreate && membreOptions.length === 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-900">
          Ajoutez au moins un membre au dossier avant de créer une échéance.
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-justice/15 bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
          {canCreate
            ? "Aucune échéance pour le moment. Ajoutez-en une ci-dessus."
            : "Aucune échéance enregistrée pour cette affaire."}
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((row) => (
            <EcheanceRow
              key={row.id}
              affaireId={affaireId}
              row={row}
              membreOptions={membreOptions}
              canModify={canModify}
              canDelete={canDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddEcheanceForm({
  affaireId,
  membreOptions,
  defaultResponsableId,
}: {
  affaireId: string;
  membreOptions: AffaireMembreOption[];
  defaultResponsableId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function submit(formData: FormData) {
    setError(null);
    setWarning(null);
    setFieldErrors({});
    const titre = String(formData.get("titre") ?? "").trim();
    const descriptionRaw = String(formData.get("description") ?? "").trim();
    const dateEcheance = String(formData.get("dateEcheance") ?? "");
    const responsableId = String(formData.get("responsableId") ?? "");
    const typeRaw = String(formData.get("type") ?? "");
    const type =
      typeRaw && (TYPES_ECHEANCE as readonly string[]).includes(typeRaw)
        ? (typeRaw as (typeof TYPES_ECHEANCE)[number])
        : null;

    const payload = {
      titre,
      description: descriptionRaw || null,
      dateEcheance: new Date(dateEcheance).toISOString(),
      type,
      alerteJ7: formData.get("alerteJ7") === "on",
      alerteJ2: formData.get("alerteJ2") === "on",
      alerteJ1: formData.get("alerteJ1") === "on",
      responsableId,
    };

    startTransition(async () => {
      const res = await createEcheance(affaireId, payload);
      if (res.error) setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      if (res.warning) setWarning(res.warning);
      if (res.ok) {
        if (!res.warning) setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} className="self-start">
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter une échéance
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="space-y-4 rounded-xl border border-brand-justice/15 bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-ink">Nouvelle échéance</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            setOpen(false);
            setError(null);
            setWarning(null);
            setFieldErrors({});
          }}
        >
          Fermer
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ec-titre">Titre</Label>
          <Input id="ec-titre" name="titre" required maxLength={200} placeholder="ex. Audience devant le juge des référés" />
          {fieldErrors.titre && (
            <p className="text-[12px] text-destructive">{fieldErrors.titre}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ec-type">Type</Label>
          <select
            id="ec-type"
            name="type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            defaultValue=""
          >
            <option value="">—</option>
            {TYPES_ECHEANCE.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ec-date">Date & heure</Label>
          <Input
            id="ec-date"
            name="dateEcheance"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocalValue(new Date().toISOString())}
          />
          {fieldErrors.dateEcheance && (
            <p className="text-[12px] text-destructive">{fieldErrors.dateEcheance}</p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ec-responsable">Personne responsable</Label>
          <select
            id="ec-responsable"
            name="responsableId"
            required
            className={selectClassName}
            defaultValue={defaultResponsableId}
          >
            {membreOptions.map((m) => (
              <option key={m.userId} value={m.userId}>
                {membreLabel(m)}
              </option>
            ))}
          </select>
          <p className="text-[11.5px] text-muted-foreground">
            Notifiée par email à l&apos;enregistrement de l&apos;échéance.
          </p>
          {fieldErrors.responsableId && (
            <p className="text-[12px] text-destructive">
              {fieldErrors.responsableId}
            </p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ec-desc">Description (optionnel)</Label>
          <textarea
            id="ec-desc"
            name="description"
            rows={2}
            maxLength={2000}
            className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Précisions utiles pour l'équipe…"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[12px] font-medium text-muted-foreground">
          Rappels par email (à l&apos;activation du service)
        </legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" name="alerteJ7" defaultChecked className="rounded border-input" />
            J-7
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" name="alerteJ2" defaultChecked className="rounded border-input" />
            J-2
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" name="alerteJ1" defaultChecked className="rounded border-input" />
            J-1
          </label>
        </div>
      </fieldset>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {warning && (
        <p className="text-sm text-amber-800" role="status">
          {warning}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Enregistrement…
            </>
          ) : (
            "Enregistrer"
          )}
        </Button>
      </div>
    </form>
  );
}

function EcheanceRow({
  affaireId,
  row,
  membreOptions,
  canModify,
  canDelete,
}: {
  affaireId: string;
  row: EcheanceListItem;
  membreOptions: AffaireMembreOption[];
  canModify: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const vs = rowVisualState(row);

  function submitEdit(formData: FormData) {
    setError(null);
    setWarning(null);
    setFieldErrors({});
    const titre = String(formData.get("titre") ?? "").trim();
    const descriptionRaw = String(formData.get("description") ?? "").trim();
    const dateEcheance = String(formData.get("dateEcheance") ?? "");
    const responsableId = String(formData.get("responsableId") ?? "");
    const typeRaw = String(formData.get("type") ?? "");
    const type =
      typeRaw && (TYPES_ECHEANCE as readonly string[]).includes(typeRaw)
        ? (typeRaw as (typeof TYPES_ECHEANCE)[number])
        : null;

    startTransition(async () => {
      const res = await updateEcheance(affaireId, {
        id: row.id,
        titre,
        description: descriptionRaw || null,
        dateEcheance: new Date(dateEcheance).toISOString(),
        type,
        alerteJ7: formData.get("alerteJ7") === "on",
        alerteJ2: formData.get("alerteJ2") === "on",
        alerteJ1: formData.get("alerteJ1") === "on",
        responsableId,
      });
      if (res.error) setError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      if (res.warning) setWarning(res.warning);
      if (res.ok) {
        if (!res.warning) setEditing(false);
        router.refresh();
      }
    });
  }

  function confirmDelete() {
    if (!window.confirm("Supprimer définitivement cette échéance ?")) return;
    startTransition(async () => {
      const res = await deleteEcheance(affaireId, row.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  if (editing && canModify) {
    return (
      <li className="rounded-xl border border-brand-justice/15 bg-card p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitEdit(new FormData(e.currentTarget));
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`edit-t-${row.id}`}>Titre</Label>
              <Input id={`edit-t-${row.id}`} name="titre" required maxLength={200} defaultValue={row.titre} />
              {fieldErrors.titre && (
                <p className="text-[12px] text-destructive">{fieldErrors.titre}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-type-${row.id}`}>Type</Label>
              <select
                id={`edit-type-${row.id}`}
                name="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                defaultValue={row.type ?? ""}
              >
                <option value="">—</option>
                {TYPES_ECHEANCE.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-d-${row.id}`}>Date & heure</Label>
              <Input
                id={`edit-d-${row.id}`}
                name="dateEcheance"
                type="datetime-local"
                required
                defaultValue={toDatetimeLocalValue(row.dateEcheance)}
              />
              {fieldErrors.dateEcheance && (
                <p className="text-[12px] text-destructive">{fieldErrors.dateEcheance}</p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`edit-resp-${row.id}`}>Personne responsable</Label>
              <select
                id={`edit-resp-${row.id}`}
                name="responsableId"
                required
                className={selectClassName}
                defaultValue={row.responsableId ?? membreOptions[0]?.userId ?? ""}
              >
                {membreOptions.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {membreLabel(m)}
                  </option>
                ))}
              </select>
              {fieldErrors.responsableId && (
                <p className="text-[12px] text-destructive">
                  {fieldErrors.responsableId}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`edit-desc-${row.id}`}>Description</Label>
              <textarea
                id={`edit-desc-${row.id}`}
                name="description"
                rows={2}
                maxLength={2000}
                defaultValue={row.description ?? ""}
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-[12px] font-medium text-muted-foreground">
              Rappels email
            </legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="alerteJ7" defaultChecked={row.alerteJ7} className="rounded border-input" />
                J-7
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="alerteJ2" defaultChecked={row.alerteJ2} className="rounded border-input" />
                J-2
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" name="alerteJ1" defaultChecked={row.alerteJ1} className="rounded border-input" />
                J-1
              </label>
            </div>
          </fieldset>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {warning && <p className="text-sm text-amber-800">{warning}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border border-brand-justice/10 bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between ${vs.rowClass}`}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-gold/10 text-brand-gold">
          <CalendarClock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{row.titre}</p>
            <span className="rounded-full border border-brand-justice/15 bg-brand-parchment-dark/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {vs.label}
            </span>
            {row.type && (
              <span className="rounded-full border border-brand-justice/10 bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                {TYPE_LABELS[row.type]}
              </span>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground">
            {formatEcheanceWhen(row.dateEcheance)}
          </p>
          {row.description && (
            <p className="text-sm leading-relaxed text-foreground/80">{row.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            {row.responsableLabel && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3 w-3" aria-hidden />
                Responsable : {row.responsableLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" aria-hidden />
              Notifié par email
            </span>
            <span className="inline-flex items-center gap-1">
              <Bell className="h-3 w-3" aria-hidden />
              {row.alerteJ7 ? "J-7" : ""}
              {row.alerteJ7 && (row.alerteJ2 || row.alerteJ1) ? " · " : ""}
              {row.alerteJ2 ? "J-2" : ""}
              {row.alerteJ2 && row.alerteJ1 ? " · " : ""}
              {row.alerteJ1 ? "J-1" : ""}
              {!row.alerteJ7 && !row.alerteJ2 && !row.alerteJ1 ? "Aucun rappel" : ""}
            </span>
            {row.createdByLabel && (
              <span className="text-muted-foreground/80">· Créée par {row.createdByLabel}</span>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
      {(canModify || canDelete) && (
        <div className="flex shrink-0 gap-1 self-end sm:self-start">
          {canModify && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Modifier l'échéance"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive"
              aria-label="Supprimer l'échéance"
              disabled={pending}
              onClick={confirmDelete}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
