import { NextResponse } from "next/server";

import { getAnalyticsOverview } from "@/lib/admin/analytics/queries";
import { requireAdminApi } from "@/lib/admin/require-admin-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi("analytics.view", req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "7d";
  const compare = searchParams.get("compare") === "true";

  const data = await getAnalyticsOverview(period, compare);
  return NextResponse.json(data);
}
