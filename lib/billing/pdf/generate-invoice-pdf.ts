import "server-only";

import { eq } from "drizzle-orm";

import {
  buildInvoicePrintHtml,
  type InvoiceLine,
} from "@/lib/billing/pdf/invoice-html";
import { db } from "@/lib/db/client";
import { cabinets, factures, paiements } from "@/lib/db/schema";
import { generatePdfFromHtml } from "@/lib/documents/pdf/generate-pdf";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const FACTURES_BUCKET = "factures";

export async function loadInvoicePrintModel(
  factureId: string
): Promise<ReturnType<typeof buildInvoicePrintHtml> extends string ? Parameters<typeof buildInvoicePrintHtml>[0] : never> {
  const [row] = await db
    .select({
      facture: factures,
      cabinet: cabinets,
      paiement: paiements,
    })
    .from(factures)
    .leftJoin(cabinets, eq(factures.cabinetId, cabinets.id))
    .leftJoin(paiements, eq(factures.paiementId, paiements.id))
    .where(eq(factures.id, factureId))
    .limit(1);

  if (!row) throw new Error("Facture introuvable");

  const lignes = (Array.isArray(row.facture.lignes)
    ? row.facture.lignes
    : []) as InvoiceLine[];
  const tva = Number(row.facture.tvaPourcent ?? 19.25);
  const montantHt = row.facture.montantHtFcfa;
  const montantTtc = row.facture.montantTtcFcfa;
  const montantTva = montantTtc - montantHt;

  return {
    numero: row.facture.numero,
    type: row.facture.type,
    dateEmission: row.facture.dateEmission ?? new Date().toISOString().slice(0, 10),
    dateEcheance: row.facture.dateEcheance,
    emetteur: {
      raisonSociale:
        process.env.ADILI_LEGAL_NAME ?? "Adili — Plateforme juridique OHADA",
      adresse: process.env.ADILI_LEGAL_ADDRESS ?? null,
      niu: process.env.ADILI_NIU ?? null,
      rib:
        process.env.ADILI_BANK_RIB ?? process.env.LEXAI_BANK_RIB ?? null,
    },
    destinataire: {
      nom: row.cabinet?.name ?? "Client",
      adresse: row.cabinet?.address ?? null,
      niu: row.cabinet?.niu ?? null,
    },
    lignes,
    montantHt,
    tvaPourcent: tva,
    montantTva,
    montantTtc,
    referenceVirement: row.paiement?.referenceVirement ?? null,
  };
}

export async function generateAndStoreInvoicePdf(
  factureId: string
): Promise<{ path: string; buffer: Buffer }> {
  const model = await loadInvoicePrintModel(factureId);
  const html = buildInvoicePrintHtml(model);
  const buffer = await generatePdfFromHtml(html);

  const path = `${factureId}/${model.numero.replace(/\//g, "-")}.pdf`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(FACTURES_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(
      error.message.includes("Bucket not found")
        ? `Bucket Storage « ${FACTURES_BUCKET} » absent — créez-le dans Supabase.`
        : error.message
    );
  }

  await db
    .update(factures)
    .set({ pdfUrl: path })
    .where(eq(factures.id, factureId));

  return { path, buffer };
}
