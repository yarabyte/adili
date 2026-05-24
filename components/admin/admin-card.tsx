import { cn } from "@/lib/utils";

export function AdminCard({
  children,
  className,
  padding = "default",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "default" | "none";
}) {
  return (
    <article
      className={cn(
        "rounded-xl border border-brand-justice/10 bg-card shadow-sm transition-shadow hover:shadow-md",
        padding === "default" && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </article>
  );
}

export function AdminCardHeader({
  title,
  subtitle,
  badge,
  meta,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {badge}
        </div>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {meta ? <div className="text-right text-sm">{meta}</div> : null}
    </div>
  );
}
