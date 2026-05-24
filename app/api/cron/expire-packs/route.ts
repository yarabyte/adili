import { and, eq, lt } from "drizzle-orm";

import { verifyCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db/client";
import { packsAdditionnels } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = verifyCronSecret(req);
  if (denied) return denied;

  const updated = await db
    .update(packsAdditionnels)
    .set({ statut: "expire" })
    .where(
      and(
        eq(packsAdditionnels.statut, "actif"),
        lt(packsAdditionnels.dateExpiration, new Date())
      )
    )
    .returning({ id: packsAdditionnels.id });

  return Response.json({ expired: updated.length });
}
