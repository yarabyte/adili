import { asc, eq } from "drizzle-orm";

import { jsonOk } from "@/lib/api/json";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.isActive, true))
    .orderBy(asc(plans.ordreAffichage));

  return jsonOk({ plans: rows });
}
