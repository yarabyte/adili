"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EcolesAdminForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/ecoles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: fd.get("nom"),
          ville: fd.get("ville"),
          ordreAffichage: Number(fd.get("ordre") || 0),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Échec");
        return;
      }
      e.currentTarget.reset();
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-4"
    >
      <div className="sm:col-span-2">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" name="nom" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="ville">Ville</Label>
        <Input id="ville" name="ville" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="ordre">Ordre</Label>
        <Input id="ordre" name="ordre" type="number" defaultValue={0} className="mt-1" />
      </div>
      <div className="sm:col-span-4 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={loading}>
          Ajouter
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}
