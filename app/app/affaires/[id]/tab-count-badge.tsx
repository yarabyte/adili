export function TabCountBadge({ count }: { count: number }) {
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded bg-brand-justice/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-brand-justice">
      {count.toLocaleString("fr-FR")}
    </span>
  );
}
