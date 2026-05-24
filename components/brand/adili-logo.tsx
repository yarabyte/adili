import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type AdiliLogoProps = {
  href?: string;
  className?: string;
  /** Hauteur visuelle du logo (largeur auto). */
  height?: number;
  priority?: boolean;
};

const LOGO_W = 228;
const LOGO_H = 89;

export function AdiliLogo({
  href,
  className,
  height = 32,
  priority = false,
}: AdiliLogoProps) {
  const img = (
    <Image
      src="/logo.png"
      alt="Adili."
      width={LOGO_W}
      height={LOGO_H}
      className={cn(
        "h-auto w-auto max-w-none",
        href === undefined ? className : undefined
      )}
      style={{ height: `${height}px`, width: "auto" }}
      priority={priority}
      sizes="(max-width: 768px) 160px, 200px"
    />
  );

  if (href === undefined) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center", className)}
        aria-hidden={false}
      >
        {img}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md outline-none ring-offset-2 ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {img}
    </Link>
  );
}
