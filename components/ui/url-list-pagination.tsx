"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UrlListPagination({
  paramName,
  page,
  pageSize,
  total,
  className,
}: {
  paramName: string;
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (total <= pageSize) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  function pageHref(target: number): string {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (target <= 1) sp.delete(paramName);
    else sp.set(paramName, String(target));
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-brand-justice/10 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-[12px] text-muted-foreground">
        <span className="tabular-nums">{from}</span>
        {" – "}
        <span className="tabular-nums">{to}</span>
        {" sur "}
        <span className="tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          asChild={safePage > 1}
        >
          {safePage > 1 ? (
            <Link href={pageHref(safePage - 1)} scroll={false}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Précédent
            </Link>
          ) : (
            <span>
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Précédent
            </span>
          )}
        </Button>
        <span className="min-w-[5rem] text-center text-[12px] tabular-nums text-muted-foreground">
          Page {safePage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          asChild={safePage < totalPages}
        >
          {safePage < totalPages ? (
            <Link href={pageHref(safePage + 1)} scroll={false}>
              Suivant
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span>
              Suivant
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          )}
        </Button>
      </div>
    </nav>
  );
}
