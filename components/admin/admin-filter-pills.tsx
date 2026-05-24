import Link from "next/link";

import { cn } from "@/lib/utils";

export function AdminFilterPills({
  items,
  activeValue,
  baseHref,
  paramName = "statut",
}: {
  items: readonly { value: string; label: string }[];
  activeValue: string;
  baseHref: string;
  paramName?: string;
}) {
  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Filtres"
    >
      {items.map((f) => {
        const isActive = activeValue === f.value;
        const href = f.value
          ? `${baseHref}?${paramName}=${encodeURIComponent(f.value)}`
          : baseHref;
        return (
          <Link
            key={f.value || "all"}
            href={href}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-brand-justice bg-brand-justice text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-brand-justice/30 hover:bg-muted/50 hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}
