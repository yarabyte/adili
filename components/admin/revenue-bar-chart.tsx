import { formatFcfa } from "@/lib/billing/format";

export function RevenueBarChart({
  data,
}: {
  data: { mois: string; montantFcfa: number }[];
}) {
  const max = Math.max(...data.map((d) => d.montantFcfa), 1);

  return (
    <div className="mt-6">
      <div className="flex h-44 items-end gap-2 sm:gap-3">
        {data.map((bar) => {
          const pct = Math.max(6, (bar.montantFcfa / max) * 100);
          return (
            <div
              key={bar.mois}
              className="group flex flex-1 flex-col items-center gap-2"
            >
              <div className="relative flex w-full flex-1 flex-col justify-end">
                <div
                  className="mx-auto w-full max-w-12 rounded-t-md bg-gradient-to-t from-brand-justice to-brand-justice-soft transition-all group-hover:opacity-90"
                  style={{ height: `${pct}%` }}
                  title={formatFcfa(bar.montantFcfa)}
                />
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-brand-ink px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                  {formatFcfa(bar.montantFcfa)}
                </span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {bar.mois}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
