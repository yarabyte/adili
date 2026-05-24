import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { getRevenueMetrics } from "@/lib/admin/revenue";
import { jsonOk } from "@/lib/api/json";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminApi("subscription.view", req);
  if (auth instanceof Response) return auth;

  const metrics = await getRevenueMetrics();
  return jsonOk(metrics);
}
