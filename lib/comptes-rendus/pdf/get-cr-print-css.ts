import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getPrintCss } from "@/lib/documents/pdf/get-print-css";

let cachedCr: string | null = null;

/** Feuilles d'impression documents + comptes rendus (export PDF). */
export function getCrPrintCss(opts?: { forPdfExport?: boolean }): string {
  if (!cachedCr) {
    const path = join(process.cwd(), "app/print/cr-print.css");
    cachedCr = readFileSync(path, "utf8");
  }
  return getPrintCss(opts) + "\n" + cachedCr;
}
