import { and, desc, eq, gt } from "drizzle-orm";

import { jsonError, jsonOk } from "@/lib/api/json";
import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { packsAdditionnels } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentProfile();
  if (!session) {
    return jsonError("Non authentifié", 401);
  }

  const rows = await db
    .select()
    .from(packsAdditionnels)
    .where(
      and(
        eq(packsAdditionnels.userId, session.user.id),
        eq(packsAdditionnels.statut, "actif"),
        gt(packsAdditionnels.dateExpiration, new Date())
      )
    )
    .orderBy(desc(packsAdditionnels.dateAchat));

  return jsonOk({ packs: rows });
}
