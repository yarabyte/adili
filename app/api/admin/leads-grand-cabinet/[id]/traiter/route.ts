import { eq } from "drizzle-orm";
import { z } from "zod";

import { executeAdminAction } from "@/lib/admin/audit-action";
import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { jsonError, jsonOk } from "@/lib/api/json";
import { db } from "@/lib/db/client";
import { leadsGrandCabinet } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const Body = z.object({
  motif: z.string().min(10),
  notesInternes: z.string().max(5000).optional(),
});

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdminApi("lead_grand_cabinet.traiter", req);
  if (auth instanceof Response) return auth;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("motif requis (min. 10 caractères)", 400);
  }

  const [lead] = await db
    .select()
    .from(leadsGrandCabinet)
    .where(eq(leadsGrandCabinet.id, params.id))
    .limit(1);

  if (!lead) return jsonError("Lead introuvable", 404);
  if (lead.statut === "traite") {
    return jsonError("Ce lead est déjà marqué comme traité", 409);
  }

  await executeAdminAction({
    admin: auth.admin,
    action: "lead_grand_cabinet.traite",
    cibleType: "lead_grand_cabinet",
    cibleId: params.id,
    motif: body.motif,
    request: req,
    exec: async (tx) => {
      const now = new Date();
      const [updated] = await tx
        .update(leadsGrandCabinet)
        .set({
          statut: "traite",
          traitePar: auth.admin.userId,
          notesInternes: body.notesInternes?.trim() || lead.notesInternes,
          updatedAt: now,
        })
        .where(eq(leadsGrandCabinet.id, params.id))
        .returning();

      return {
        result: updated,
        etatAvant: lead,
        etatApres: updated,
      };
    },
  });

  return jsonOk({ ok: true });
}
