"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AffaireMembreOption } from "@/lib/echeances/types";
import type { AdversaireAffaire } from "@/lib/comptes-rendus/types";
import {
  PARTIES_PARTICIPANT,
  QUALITES_PARTICIPANT,
  type Participant,
} from "@/lib/validation/compte-rendu";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const QUALITE_LABELS: Record<(typeof QUALITES_PARTICIPANT)[number], string> = {
  juge: "Juge",
  greffier: "Greffier",
  avocat: "Avocat",
  client: "Client",
  partie_adverse: "Partie adverse",
  temoin: "Témoin",
  expert: "Expert",
  huissier: "Huissier",
  notaire: "Notaire",
  mediateur: "Médiateur",
  arbitre: "Arbitre",
  collaborateur_cabinet: "Collaborateur cabinet",
  autre: "Autre",
};

const PARTIE_LABELS: Record<(typeof PARTIES_PARTICIPANT)[number], string> = {
  demandeur: "Demandeur",
  defendeur: "Défendeur",
  intervenant: "Intervenant",
  neutre: "Neutre",
};

export function CrParticipantsBuilder({
  value,
  onChange,
  disabled,
  membreOptions,
  adversaires,
}: {
  value: Participant[];
  onChange: (next: Participant[]) => void;
  disabled?: boolean;
  membreOptions: AffaireMembreOption[];
  adversaires: AdversaireAffaire[];
}) {
  function updateAt(index: number, patch: Partial<Participant>) {
    onChange(value.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addEmpty() {
    onChange([
      ...value,
      { nom: "", qualite: "avocat", partie: undefined },
    ]);
  }

  function addFromMembre(m: AffaireMembreOption) {
    const nom = m.fullName?.trim() || m.email;
    onChange([
      ...value,
      {
        nom,
        qualite: "collaborateur_cabinet",
        partie: undefined,
      },
    ]);
  }

  function addFromAdversaire(a: AdversaireAffaire) {
    onChange([
      ...value,
      {
        nom: a.nom,
        qualite: "partie_adverse",
        partie: "defendeur",
      },
    ]);
  }

  return (
    <div className="space-y-4">
      {!disabled && (membreOptions.length > 0 || adversaires.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {membreOptions.map((m) => (
            <Button
              key={m.userId}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => addFromMembre(m)}
            >
              + {m.fullName?.trim() || m.email}
            </Button>
          ))}
          {adversaires.map((a, i) => (
            <Button
              key={`${a.nom}-${i}`}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => addFromAdversaire(a)}
            >
              + {a.nom}
            </Button>
          ))}
        </div>
      )}

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun participant — ajoutez-en un ci-dessous.
        </p>
      ) : (
        <ul className="space-y-3">
          {value.map((p, index) => (
            <li
              key={index}
              className="grid gap-3 rounded-lg border border-brand-justice/10 bg-card/60 p-3 sm:grid-cols-[1fr_140px_120px_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input
                  value={p.nom}
                  disabled={disabled}
                  onChange={(e) => updateAt(index, { nom: e.target.value })}
                  placeholder="Maître X, société Y…"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qualité</Label>
                <select
                  className={selectClassName}
                  disabled={disabled}
                  value={p.qualite}
                  onChange={(e) =>
                    updateAt(index, {
                      qualite: e.target
                        .value as Participant["qualite"],
                    })
                  }
                >
                  {QUALITES_PARTICIPANT.map((q) => (
                    <option key={q} value={q}>
                      {QUALITE_LABELS[q]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Partie</Label>
                <select
                  className={selectClassName}
                  disabled={disabled}
                  value={p.partie ?? ""}
                  onChange={(e) =>
                    updateAt(index, {
                      partie: e.target.value
                        ? (e.target.value as Participant["partie"])
                        : undefined,
                    })
                  }
                >
                  <option value="">—</option>
                  {PARTIES_PARTICIPANT.map((part) => (
                    <option key={part} value={part}>
                      {PARTIE_LABELS[part]}
                    </option>
                  ))}
                </select>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAt(index)}
                  aria-label="Retirer le participant"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addEmpty}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter un participant
        </Button>
      )}
    </div>
  );
}
