"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Routes éditeur : pleine largeur, pas de padding shell. */
function isDocumentEditorPath(pathname: string): boolean {
  return /\/app\/affaires\/[^/]+\/documents\/[^/]+$/.test(pathname);
}

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const editor = isDocumentEditorPath(pathname);

  return (
    <main
      className={cn(
        "min-h-0",
        editor ? "overflow-hidden" : "overflow-y-auto"
      )}
    >
      <div
        className={cn(
          "mx-auto w-full",
          editor
            ? "h-full max-w-none"
            : "max-w-5xl px-4 py-8 sm:px-8 sm:py-10"
        )}
      >
        {children}
      </div>
    </main>
  );
}
