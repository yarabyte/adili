import { NextResponse } from "next/server";

import { getTopPages } from "@/lib/admin/analytics/queries";
import { requireAdminApi } from "@/lib/admin/require-admin-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi("analytics.view", req);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "7d";
  const pages = await getTopPages(period);
  return NextResponse.json({ pages });
}
