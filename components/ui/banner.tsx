"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type BannerProps = {
  title: string;
  description?: string;
  tone?: "success" | "info";
  dismissible?: boolean;
};

export function Banner({
  title,
  description,
  tone = "success",
  dismissible = true,
}: BannerProps) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        tone === "success"
          ? "border-brand-gold/35 bg-brand-gold/10 text-brand-ink"
          : "border-brand-justice/15 bg-muted/50 text-foreground"
      )}
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Masquer le message"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
