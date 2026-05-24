"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import {
  AlertCircle,
  Loader2,
  Lock,
  Plus,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  LABELS_CONTENTIEUX,
  TYPES_CONTENTIEUX,
} from "@/lib/constants/types-contentieux";
import { createAffaire, type AffaireActionState } from "@/app/actions/affaires";
import { formatMemberDisplayName } from "@/lib/users/display-name";

type ClientOption = {
  id: string;
  nom: string;
  type: "personne_physique" | "personne_morale" | null;
};

type MemberOption = {
  id: string;
  fullName: string | null;
  email: string;
  titre: string | null;
  role: "admin" | "avocat" | "collaborateur";
};

type AdversairePart = { nom: string; qualite: string; conseil: string };

const initialState: AffaireActionState = {};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="min-w-[200px] shadow-sm">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Création en cours…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" aria-hidden />
          Créer l&apos;affaire
        </>
      )}
    </Button>
  );
}

export function AffaireForm({
  clients,
  members,
  currentUserId,
}: {
  clients: ClientOption[];
  members: MemberOption[];
  currentUserId: string;
}) {
  const [state, action] = useFormState(createAffaire, initialState);

  const [clientMode, setClientMode] = useState<"existing" | "new">(
    clients.length > 0 ? "existing" : "new"
  );
  const [adversaires, setAdversaires] = useState<AdversairePart[]>([]);

  function addAdversaire() {
    setAdversaires((cur) => [...cur, { nom: "", qualite: "", conseil: "" }]);
  }
  function updateAdversaire(i: number, patch: Partial<AdversairePart>) {
    setAdversaires((cur) =>
      cur.map((a, idx) => (idx === i ? { ...a, ...patch } : a))
    );
  }
  function removeAdversaire(i: number) {
    setAdversaires((cur) => cur.filter((_, idx) => idx !== i));
  }

  const cleanAdversaires = adversaires
    .map((a) => ({
      nom: a.nom.trim(),
      qualite: a.qualite.trim() || null,
      conseil: a.conseil.trim() || null,
    }))
    .filter((a) => a.nom.length > 0);

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={action} className="space-y-6">
      <input
        type="hidden"
        name="adversaires"
        value={JSON.stringify(cleanAdversaires)}
      />
      <input type="hidden" name="clientMode" value={clientMode} />

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <p>{state.error}</p>
        </div>
      )}

      <section className="rounded-2xl border border-brand-justice/10 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-brand-ink">
          Identification de l&apos;affaire
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          La référence est générée automatiquement (ex. <code>2026-001</code>)
          si vous la laissez vide.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="space-y-2">
            <Label htmlFor="reference">Référence</Label>
            <Input
              id="reference"
              name="reference"
              placeholder="2026-001"
              className="font-mono tabular-nums"
            />
            {err("reference") && (
              <p className="text-[12px] text-destructive">{err("reference")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="intitule">
              Intitulé <span className="text-destructive">*</span>
            </Label>
            <Input
              id="intitule"
              name="intitule"
              required
              minLength={3}
              placeholder="SARL Fokou c/ Banque Atlantique SA"
            />
            {err("intitule") && (
              <p className="text-[12px] text-destructive">{err("intitule")}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="typeContentieux">
              Type de contentieux <span className="text-destructive">*</span>
            </Label>
            <select
              id="typeContentieux"
              name="typeContentieux"
              required
              defaultValue="commercial"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TYPES_CONTENTIEUX.map((t) => (
                <option key={t} value={t}>
                  {LABELS_CONTENTIEUX[t]}
                </option>
              ))}
            </select>
            {err("typeContentieux") && (
              <p className="text-[12px] text-destructive">
                {err("typeContentieux")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="juridiction">Juridiction</Label>
            <Input
              id="juridiction"
              name="juridiction"
              placeholder="TGI Douala — Ch. commerciale"
            />
          </div>
        </div>
      </section>

      {/* ─── CLIENT ─── */}
      <section className="rounded-2xl border border-brand-justice/10 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-brand-ink">
          Client
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Un client par affaire au MVP. Vous pourrez détailler ses
          coordonnées plus tard.
        </p>
        <div className="mt-4">
          <Tabs
            value={clientMode}
            onValueChange={(v) => setClientMode(v as "existing" | "new")}
          >
            <TabsList className="max-w-md">
              <TabsTrigger value="existing" disabled={clients.length === 0}>
                Client existant
                {clients.length > 0 && (
                  <span className="ml-1 rounded bg-brand-justice/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-justice">
                    {clients.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="new">
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                Nouveau client
              </TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="mt-4 space-y-2">
              <Label htmlFor="clientId">
                Sélectionner un client{" "}
                <span className="text-destructive">*</span>
              </Label>
              <select
                id="clientId"
                name="clientId"
                defaultValue=""
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  — Choisir un client —
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                    {c.type === "personne_morale" ? " (SARL/SA)" : ""}
                  </option>
                ))}
              </select>
              {err("clientId") && (
                <p className="text-[12px] text-destructive">
                  {err("clientId")}
                </p>
              )}
            </TabsContent>

            <TabsContent value="new" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <div className="space-y-2">
                  <Label htmlFor="newClientNom">
                    Nom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="newClientNom"
                    name="newClientNom"
                    placeholder="Société Atlantique SA"
                  />
                  {err("nom") && (
                    <p className="text-[12px] text-destructive">{err("nom")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newClientType">Type</Label>
                  <select
                    id="newClientType"
                    name="newClientType"
                    defaultValue="personne_morale"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="personne_morale">Personne morale</option>
                    <option value="personne_physique">Personne physique</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newClientEmail">Email</Label>
                  <Input
                    id="newClientEmail"
                    name="newClientEmail"
                    type="email"
                    placeholder="contact@atlantique.cm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newClientTel">Téléphone</Label>
                  <Input
                    id="newClientTel"
                    name="newClientTel"
                    placeholder="+237 6 99 12 34 56"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newClientAdresse">Adresse</Label>
                <Input
                  id="newClientAdresse"
                  name="newClientAdresse"
                  placeholder="BP 1234, Douala"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newClientRccm">RCCM</Label>
                  <Input id="newClientRccm" name="newClientRccm" placeholder="CM-DLA-2020-B-0123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newClientNif">NIF</Label>
                  <Input id="newClientNif" name="newClientNif" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ─── ADVERSAIRES ─── */}
      <section className="rounded-2xl border border-brand-justice/10 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-semibold text-brand-ink">
              Parties adverses
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Optionnel — vous pourrez en ajouter plus tard.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAdversaire}
            className="border-brand-justice/20"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter
          </Button>
        </div>

        {adversaires.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-brand-justice/15 bg-card/60 px-3 py-6 text-center text-[13px] text-muted-foreground">
            Aucune partie adverse renseignée.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {adversaires.map((a, i) => (
              <li
                key={i}
                className="grid gap-2 rounded-md border border-brand-justice/10 bg-brand-parchment-dark/20 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <Input
                  placeholder="Nom"
                  value={a.nom}
                  onChange={(e) => updateAdversaire(i, { nom: e.target.value })}
                />
                <Input
                  placeholder="Qualité (ex. défendeur)"
                  value={a.qualite}
                  onChange={(e) =>
                    updateAdversaire(i, { qualite: e.target.value })
                  }
                />
                <Input
                  placeholder="Conseil adverse"
                  value={a.conseil}
                  onChange={(e) =>
                    updateAdversaire(i, { conseil: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAdversaire(i)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Retirer la partie ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── RESPONSABLE + DATES + CONFIDENTIALITÉ ─── */}
      <section className="rounded-2xl border border-brand-justice/10 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-brand-ink">
          Pilotage & accès
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="responsableId">
              Responsable du dossier{" "}
              <span className="text-destructive">*</span>
            </Label>
            <select
              id="responsableId"
              name="responsableId"
              defaultValue={currentUserId}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatMemberDisplayName(m.fullName, m.email, m.titre)}
                  {m.id === currentUserId ? " (vous)" : ""}
                </option>
              ))}
            </select>
            <p className="text-[11.5px] text-muted-foreground">
              Le responsable est ajouté automatiquement comme membre.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOuverture">Date d&apos;ouverture</Label>
            <Input
              id="dateOuverture"
              name="dateOuverture"
              type="date"
              defaultValue={todayIso()}
            />
          </div>
        </div>

        <fieldset className="mt-5 space-y-3">
          <legend className="text-sm font-medium text-foreground">
            Confidentialité
          </legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-justice/10 bg-card p-3 transition-colors hover:bg-brand-parchment-dark/30">
            <input
              type="radio"
              name="confidentialite"
              value="standard"
              defaultChecked
              className="mt-1"
            />
            <span className="text-[13px]">
              <span className="font-medium text-foreground">Standard</span>
              <span className="ml-1 text-muted-foreground">
                — accessible à tous les membres du cabinet.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 transition-colors hover:bg-rose-500/10">
            <input
              type="radio"
              name="confidentialite"
              value="sensible"
              className="mt-1"
            />
            <span className="text-[13px]">
              <span className="inline-flex items-center gap-1 font-medium text-rose-900 dark:text-rose-200">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                Sensible
              </span>
              <span className="ml-1 text-muted-foreground">
                — seuls les membres explicitement ajoutés à l&apos;affaire y
                ont accès (même les administrateurs du cabinet doivent être
                ajoutés).
              </span>
            </span>
          </label>
        </fieldset>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-brand-justice/10 pt-4">
        <span className="text-[11.5px] text-muted-foreground">
          <Lock className="mr-1 inline-block h-3 w-3" aria-hidden />
          Les modifications restent confinées à votre cabinet.
        </span>
        <SubmitButton />
      </div>
    </form>
  );
}
