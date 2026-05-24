import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { logAction } from "@/lib/audit/log";
import { buildCompteRenduPrintHtml } from "@/lib/comptes-rendus/pdf/build-cr-print-html";
import { loadCompteRenduPrintData } from "@/lib/comptes-rendus/pdf/load-compte-rendu-print-data";
import { generatePdfFromHtml } from "@/lib/documents/pdf/generate-pdf";
import { getCrPrintCss } from "@/lib/comptes-rendus/pdf/get-cr-print-css";
import { safePdfFilename } from "@/lib/documents/pdf/safe-pdf-filename";
import { db } from "@/lib/db/client";
import { affaires, comptesRendus } from "@/lib/db/schema";
import {
  getEffectiveRole,
  hasPermission,
} from "@/lib/permissions/affaires";
import { canViewCompteRenduDetail } from "@/lib/permissions/comptes-rendus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/comptes-rendus/[id]/pdf?affaireId=…
 * PDF pour comptes rendus finalisés ou validés uniquement.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: compteRenduId } = await params;

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

  const ctx = await getEffectiveRole(session, affaireId);
  if (!ctx || !hasPermission(ctx.role, "compte_rendu", "voir")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const [crRow] = await db
    .select({
      affaireId: comptesRendus.affaireId,
      statut: comptesRendus.statut,
      titre: comptesRendus.titre,
      confidentialite: comptesRendus.confidentialite,
      auteurId: comptesRendus.auteurId,
    })
    .from(comptesRendus)
    .where(eq(comptesRendus.id, compteRenduId))
    .limit(1);

  if (!crRow || crRow.affaireId !== affaireId) {
    return NextResponse.json(
      { error: "Compte rendu introuvable." },
      { status: 404 }
    );
  }

  if (crRow.statut !== "finalise" && crRow.statut !== "valide") {
    return NextResponse.json(
      {
        error:
          "Le PDF n'est disponible que pour un compte rendu finalisé ou validé.",
      },
      { status: 400 }
    );
  }

  const [affaireMeta] = await db
    .select({ responsableId: affaires.responsableId })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);

  if (
    !affaireMeta ||
    !canViewCompteRenduDetail({
      confidentialite: crRow.confidentialite,
      auteurId: crRow.auteurId,
      affaireResponsableId: affaireMeta.responsableId,
      userId: session.user.id,
      role: ctx.role,
    })
  ) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const model = await loadCompteRenduPrintData(compteRenduId, affaireId);
  if (!model) {
    return NextResponse.json(
      { error: "Compte rendu introuvable." },
      { status: 404 }
    );
  }

  try {
    const html = buildCompteRenduPrintHtml(
      model,
      getCrPrintCss({ forPdfExport: true })
    );
    const pdf = await generatePdfFromHtml(html);
    const filename = safePdfFilename(model.compteRendu.titre);

    void logAction({
      action: "compte_rendu.exporte_pdf",
      cabinetId: ctx.cabinetId,
      affaireId,
      compteRenduId,
      userId: session.user.id,
      metadata: {
        titre: model.compteRendu.titre,
        statut: model.compteRendu.statut,
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
    console.error("[pdf] export CR failed", err);
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
