import { cn } from "@/lib/utils";

export function OnboardingStepBar({
  current,
  total = 3,
  labels,
}: {
  current: number;
  total?: number;
  labels?: string[];
}) {
  return (
    <div className="mb-6">
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < current ? "bg-brand-gold" : "bg-muted"
            )}
          />
        ))}
      </div>
      {labels && labels[current - 1] && (
        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Étape {current} — {labels[current - 1]}
        </p>
      )}
    </div>
  );
}
