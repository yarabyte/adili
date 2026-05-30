import { NextResponse } from "next/server";

import { getBusinessRevenueSeries } from "@/lib/admin/analytics/queries";
import { parsePeriod } from "@/lib/analytics/periods";
import { requireAdminApi } from "@/lib/admin/require-admin-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi("analytics.view", req);
  if (auth instanceof Response) return auth;

  const period = parsePeriod(new URL(req.url).searchParams.get("period"));
  const series = await getBusinessRevenueSeries(period);
  return NextResponse.json({ series });
}
