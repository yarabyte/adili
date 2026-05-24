import { cn } from "@/lib/utils";

export function AdminStatCard({
  label,
  value,
  hint,
  icon,
  trend,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-brand-justice/10 bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-justice/8 text-brand-justice">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold tabular-nums text-brand-justice">
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "mt-1.5 text-xs text-muted-foreground",
            trend === "up" && "text-emerald-700",
            trend === "down" && "text-red-700"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
