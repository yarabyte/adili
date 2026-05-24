"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadPreuveForm({ paiementId }: { paiementId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("preuve", file);
    fd.set("paiement_id", paiementId);
    try {
      const res = await fetch("/api/billing/payments/virement/upload-preuve", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setMessage(json.error ?? "Échec");
        return;
      }
      setMessage("Preuve envoyée — validation sous 48 h ouvrées.");
      router.refresh();
    } catch {
      setMessage("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="preuve">Reçu ou capture du virement (PDF, PNG, JPG)</Label>
        <Input
          id="preuve"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="mt-1"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <Button type="button" size="sm" disabled={!file || loading} onClick={submit}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Envoyer la preuve
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
