/**
 * Télécharge le PDF d'un document via l'API (côté client).
 */
export async function downloadDocumentPdf(
  documentId: string,
  affaireId: string,
  fallbackTitle: string
): Promise<void> {
  const res = await fetch(
    `/api/documents/${documentId}/pdf?affaireId=${encodeURIComponent(affaireId)}`
  );

  if (!res.ok) {
    let message = "Export PDF impossible.";
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      /* corps non JSON */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const filename =
    parseContentDispositionFilename(disposition) ??
    `${fallbackTitle.replace(/[^\w\s-]/g, "").trim() || "document"}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseContentDispositionFilename(
  header: string | null
): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const ascii = /filename="([^"]+)"/i.exec(header);
  return ascii?.[1] ?? null;
}
