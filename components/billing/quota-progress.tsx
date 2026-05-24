import { cn } from "@/lib/utils";

type QuotaProgressProps = {
  consomme: number;
  total: number;
  label?: string;
  className?: string;
};

export function QuotaProgress({
  consomme,
  total,
  label,
  className,
}: QuotaProgressProps) {
  const pct = total > 0 ? Math.min(100, Math.round((consomme / total) * 100)) : 0;
  const warn = pct >= 80;
  const critical = pct >= 100;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium tabular-nums">
            {consomme} / {total} ({pct}%)
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            critical
              ? "bg-destructive"
              : warn
                ? "bg-brand-gold"
                : "bg-brand-justice"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
