import { cn } from "@/lib/utils";

export function AdminEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-brand-justice/15 bg-card/60 px-6 py-16 text-center",
        className
      )}
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-justice/8 text-brand-justice">
        {icon}
      </span>
      <h2 className="font-heading text-lg font-semibold text-brand-justice">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
