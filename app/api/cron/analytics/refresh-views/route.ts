import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { verifyCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = verifyCronSecret(req);
  if (denied) return denied;

  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_kpis`
  );
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_pages`
  );
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_traffic_sources`
  );

  return NextResponse.json({ ok: true, refreshed: 3 });
}
