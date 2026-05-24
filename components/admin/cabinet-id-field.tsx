import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminCabinetReference } from "@/lib/admin/cabinet-reference";

type CabinetIdFieldProps = {
  inputId: string;
  cabinets: AdminCabinetReference[];
};

export function CabinetIdField({ inputId, cabinets }: CabinetIdFieldProps) {
  const listId = `cabinet-datalist-${inputId}`;

  return (
    <div>
      <Label htmlFor={inputId} className="text-xs">
        ID cabinet (si acceptée, optionnel)
      </Label>
      <Input
        id={inputId}
        name="cabinetId"
        list={cabinets.length > 0 ? listId : undefined}
        className="mt-1 font-mono text-xs"
        placeholder="uuid du cabinet existant"
        autoComplete="off"
      />
      {cabinets.length > 0 ? (
        <datalist id={listId}>
          {cabinets.map((c) => (
            <option
              key={c.id}
              value={c.id}
              label={`${c.name} · ${c.email}`}
            />
          ))}
        </datalist>
      ) : null}
      <p className="mt-1 text-[11px] text-muted-foreground">
        Saisie assistée : le cabinet doit être celui du compte Adili dont
        l&apos;email est <strong>identique</strong> à la candidature (sinon
        refus). Sans compte ou sans cabinet configuré, un email d&apos;instructions
        est envoyé automatiquement au candidat.
      </p>
    </div>
  );
}
