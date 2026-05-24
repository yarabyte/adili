"use client";

import { Loader2, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function PackPurchaseButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePurchase = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/packs/purchase", { method: "POST" });
      const json = (await res.json()) as {
        granted?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Achat indisponible pour le moment.");
        return;
      }
      setMessage(json.message ?? "Demande enregistrée.");
      if (json.granted) router.refresh();
    } catch {
      setMessage("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handlePurchase}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Package className="h-4 w-4" aria-hidden />
        )}
        Acheter — 5 000 FCFA
      </Button>
      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
