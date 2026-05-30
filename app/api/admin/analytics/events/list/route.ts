import { NextResponse } from "next/server";

import { getRecentEvents } from "@/lib/admin/analytics/queries";
import { requireAdminApi } from "@/lib/admin/require-admin-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi("analytics.view", req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const category = searchParams.get("category") ?? undefined;
  const events = await getRecentEvents(limit, category);
  return NextResponse.json({ events });
}
