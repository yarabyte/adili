"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubscribeFlowProps = {
  planId: string;
  planNom: string;
  supportsVirement: boolean;
  supportsMobileMoney: boolean;
  /** Cycle initial (synchronisé avec le sélecteur mensuel/annuel de la page). */
  defaultCycle?: "mensuel" | "annuel";
  /** Afficher le toggle mensuel/annuel local (désactivé si la page parente le gère). */
  showCycleToggle?: boolean;
};

export function SubscribeFlow({
  planId,
  planNom,
  supportsVirement,
  supportsMobileMoney,
  defaultCycle = "mensuel",
  showCycleToggle = true,
}: SubscribeFlowProps) {
  const router = useRouter();
  const [cycle, setCycle] = useState<"mensuel" | "annuel">(defaultCycle);
  useEffect(() => {
    setCycle(defaultCycle);
  }, [defaultCycle]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const subscribe = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/subscription/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, cycle }),
      });
      const json = (await res.json()) as {
        subscriptionId?: string;
        error?: string;
        montant?: number;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Erreur");
        return;
      }
      setSubscriptionId(json.subscriptionId ?? null);
      setMessage(
        `Abonnement ${planNom} créé — ${json.montant?.toLocaleString("fr-FR")} FCFA (${cycle}). Choisissez le paiement ci-dessous.`
      );
      router.refresh();
    } catch {
      setMessage("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const payVirement = async () => {
    if (!subscriptionId) {
      setMessage("Créez d'abord l'abonnement.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/billing/payments/virement/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const json = (await res.json()) as {
        reference?: string;
        paiementId?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Erreur");
        return;
      }
      const q = new URLSearchParams({
        ref: json.reference ?? "",
        ...(json.paiementId ? { paiement: json.paiementId } : {}),
      });
      router.push(`/app/billing/virement?${q.toString()}`);
    } catch {
      setMessage("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const payMobile = async () => {
    if (!subscriptionId) {
      setMessage("Créez d'abord l'abonnement.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/billing/payments/mobile-money/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const json = (await res.json()) as {
        paymentUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Erreur");
        return;
      }
      if (json.paymentUrl) window.location.href = json.paymentUrl;
    } catch {
      setMessage("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {showCycleToggle && (
        <div className="inline-flex rounded-full border p-1 text-sm">
          {(["mensuel", "annuel"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={cn(
                "rounded-full px-3 py-1 capitalize",
                cycle === c && "bg-brand-justice text-white"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={loading} onClick={subscribe}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Préparer l&apos;abonnement
        </Button>
        {subscriptionId && supportsVirement && (
          <Button type="button" variant="outline" disabled={loading} onClick={payVirement}>
            Payer par virement
          </Button>
        )}
        {subscriptionId && supportsMobileMoney && (
          <Button type="button" variant="outline" disabled={loading} onClick={payMobile}>
            Mobile Money
          </Button>
        )}
      </div>
      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
