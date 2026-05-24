import { eq } from "drizzle-orm";

import { jsonError } from "@/lib/api/json";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getCurrentAdmin } from "@/lib/admin/check";
import {
  FACTURES_BUCKET,
  generateAndStoreInvoicePdf,
} from "@/lib/billing/pdf/generate-invoice-pdf";
import { db } from "@/lib/db/client";
import { factures } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const session = await getCurrentProfile();
  const admin = await getCurrentAdmin();
  if (!session && !admin) {
    return jsonError("Non authentifié", 401);
  }

  const [facture] = await db
    .select()
    .from(factures)
    .where(eq(factures.id, params.id))
    .limit(1);

  if (!facture) return jsonError("Facture introuvable", 404);

  if (session?.profile?.cabinetId !== facture.cabinetId && !admin) {
    return jsonError("Accès refusé", 403);
  }

  let buffer: Buffer;

  if (facture.pdfUrl) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(FACTURES_BUCKET)
      .download(facture.pdfUrl);
    if (!error && data) {
      buffer = Buffer.from(await data.arrayBuffer());
    } else {
      const generated = await generateAndStoreInvoicePdf(params.id);
      buffer = generated.buffer;
    }
  } else {
    const generated = await generateAndStoreInvoicePdf(params.id);
    buffer = generated.buffer;
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${facture.numero}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
