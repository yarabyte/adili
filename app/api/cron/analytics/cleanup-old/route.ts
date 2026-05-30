import { NextResponse } from "next/server";
import { and, lt, notInArray } from "drizzle-orm";

import { verifyCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = verifyCronSecret(req);
  if (denied) return denied;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);

  await db
    .delete(analyticsEvents)
    .where(
      and(
        lt(analyticsEvents.createdAt, cutoff),
        notInArray(analyticsEvents.eventCategory, ["business", "payment"])
      )
    );

  return NextResponse.json({ ok: true, cutoff: cutoff.toISOString() });
}
