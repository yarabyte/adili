import { AnalyticsOverviewClient } from "@/components/admin/analytics/analytics-overview-client";

export const metadata = { title: "Analytics · Admin" };
export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = searchParams.period ?? "7d";

  return <AnalyticsOverviewClient period={period} />;
}
