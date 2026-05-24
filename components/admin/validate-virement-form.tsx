"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminActionPanel } from "@/components/admin/admin-action-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFcfa } from "@/lib/billing/format";

type ValidateVirementFormProps = {
  paiementId: string;
  reference: string | null;
  montant: number;
};

export function ValidateVirementForm({
  paiementId,
  reference,
  montant,
}: ValidateVirementFormProps) {
  const router = useRouter();
  const [motif, setMotif] = useState("");
  const [dateConstate, setDateConstate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (motif.trim().length < 10) {
      setError("Motif obligatoire (min. 10 caractères).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payments/virement/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paiementId, dateConstate, motif: motif.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Échec");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminActionPanel title="Valider le virement">
      <p className="mb-4 text-sm">
        <span className="font-mono font-medium">{reference ?? "—"}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="font-semibold tabular-nums text-brand-justice">
          {formatFcfa(montant)}
        </span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`date-${paiementId}`}>Date constatée</Label>
          <Input
            id={`date-${paiementId}`}
            type="date"
            value={dateConstate}
            onChange={(e) => setDateConstate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`motif-${paiementId}`}>Motif (audit)</Label>
          <Input
            id={`motif-${paiementId}`}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Virement reçu sur compte Adili — réf. …"
            className="mt-1"
          />
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        className="mt-4"
        disabled={loading}
        onClick={submit}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Valider le virement
      </Button>
    </AdminActionPanel>
  );
}
