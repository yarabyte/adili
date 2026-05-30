import { NextResponse } from "next/server";

import { getOnlineUsers } from "@/lib/admin/analytics/queries";
import { requireAdminApi } from "@/lib/admin/require-admin-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi("analytics.view", req);
  if (auth instanceof Response) return auth;

  const users = await getOnlineUsers();
  return NextResponse.json({ users, count: users.length });
}
