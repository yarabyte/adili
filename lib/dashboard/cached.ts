import "server-only";

import { unstable_cache } from "next/cache";

import type { CurrentProfile } from "@/lib/auth/profile";
import {
  getCabinetDashboard,
  type CabinetDashboardData,
} from "@/lib/dashboard/get-cabinet-dashboard";

const DASHBOARD_CACHE_SECONDS = 30;

export function getCabinetDashboardCached(
  session: CurrentProfile
): Promise<CabinetDashboardData | null> {
  const cabinetId = session.profile?.cabinetId;
  if (!cabinetId) return Promise.resolve(null);

  const userId = session.user.id;
  const role = session.profile?.role ?? "collaborateur";

  return unstable_cache(
    () => getCabinetDashboard(session),
    ["cabinet-dashboard", cabinetId, userId, role],
    {
      revalidate: DASHBOARD_CACHE_SECONDS,
      tags: [`dashboard-${cabinetId}`],
    }
  )();
}
