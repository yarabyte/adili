"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DEFAULT_BARREAU } from "@/lib/constants/barreau";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BetaApplyForm({
  placesRestantes,
  maxPlaces = 25,
}: {
  placesRestantes: number;
  maxPlaces?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (placesRestantes <= 0) return;

    const form = e.currentTarget;
    setLoading(true);
    setFeedback(null);

    const fd = new FormData(form);
    const payload = {
      nom: String(fd.get("nom") ?? ""),
      email: String(fd.get("email") ?? ""),
      telephone: String(fd.get("telephone") ?? "") || undefined,
      barreau: String(fd.get("barreau") ?? "") || undefined,
      anneesExperience: fd.get("annees") ? Number(fd.get("annees")) : undefined,
      typePratique: String(fd.get("type") ?? "") || undefined,
      dossiersActifs: fd.get("dossiers") ? Number(fd.get("dossiers")) : undefined,
      motivation: String(fd.get("motivation") ?? ""),
    };

    try {
      const res = await fetch("/api/beta/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let json: { error?: string } = {};
      try {
        json = (await res.json()) as { error?: string };
      } catch {
        /* corps vide ou non-JSON */
      }

      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error ?? "Impossible d'envoyer la candidature.",
        });
        return;
      }

      form.reset();
      const barreauInput = form.elements.namedItem("barreau");
      if (barreauInput instanceof HTMLInputElement) {
        barreauInput.value = DEFAULT_BARREAU;
      }

      setFeedback({
        type: "success",
        text: "Candidature envoyée. Nous vous répondrons sous quelques jours ouvrés.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Erreur réseau. Vérifiez votre connexion et réessayez.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (placesRestantes <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Les {maxPlaces} places du programme avocats pionniers sont pourvues.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="nom">Nom complet</Label>
          <Input id="nom" name="nom" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" name="telephone" />
        </div>
        <div>
          <Label htmlFor="barreau">Barreau</Label>
          <Input
            id="barreau"
            name="barreau"
            defaultValue={DEFAULT_BARREAU}
            placeholder={DEFAULT_BARREAU}
          />
        </div>
        <div>
          <Label htmlFor="annees">Années d&apos;expérience</Label>
          <Input id="annees" name="annees" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="dossiers">Dossiers actifs (approx.)</Label>
          <Input id="dossiers" name="dossiers" type="number" min={0} />
        </div>
      </div>
      <div>
        <Label htmlFor="motivation">Motivation (min. 50 caractères)</Label>
        <textarea
          id="motivation"
          name="motivation"
          required
          minLength={50}
          rows={5}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {feedback ? (
        <p
          role={feedback.type === "error" ? "alert" : "status"}
          className={
            feedback.type === "error"
              ? "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              : "rounded-md border border-brand-sage/35 bg-brand-sage/10 px-3 py-2 text-sm text-brand-ink"
          }
        >
          {feedback.text}
        </p>
      ) : null}
      <Button type="submit" disabled={loading || feedback?.type === "success"}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Envoyer ma candidature
      </Button>
    </form>
  );
}
