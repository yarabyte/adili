"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { AdminCard } from "@/components/admin/admin-card";
import type { AdminCabinetReference } from "@/lib/admin/cabinet-reference";
import { cn } from "@/lib/utils";

function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Copier l'ID"
    >
      {copied ? (
        <Check className="h-3 w-3 text-brand-sage" aria-hidden />
      ) : (
        <Copy className="h-3 w-3" aria-hidden />
      )}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

type AdminCabinetReferencePanelProps = {
  cabinets: AdminCabinetReference[];
  className?: string;
};

export function AdminCabinetReferencePanel({
  cabinets,
  className,
}: AdminCabinetReferencePanelProps) {
  const [open, setOpen] = useState(true);

  if (cabinets.length === 0) {
    return (
      <AdminCard className={className}>
        <p className="text-sm text-muted-foreground">
          Aucun cabinet enregistré — l&apos;ID sera créé à l&apos;acceptation si
          le champ est laissé vide.
        </p>
      </AdminCard>
    );
  }

  return (
    <AdminCard className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-justice/80">
            Référence cabinets
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {cabinets.length} cabinet{cabinets.length > 1 ? "s" : ""} — ID et
            email propriétaire
          </p>
        </div>
        <span className="text-xs font-medium text-brand-justice">
          {open ? "Masquer" : "Afficher"}
        </span>
      </button>

      {open ? (
        <div className="max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead className="sticky top-0 bg-muted/80 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Cabinet</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cabinets.map((c) => (
                <tr key={c.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {c.name}
                    {c.city ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {c.city}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-foreground/90">
                    {c.id}
                  </td>
                  <td className="px-3 py-2">
                    <CopyIdButton id={c.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminCard>
  );
}
