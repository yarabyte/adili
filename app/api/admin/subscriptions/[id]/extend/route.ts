import { z } from "zod";

import { executeAdminAction } from "@/lib/admin/audit-action";
import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { extendSubscription } from "@/lib/admin/subscription-actions";
import { jsonError, jsonOk } from "@/lib/api/json";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const Body = z.object({
  months: z.coerce.number().int().min(1).max(36),
  motif: z.string().min(10),
});

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdminApi("subscription.extend", req);
  if (auth instanceof Response) return auth;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("months (1-36) et motif (min 10) requis", 400);
  }

  const [before] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, params.id))
    .limit(1);

  if (!before) return jsonError("Abonnement introuvable", 404);

  const updated = await executeAdminAction({
    admin: auth.admin,
    action: "subscription.extend",
    cibleType: "subscription",
    cibleId: params.id,
    motif: body.motif,
    request: req,
    exec: async (tx) => {
      const result = await extendSubscription(tx, params.id, body.months);
      return { result, etatAvant: before, etatApres: result };
    },
  });

  return jsonOk({ subscription: updated });
}
