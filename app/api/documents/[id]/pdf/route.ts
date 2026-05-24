import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { authorize } from "@/lib/permissions/affaires";
import { logAction } from "@/lib/audit/log";
import { buildPrintHtml } from "@/lib/documents/pdf/build-print-html";
import { generatePdfFromHtml } from "@/lib/documents/pdf/generate-pdf";
import { getPrintCss } from "@/lib/documents/pdf/get-print-css";
import { loadDocumentPrintData } from "@/lib/documents/pdf/load-document-print-data";
import { safePdfFilename } from "@/lib/documents/pdf/safe-pdf-filename";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/documents/[id]/pdf?affaireId=…
 * Génère et télécharge le PDF (A4, marges juridiques).
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const affaireId = new URL(request.url).searchParams.get("affaireId");
  if (!affaireId) {
    return NextResponse.json(
      { error: "Paramètre affaireId requis." },
      { status: 400 }
    );
  }

  const ctx = await authorize(session, affaireId, "document", "voir");
  if (!ctx) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const model = await loadDocumentPrintData(params.id, affaireId);
  if (!model) {
    return NextResponse.json(
      { error: "Document introuvable." },
      { status: 404 }
    );
  }

  try {
    const html = buildPrintHtml(model, getPrintCss({ forPdfExport: true }));
    const pdf = await generatePdfFromHtml(html);
    const filename = safePdfFilename(model.document.titre);

    void logAction({
      action: "document.exporte_pdf",
      cabinetId: ctx.cabinetId,
      affaireId,
      documentId: params.id,
      userId: session.user.id,
      metadata: {
        titre: model.document.titre,
        statut: model.document.statut,
        mode: "telechargement_direct",
      },
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[pdf] export failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Impossible de générer le PDF.",
      },
      { status: 500 }
    );
  }
}
