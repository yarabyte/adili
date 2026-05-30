import { NextResponse } from "next/server";

import { getIaUsage } from "@/lib/admin/analytics/queries";
import { requireAdminApi } from "@/lib/admin/require-admin-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi("analytics.view", req);
  if (auth instanceof Response) return auth;

  const period = new URL(req.url).searchParams.get("period") ?? "7d";
  const usage = await getIaUsage(period);
  return NextResponse.json(usage);
}
