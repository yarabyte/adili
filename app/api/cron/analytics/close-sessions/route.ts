import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { verifyCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = verifyCronSecret(req);
  if (denied) return denied;

  const cutoff = new Date(Date.now() - 30 * 60 * 1000);

  const result = await db.execute(sql`
    UPDATE analytics_sessions s
    SET
      ended_at = sub.last_event,
      duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (sub.last_event - s.started_at))::INT),
      is_bounce = (
        s.page_views_count <= 1
        AND EXTRACT(EPOCH FROM (sub.last_event - s.started_at)) < 10
      )
    FROM (
      SELECT session_id, MAX(created_at) AS last_event
      FROM analytics_events
      GROUP BY session_id
    ) sub
    WHERE s.id = sub.session_id
      AND s.ended_at IS NULL
      AND sub.last_event < ${cutoff}
  `);

  const closed =
    typeof result === "object" &&
    result !== null &&
    "rowCount" in result &&
    typeof result.rowCount === "number"
      ? result.rowCount
      : 0;

  return NextResponse.json({ ok: true, closed });
}
