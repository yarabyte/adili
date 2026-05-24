import { eq } from "drizzle-orm";
import { z } from "zod";

import { executeAdminAction } from "@/lib/admin/audit-action";
import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { acceptBetaCandidature } from "@/lib/billing/beta";
import {
  resolveBetaCabinetErrorMessage,
  resolveBetaCabinetForCandidature,
} from "@/lib/billing/resolve-beta-cabinet";
import { jsonError, jsonOk } from "@/lib/api/json";
import { sendEmailInBackground } from "@/lib/email/send-in-background";
import { sendBetaPioneerAccountSetupEmail } from "@/lib/email/send-beta-pioneer-account-setup";
import { db } from "@/lib/db/client";
import { candidaturesBeta } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const Body = z.object({
  decision: z.enum(["acceptee", "rejetee", "liste_attente"]),
  cabinetId: z.string().uuid().optional(),
  motif: z.string().min(10),
});

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdminApi("beta_application.decide", req);
  if (auth instanceof Response) return auth;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("decision + motif (min 10) requis", 400);
  }

  const [candidature] = await db
    .select()
    .from(candidaturesBeta)
    .where(eq(candidaturesBeta.id, params.id))
    .limit(1);

  if (!candidature) return jsonError("Candidature introuvable", 404);

  if (body.decision === "acceptee") {
    const resolved = await resolveBetaCabinetForCandidature(
      candidature.email,
      body.cabinetId
    );

    if (!resolved.ok) {
      const { failure } = resolved;
      if (failure.code === "no_account" || failure.code === "no_cabinet") {
        sendEmailInBackground("beta-pioneer-account-setup", () =>
          sendBetaPioneerAccountSetupEmail({
            to: candidature.email,
            displayName: candidature.nom,
          })
        );
        return jsonError(resolveBetaCabinetErrorMessage(failure), 409);
      }
      return jsonError(resolveBetaCabinetErrorMessage(failure), 400);
    }

    const cabinetId = resolved.cabinetId;

    try {
      await executeAdminAction({
        admin: auth.admin,
        action: "beta_application.accept",
        cibleType: "candidature_beta",
        cibleId: params.id,
        motif: body.motif,
        request: req,
        exec: async (tx) => {
          await acceptBetaCandidature(tx, params.id, cabinetId);
          const [after] = await tx
            .select()
            .from(candidaturesBeta)
            .where(eq(candidaturesBeta.id, params.id))
            .limit(1);
          return {
            result: after,
            etatAvant: candidature,
            etatApres: after,
          };
        },
      });
    } catch (err) {
      return jsonError(
        err instanceof Error ? err.message : "Échec acceptation",
        400
      );
    }
  } else {
    await executeAdminAction({
      admin: auth.admin,
      action: `beta_application.${body.decision}`,
      cibleType: "candidature_beta",
      cibleId: params.id,
      motif: body.motif,
      request: req,
      exec: async (tx) => {
        const [updated] = await tx
          .update(candidaturesBeta)
          .set({ statut: body.decision, updatedAt: new Date() })
          .where(eq(candidaturesBeta.id, params.id))
          .returning();
        return {
          result: updated,
          etatAvant: candidature,
          etatApres: updated,
        };
      },
    });
  }

  return jsonOk({ ok: true, decision: body.decision });
}
