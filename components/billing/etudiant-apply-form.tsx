"use client";

import { Loader2, Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EtudiantApplyForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/etudiants/apply", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(json.error ?? "Échec");
        return;
      }
      setMessage(json.message ?? "Demande envoyée.");
      e.currentTarget.reset();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="ecole">École / université</Label>
        <Input id="ecole" name="ecole" required />
      </div>
      <div>
        <Label htmlFor="numero">Numéro étudiant</Label>
        <Input id="numero" name="numero" />
      </div>
      <div>
        <Label htmlFor="email_inst">Email institutionnel</Label>
        <Input id="email_inst" name="email_inst" type="email" />
      </div>
      <div>
        <Label htmlFor="justificatif">
          Justificatif (carte étudiant ou attestation) — PDF, JPG, PNG
        </Label>
        <Input
          id="justificatif"
          name="justificatif"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">Max. 5 Mo</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Soumettre la demande
      </Button>
    </form>
  );
}
