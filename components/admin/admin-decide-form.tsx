"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { AdminActionPanel } from "@/components/admin/admin-action-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Decision = {
  value: string;
  label: string;
  variant?: "default" | "outline" | "destructive";
};

type AdminDecideFormProps = {
  actionUrl: string;
  decisions: Decision[];
  extraFields?: React.ReactNode;
};

export function AdminDecideForm({
  actionUrl,
  decisions,
  extraFields,
}: AdminDecideFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const [decision, setDecision] = useState(decisions[0]?.value ?? "");
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (motif.trim().length < 10) {
      setError("Motif min. 10 caractères (audit obligatoire).");
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const body: Record<string, string> = { decision, motif: motif.trim() };
      const cabinetInput = panelRef.current?.querySelector<HTMLInputElement>(
        'input[name="cabinetId"]'
      );
      if (cabinetInput?.value.trim()) {
        body.cabinetId = cabinetInput.value.trim();
      }

      const res = await fetch(actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Échec de l'opération");
        return;
      }
      setMotif("");
      startTransition(() => router.refresh());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Délai dépassé — réessayez ou vérifiez la connexion.");
      } else {
        setError("Erreur réseau — réessayez.");
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <div ref={panelRef}>
      <AdminActionPanel title="Décision">
      <div className="flex flex-wrap gap-2">
        {decisions.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => setDecision(d.value)}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
              decision === d.value
                ? d.variant === "destructive"
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-brand-justice bg-brand-justice text-primary-foreground"
                : "border-border bg-card hover:bg-muted"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
      {extraFields && <div className="mt-4">{extraFields}</div>}
      <div className="mt-4 space-y-2">
        <Label htmlFor="motif-admin">Motif (audit)</Label>
        <Input
          id="motif-admin"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Décision motivée, min. 10 caractères…"
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
        Confirmer la décision
      </Button>
    </AdminActionPanel>
    </div>
  );
}
