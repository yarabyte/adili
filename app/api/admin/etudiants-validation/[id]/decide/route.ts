import { addMonths } from "date-fns";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { executeAdminAction } from "@/lib/admin/audit-action";
import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { jsonError, jsonOk } from "@/lib/api/json";
import { sendEtudiantValidationNotice } from "@/lib/email/send-etudiant-validation-notice";
import { db } from "@/lib/db/client";
import { subscriptions, users, validationsEtudiants } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const Body = z.object({
  decision: z.enum(["validee", "rejetee"]),
  motif: z.string().min(10),
  motifRejet: z.string().optional(),
});

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdminApi("etudiant_validation.decide", req);
  if (auth instanceof Response) return auth;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("decision + motif requis", 400);
  }

  const [validation] = await db
    .select()
    .from(validationsEtudiants)
    .where(eq(validationsEtudiants.id, params.id))
    .limit(1);

  if (!validation) return jsonError("Demande introuvable", 404);

  const [studentUser] = await db
    .select({
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.id, validation.userId))
    .limit(1);

  const result = await executeAdminAction({
    admin: auth.admin,
    action: `etudiant_validation.${body.decision}`,
    cibleType: "validation_etudiant",
    cibleId: params.id,
    motif: body.motif,
    request: req,
    exec: async (tx) => {
      const now = new Date();
      const expireAt = addMonths(now, 12);
      const [updated] = await tx
        .update(validationsEtudiants)
        .set({
          statut: body.decision === "validee" ? "validee" : "rejetee",
          valideePar: auth.admin.userId,
          motifRejet:
            body.decision === "rejetee" ? body.motifRejet ?? body.motif : null,
          expireAt: body.decision === "validee" ? expireAt : validation.expireAt,
          updatedAt: now,
        })
        .where(eq(validationsEtudiants.id, params.id))
        .returning();

      if (body.decision === "validee") {
        const fin = expireAt;
        await tx
          .delete(subscriptions)
          .where(eq(subscriptions.userId, validation.userId));
        await tx.insert(subscriptions).values({
          userId: validation.userId,
          cabinetId: null,
          planId: "etudiant",
          statut: "actif",
          cycle: "mensuel",
          dateDebut: now,
          dateFin: fin,
        });
      }

      return {
        result: updated,
        etatAvant: validation,
        etatApres: updated,
      };
    },
  });

  const updated = result as typeof validationsEtudiants.$inferSelect;
  const to = studentUser?.email;
  if (to) {
    try {
      await sendEtudiantValidationNotice({
        to,
        fullName: studentUser.fullName,
        ecole: validation.ecole,
        decision: body.decision,
        motifRejet: updated.motifRejet,
        expireAt: body.decision === "validee" ? updated.expireAt : undefined,
      });
    } catch (err) {
      console.error("[etudiant_validation.decide] email", err);
    }
  }

  return jsonOk({ ok: true });
}
