import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { getQuotaSummaryForUser } from "@/lib/quotas/check-and-consume";
import type { QuotaSummary } from "@/lib/quotas/types";

const QUOTA_CACHE_SECONDS = 60;

export function getQuotaSummaryCached(
  userId: string
): Promise<QuotaSummary | null> {
  return unstable_cache(
    () => getQuotaSummaryForUser(userId),
    ["quota-summary", userId],
    { revalidate: QUOTA_CACHE_SECONDS, tags: [`quota-${userId}`] }
  )();
}

export function revalidateQuotaSummary(userId: string): void {
  revalidateTag(`quota-${userId}`);
}
