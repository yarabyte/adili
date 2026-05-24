import { eq } from "drizzle-orm";
import { z } from "zod";

import { executeAdminAction } from "@/lib/admin/audit-action";
import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { reactivateSubscription } from "@/lib/admin/subscription-actions";
import { jsonError, jsonOk } from "@/lib/api/json";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const Body = z.object({
  motif: z.string().min(10),
});

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdminApi("subscription.reactivate", req);
  if (auth instanceof Response) return auth;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("motif requis (min 10 caractères)", 400);
  }

  const [before] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, params.id))
    .limit(1);

  if (!before) return jsonError("Abonnement introuvable", 404);

  const updated = await executeAdminAction({
    admin: auth.admin,
    action: "subscription.reactivate",
    cibleType: "subscription",
    cibleId: params.id,
    motif: body.motif,
    request: req,
    exec: async (tx) => {
      const result = await reactivateSubscription(tx, params.id);
      return { result, etatAvant: before, etatApres: result };
    },
  });

  return jsonOk({ subscription: updated });
}
