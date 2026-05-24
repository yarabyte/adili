"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function EtudiantJustificatifLink({
  validationId,
  hasFile,
}: {
  validationId: string;
  hasFile: boolean;
}) {
  const [loading, setLoading] = useState(false);

  if (!hasFile) {
    return (
      <span className="text-xs text-amber-700">Sans justificatif</span>
    );
  }

  const open = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/etudiants-validation/${validationId}/justificatif`
      );
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) window.open(json.url, "_blank", "noopener");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 text-xs"
      disabled={loading}
      onClick={open}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <ExternalLink className="h-3 w-3" />
      )}
      Voir justificatif
    </Button>
  );
}
