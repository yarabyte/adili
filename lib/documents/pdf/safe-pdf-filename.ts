import { slugify } from "@/lib/slug";

/** Nom de fichier sûr pour Content-Disposition (ASCII de secours). */
export function safePdfFilename(titre: string): string {
  const base = slugify(titre) || "document";
  return `${base}.pdf`;
}
