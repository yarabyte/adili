import { cn } from "@/lib/utils";

/** Zone d'actions en bas d'une carte admin (formulaires, boutons). */
export function AdminActionPanel({
  children,
  title = "Action",
  className,
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-5 rounded-lg border border-brand-justice/10 bg-muted/30 p-4",
        className
      )}
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}
