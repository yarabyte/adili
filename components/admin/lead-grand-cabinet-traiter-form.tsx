"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminActionPanel } from "@/components/admin/admin-action-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  leadId: string;
};

export function LeadGrandCabinetTraiterForm({ leadId }: Props) {
  const router = useRouter();
  const [motif, setMotif] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (motif.trim().length < 10) {
      setError("Motif min. 10 caractères (audit obligatoire).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads-grand-cabinet/${leadId}/traiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motif: motif.trim(),
          notesInternes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Échec de l'opération");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Erreur réseau — réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-800">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        Lead marqué comme traité
      </p>
    );
  }

  return (
    <AdminActionPanel title="Marquer comme traité">
      <div className="space-y-2">
        <Label htmlFor={`notes-${leadId}`}>Notes internes (optionnel)</Label>
        <Input
          id={`notes-${leadId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Rappel commercial, prochaine action…"
        />
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor={`motif-lead-${leadId}`}>Motif (audit)</Label>
        <Input
          id={`motif-lead-${leadId}`}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Contact effectué, devis envoyé… min. 10 caractères"
        />
        <p className="text-[11px] text-muted-foreground">
          {motif.trim().length}/10 caractères minimum
        </p>
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
        Marquer comme traité
      </Button>
    </AdminActionPanel>
  );
}
