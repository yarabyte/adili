"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Ecole = { id: string; nom: string; ville: string | null };

export function EtudiantOnboardingForm({
  rejected,
  renew,
}: {
  rejected?: boolean;
  renew?: boolean;
}) {
  const router = useRouter();
  const [ecoles, setEcoles] = useState<Ecole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ecoles")
      .then((r) => r.json())
      .then((j: { ecoles?: Ecole[] }) => setEcoles(j.ecoles ?? []))
      .catch(() => setEcoles([]));
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/etudiants/apply", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Échec");
        return;
      }
      router.push("/app/en-attente");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {rejected && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Votre demande précédente a été refusée. Vous pouvez soumettre un nouveau
          dossier conforme aux critères ci-dessous.
        </p>
      )}
      {renew && (
        <p className="rounded-md border border-brand-gold/40 bg-brand-gold/10 px-3 py-2 text-sm">
          Votre statut étudiant a expiré — renouvelez votre justificatif pour
          l&apos;année en cours.
        </p>
      )}

      <div>
        <Label htmlFor="ecole_id">École / université *</Label>
        <select
          id="ecole_id"
          name="ecole_id"
          required
          className="mt-1 flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">— Choisir —</option>
          {ecoles.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
              {e.ville ? ` (${e.ville})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Seules les établissements listés sont éligibles. Autre école : contactez
          support@adili.cloud.
        </p>
      </div>
      <div>
        <Label htmlFor="numero">Numéro étudiant (optionnel)</Label>
        <Input id="numero" name="numero" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="justificatif">Justificatif (PDF, JPG, PNG) *</Label>
        <Input
          id="justificatif"
          name="justificatif"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          required
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">Max. 5 Mo</p>
      </div>

      <details className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          Critères d&apos;éligibilité
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Étudiant en droit dans une école de la liste</li>
          <li>Carte étudiante ou attestation de l&apos;année en cours</li>
          <li>Usage strictement académique et personnel</li>
          <li>Renouvellement annuel du justificatif</li>
        </ul>
      </details>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Envoyer pour validation
      </Button>
    </form>
  );
}
