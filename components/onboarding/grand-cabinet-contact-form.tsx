"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GrandCabinetContactForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      nomCabinet: fd.get("nomCabinet"),
      ville: fd.get("ville"),
      nombreAvocats: fd.get("nombreAvocats"),
      telephone: fd.get("telephone"),
      email: fd.get("email"),
      message: fd.get("message"),
    };
    try {
      const res = await fetch("/api/grand-cabinet/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Échec");
        return;
      }
      setDone(true);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="text-center text-sm text-emerald-800">
        Merci — votre demande a été enregistrée. Nous vous recontactons très
        bientôt. Aucun compte n&apos;a été créé : après devis, nous vous
        enverrons une invitation si vous souhaitez démarrer.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="nomCabinet">Nom du cabinet *</Label>
        <Input id="nomCabinet" name="nomCabinet" required className="mt-1" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ville">Ville *</Label>
          <Input id="ville" name="ville" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="nombreAvocats">Nombre d&apos;avocats *</Label>
          <Input
            id="nombreAvocats"
            name="nombreAvocats"
            type="number"
            min={1}
            required
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="telephone">Téléphone *</Label>
        <Input id="telephone" name="telephone" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="email">Email professionnel *</Label>
        <Input id="email" name="email" type="email" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="message">Message *</Label>
        <textarea
          id="message"
          name="message"
          required
          minLength={20}
          rows={4}
          className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Besoins, taille d'équipe, délais…"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Envoyer la demande
      </Button>
    </form>
  );
}
