"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export type ClientContactValues = {
  email?: string;
  tel?: string;
  adresse?: string;
  rccm?: string;
  nif?: string;
};

export type ClientFormValues = {
  nom: string;
  type: "" | "personne_physique" | "personne_morale";
  contact: ClientContactValues;
};

export function emptyClientForm(): ClientFormValues {
  return {
    nom: "",
    type: "",
    contact: {},
  };
}

export function clientFormFromRow(row: {
  nom: string;
  type: "personne_physique" | "personne_morale" | null;
  contact: ClientContactValues | null;
}): ClientFormValues {
  const c = row.contact ?? {};
  return {
    nom: row.nom,
    type: row.type ?? "",
    contact: {
      email: c.email ?? "",
      tel: c.tel ?? "",
      adresse: c.adresse ?? "",
      rccm: c.rccm ?? "",
      nif: c.nif ?? "",
    },
  };
}

export function ClientFormFields({
  values,
  onChange,
  fieldErrors,
  idPrefix = "client",
}: {
  values: ClientFormValues;
  onChange: (next: ClientFormValues) => void;
  fieldErrors?: Record<string, string>;
  idPrefix?: string;
}) {
  const err = (field: string) => fieldErrors?.[field];

  function patchContact(patch: Partial<ClientContactValues>) {
    onChange({ ...values, contact: { ...values.contact, ...patch } });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-nom`}>Nom / raison sociale</Label>
        <Input
          id={`${idPrefix}-nom`}
          required
          value={values.nom}
          onChange={(e) => onChange({ ...values, nom: e.target.value })}
          placeholder="Ex. Société ABC ou M. Dupont"
        />
        {err("nom") && (
          <p className="text-xs text-destructive">{err("nom")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-type`}>Type</Label>
        <select
          id={`${idPrefix}-type`}
          className={selectClassName}
          value={values.type}
          onChange={(e) =>
            onChange({
              ...values,
              type: e.target.value as ClientFormValues["type"],
            })
          }
        >
          <option value="">Non précisé</option>
          <option value="personne_physique">Personne physique</option>
          <option value="personne_morale">Personne morale</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-email`}>E-mail</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={values.contact.email ?? ""}
          onChange={(e) => patchContact({ email: e.target.value })}
        />
        {err("contact.email") && (
          <p className="text-xs text-destructive">{err("contact.email")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-tel`}>Téléphone</Label>
        <Input
          id={`${idPrefix}-tel`}
          value={values.contact.tel ?? ""}
          onChange={(e) => patchContact({ tel: e.target.value })}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-adresse`}>Adresse</Label>
        <Input
          id={`${idPrefix}-adresse`}
          value={values.contact.adresse ?? ""}
          onChange={(e) => patchContact({ adresse: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-rccm`}>RCCM</Label>
        <Input
          id={`${idPrefix}-rccm`}
          value={values.contact.rccm ?? ""}
          onChange={(e) => patchContact({ rccm: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-nif`}>NIF</Label>
        <Input
          id={`${idPrefix}-nif`}
          value={values.contact.nif ?? ""}
          onChange={(e) => patchContact({ nif: e.target.value })}
        />
      </div>
    </div>
  );
}
