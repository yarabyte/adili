"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Loader2, NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCompteRendu,
  updateCompteRendu,
} from "@/app/actions/comptes-rendus";
import {
  DUREE_DEFAUT_CR,
  LABELS_CR,
  TYPES_CR,
  TYPES_CR_CONFIDENTIELS,
} from "@/lib/constants/types-comptes-rendus";
import type { AffaireMembreOption } from "@/lib/echeances/types";
import type { AdversaireAffaire, CompteRenduFormData } from "@/lib/comptes-rendus/types";
import { cn } from "@/lib/utils";

import { CrActionsBuilder } from "./cr-actions-builder";
import { CrParticipantsBuilder } from "./cr-participants-builder";
import { CrPiecesBuilder } from "./cr-pieces-builder";
import { useCrSaveQueue } from "./cr-save-queue";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const SAVE_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function defaultDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-brand-justice/12 bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="font-medium text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="border-t border-brand-justice/8 px-4 py-4">{children}</div>}
    </div>
  );
}

export function CrForm({
  mode,
  affaireId,
  compteRenduId,
  initial,
  disabled,
  membreOptions,
  adversaires,
}: {
  mode: "create" | "edit";
  affaireId: string;
  compteRenduId?: string;
  initial?: Partial<CompteRenduFormData>;
  disabled?: boolean;
  membreOptions: AffaireMembreOption[];
  adversaires: AdversaireAffaire[];
}) {
  const { enqueue, setFormSaving } = useCrSaveQueue();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [typeCr, setTypeCr] = useState(initial?.typeCr ?? "");
  const [titre, setTitre] = useState(initial?.titre ?? "");
  const [dateEvenement, setDateEvenement] = useState(
    initial?.dateEvenement
      ? initial.dateEvenement.slice(0, 16)
      : defaultDatetimeLocal()
  );
  const [dureeMinutes, setDureeMinutes] = useState<number | "">(
    initial?.dureeMinutes ?? ""
  );
  const [lieu, setLieu] = useState(initial?.lieu ?? "");
  const [participants, setParticipants] = useState(initial?.participants ?? []);
  const [decisionsActions, setDecisionsActions] = useState(
    initial?.decisionsActions ?? []
  );
  const [piecesRemises, setPiecesRemises] = useState(initial?.piecesRemises ?? []);
  const [soumisValidation, setSoumisValidation] = useState(
    initial?.soumisValidation ?? false
  );
  const [confidentialite, setConfidentialite] = useState<
    "standard" | "sensible"
  >(initial?.confidentialite ?? "standard");

  const suggestedConfidential = useMemo(
    () => typeCr && TYPES_CR_CONFIDENTIELS.has(typeCr),
    [typeCr]
  );

  function onTypeChange(next: string) {
    setTypeCr(next);
    if (!titre.trim() && next) {
      const d = new Date(dateEvenement);
      if (!Number.isNaN(d.getTime())) {
        const label = LABELS_CR[next] ?? next;
        const dateStr = new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(d);
        setTitre(`${label} — ${dateStr}`);
      }
    }
    if (dureeMinutes === "" && next && DUREE_DEFAUT_CR[next]) {
      setDureeMinutes(DUREE_DEFAUT_CR[next]);
    }
    if (TYPES_CR_CONFIDENTIELS.has(next)) {
      setConfidentialite("sensible");
    }
  }

  function buildPayload() {
    return {
      typeCr,
      titre: titre.trim() || undefined,
      dateEvenement: new Date(dateEvenement).toISOString(),
      dureeMinutes: dureeMinutes === "" ? null : Number(dureeMinutes),
      lieu: lieu.trim() || null,
      participants,
      decisionsActions,
      piecesRemises,
      soumisValidation,
      confidentialite,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setFieldErrors({});
    setSaving(true);
    setFormSaving(true);

    try {
      if (mode === "create") {
        await createCompteRendu(affaireId, buildPayload());
      } else if (compteRenduId) {
        const res = await withTimeout(
          enqueue(() =>
            updateCompteRendu(affaireId, {
              id: compteRenduId,
              ...buildPayload(),
            })
          ),
          SAVE_TIMEOUT_MS,
          "La sauvegarde a pris trop de temps. Vérifiez votre connexion à la base, puis réessayez."
        );
        if (res.error) setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        if (res.ok) setSaved(true);
      }
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "digest" in err &&
        String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setSaving(false);
      setFormSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Section title="Identification" defaultOpen>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="typeCr">Type de compte rendu</Label>
            <select
              id="typeCr"
              required
              disabled={disabled}
              className={selectClassName}
              value={typeCr}
              onChange={(e) => onTypeChange(e.target.value)}
            >
              <option value="" disabled>
                Choisir un type
              </option>
              {Object.entries(TYPES_CR).map(([key, cat]) => (
                <optgroup key={key} label={cat.label}>
                  {cat.items.map((item) => (
                    <option key={item} value={item}>
                      {LABELS_CR[item] ?? item}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {fieldErrors.typeCr && (
              <p className="text-xs text-destructive">{fieldErrors.typeCr}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="titre">Titre</Label>
            <Input
              id="titre"
              disabled={disabled}
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Généré automatiquement si vide"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateEvenement">Date et heure de l&apos;événement</Label>
            <Input
              id="dateEvenement"
              type="datetime-local"
              required
              disabled={disabled}
              value={dateEvenement}
              onChange={(e) => setDateEvenement(e.target.value)}
            />
            {fieldErrors.dateEvenement && (
              <p className="text-xs text-destructive">
                {fieldErrors.dateEvenement}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duree">Durée (minutes)</Label>
            <Input
              id="duree"
              type="number"
              min={1}
              max={1440}
              disabled={disabled}
              value={dureeMinutes}
              onChange={(e) =>
                setDureeMinutes(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lieu">Lieu</Label>
            <Input
              id="lieu"
              disabled={disabled}
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              placeholder="TGI Douala salle 3, cabinet client, visio…"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Participants"
        description="Présents à l'événement (magistrats, parties, experts…)"
        defaultOpen={mode === "create"}
      >
        <CrParticipantsBuilder
          value={participants}
          onChange={setParticipants}
          disabled={disabled}
          membreOptions={membreOptions}
          adversaires={adversaires}
        />
      </Section>

      <Section
        title="Décisions & actions"
        description="Décisions rendues et tâches à suivre"
        defaultOpen={false}
      >
        <CrActionsBuilder
          value={decisionsActions}
          onChange={setDecisionsActions}
          disabled={disabled}
          membreOptions={membreOptions}
        />
      </Section>

      <Section title="Pièces remises / reçues" defaultOpen={false}>
        <CrPiecesBuilder
          value={piecesRemises}
          onChange={setPiecesRemises}
          disabled={disabled}
        />
      </Section>

      <Section title="Options" defaultOpen>
        <div className="space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              disabled={disabled}
              checked={soumisValidation}
              onChange={(e) => setSoumisValidation(e.target.checked)}
              className="mt-1 rounded border-input"
            />
            <span>
              <span className="font-medium">Soumettre à validation</span>
              <span className="mt-0.5 block text-muted-foreground">
                Si coché, un administrateur du cabinet devra valider le compte
                rendu avant archivage définitif.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              disabled={disabled}
              checked={confidentialite === "sensible"}
              onChange={(e) =>
                setConfidentialite(e.target.checked ? "sensible" : "standard")
              }
              className="mt-1 rounded border-input"
            />
            <span>
              <span className="font-medium">Confidentialité renforcée</span>
              {suggestedConfidential && (
                <span className="ml-1 text-xs text-amber-700">
                  (recommandé pour ce type)
                </span>
              )}
              <span className="mt-0.5 block text-muted-foreground">
                Visible en détail uniquement par l&apos;auteur, le responsable du
                dossier et les administrateurs.
              </span>
            </span>
          </label>
        </div>
      </Section>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!disabled && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <p className="text-sm text-muted-foreground">Informations enregistrées.</p>
          )}
          <Button type="submit" disabled={saving || !typeCr}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <NotebookPen className="h-4 w-4" />
            )}
            {mode === "create" ? "Créer et rédiger" : "Enregistrer les informations"}
          </Button>
        </div>
      )}
    </form>
  );
}
