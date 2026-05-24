import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | null = null;

const PDF_EXPORT_OVERRIDES = `
/* Export PDF serveur : marges uniquement via @page (évite le double espacement). */
html, body { margin: 0 !important; }
.print-shell { padding: 0 !important; max-width: none !important; }
`;

/** Feuille d'impression A4 (marges @page, typo juridique, citations). */
export function getPrintCss(opts?: { forPdfExport?: boolean }): string {
  if (!cached) {
    const path = join(process.cwd(), "app/print/print.css");
    cached = readFileSync(path, "utf8");
  }
  if (opts?.forPdfExport) {
    return cached + PDF_EXPORT_OVERRIDES;
  }
  return cached;
}
