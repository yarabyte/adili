"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AffaireMembreOption } from "@/lib/echeances/types";
import type { DecisionAction } from "@/lib/validation/compte-rendu";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function newId(): string {
  return globalThis.crypto.randomUUID();
}

function toDatetimeLocal(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeActionReminder(item: DecisionAction): DecisionAction {
  if (item.type !== "action") {
    return { ...item, rappelActif: false };
  }
  return {
    ...item,
    rappelActif: Boolean(!item.fait && item.deadline),
  };
}

export function CrActionsBuilder({
  value,
  onChange,
  disabled,
  membreOptions,
}: {
  value: DecisionAction[];
  onChange: (next: DecisionAction[]) => void;
  disabled?: boolean;
  membreOptions: AffaireMembreOption[];
}) {
  function updateAt(index: number, patch: Partial<DecisionAction>) {
    onChange(
      value.map((item, i) =>
        i === index ? normalizeActionReminder({ ...item, ...patch }) : item
      )
    );
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addItem(type: "decision" | "action") {
    onChange([
      ...value,
      normalizeActionReminder({
        id: newId(),
        type,
        texte: "",
        fait: false,
      }),
    ]);
  }

  return (
    <div className="space-y-4">
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune décision ni action enregistrée.
        </p>
      ) : (
        <ul className="space-y-3">
          {value.map((item, index) => (
            <li
              key={item.id}
              className="space-y-3 rounded-lg border border-brand-justice/10 bg-card/60 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={`${selectClassName} max-w-[160px]`}
                  disabled={disabled}
                  value={item.type}
                  onChange={(e) =>
                    updateAt(index, {
                      type: e.target.value as DecisionAction["type"],
                    })
                  }
                >
                  <option value="decision">Décision</option>
                  <option value="action">Action</option>
                </select>
                {item.type === "action" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={item.fait}
                      onChange={(e) =>
                        updateAt(index, { fait: e.target.checked })
                      }
                      className="rounded border-input"
                    />
                    Fait
                  </label>
                )}
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    onClick={() => removeAt(index)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Texte</Label>
                <textarea
                  disabled={disabled}
                  value={item.texte}
                  onChange={(e) => updateAt(index, { texte: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {item.type === "action" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Échéance (optionnel)</Label>
                    <Input
                      type="datetime-local"
                      disabled={disabled}
                      value={toDatetimeLocal(item.deadline)}
                      onChange={(e) =>
                        updateAt(index, {
                          deadline: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        })
                      }
                    />
                    {!item.fait && item.rappelActif && (
                      <p className="text-[11px] text-muted-foreground">
                        Rappel d&apos;échéance activé automatiquement tant que
                        l&apos;action n&apos;est pas marquée « Fait ».
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Responsable (optionnel)</Label>
                    <select
                      className={selectClassName}
                      disabled={disabled}
                      value={item.responsable_id ?? ""}
                      onChange={(e) =>
                        updateAt(index, {
                          responsable_id: e.target.value || undefined,
                        })
                      }
                    >
                      <option value="">—</option>
                      {membreOptions.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.fullName?.trim() || m.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem("decision")}
          >
            <Plus className="mr-1 h-4 w-4" />
            Décision
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem("action")}
          >
            <Plus className="mr-1 h-4 w-4" />
            Action
          </Button>
        </div>
      )}
    </div>
  );
}
