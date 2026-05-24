"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminActionPanel } from "@/components/admin/admin-action-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SubscriptionRowActionsProps = {
  subscriptionId: string;
  statut: string;
};

export function SubscriptionRowActions({
  subscriptionId,
  statut,
}: SubscriptionRowActionsProps) {
  const router = useRouter();
  const [motif, setMotif] = useState("");
  const [months, setMonths] = useState("1");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (path: string, body: Record<string, unknown>) => {
    if (motif.trim().length < 10) {
      setError("Motif audit min. 10 caractères.");
      return;
    }
    setLoading(path);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, motif: motif.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Échec");
        return;
      }
      setMotif("");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(null);
    }
  };

  const base = `/api/admin/subscriptions/${subscriptionId}`;

  return (
    <AdminActionPanel title="Actions abonnement">
      <div>
        <Label htmlFor={`motif-sub-${subscriptionId}`}>Motif (audit)</Label>
        <Input
          id={`motif-sub-${subscriptionId}`}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Geste commercial, impayé résolu…"
          className="mt-1"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor={`months-${subscriptionId}`} className="text-xs">
            Prolonger (mois)
          </Label>
          <Input
            id={`months-${subscriptionId}`}
            type="number"
            min={1}
            max={36}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="mt-1 w-24"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!!loading}
          onClick={() =>
            call(`${base}/extend`, { months: Number(months) || 1 })
          }
        >
          {loading?.includes("extend") && (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          )}
          Prolonger
        </Button>
        {statut !== "suspendu" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!!loading}
            onClick={() => call(`${base}/suspend`, {})}
          >
            {loading?.includes("suspend") && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            Suspendre
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={!!loading}
            onClick={() => call(`${base}/reactivate`, {})}
          >
            {loading?.includes("reactivate") && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            Réactiver
          </Button>
        )}
      </div>
      {error && (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </AdminActionPanel>
  );
}
