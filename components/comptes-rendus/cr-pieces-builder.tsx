"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PieceRemise } from "@/lib/validation/compte-rendu";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function CrPiecesBuilder({
  value,
  onChange,
  disabled,
}: {
  value: PieceRemise[];
  onChange: (next: PieceRemise[]) => void;
  disabled?: boolean;
}) {
  function updateAt(index: number, patch: Partial<PieceRemise>) {
    onChange(value.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addEmpty() {
    onChange([...value, { nom: "", sens: "remise" }]);
  }

  return (
    <div className="space-y-4">
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune pièce listée.</p>
      ) : (
        <ul className="space-y-3">
          {value.map((p, index) => (
            <li
              key={index}
              className="grid gap-3 rounded-lg border border-brand-justice/10 bg-card/60 p-3 sm:grid-cols-[1fr_120px_1fr_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs">Désignation</Label>
                <Input
                  value={p.nom}
                  disabled={disabled}
                  onChange={(e) => updateAt(index, { nom: e.target.value })}
                  placeholder="Ex. : Conclusions en réplique"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sens</Label>
                <select
                  className={selectClassName}
                  disabled={disabled}
                  value={p.sens}
                  onChange={(e) =>
                    updateAt(index, {
                      sens: e.target.value as PieceRemise["sens"],
                    })
                  }
                >
                  <option value="remise">Remise</option>
                  <option value="recue">Reçue</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Partie / référence</Label>
                <Input
                  value={p.partie ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    updateAt(index, { partie: e.target.value || undefined })
                  }
                  placeholder="À qui, bordereau n°…"
                />
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-6 shrink-0"
                  onClick={() => removeAt(index)}
                  aria-label="Supprimer"
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
          Ajouter une pièce
        </Button>
      )}
    </div>
  );
}
