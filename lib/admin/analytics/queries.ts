import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
} from "drizzle-orm";

import {
  formatDayLabel,
  getPeriodRange,
  getPreviousPeriodRange,
  parsePeriod,
  pctChange,
  type AnalyticsPeriod,
  type PeriodRange,
} from "@/lib/analytics/periods";
import { resolveTrafficSource } from "@/lib/analytics/geo";
import { db } from "@/lib/db/client";
import { analyticsEvents, users } from "@/lib/db/schema";

function rangeWhere(range: PeriodRange) {
  return and(
    gte(analyticsEvents.createdAt, range.from),
    lte(analyticsEvents.createdAt, range.to)
  );
}

async function countDistinctVisitors(range: PeriodRange): Promise<number> {
  const [row] = await db
    .select({ n: countDistinct(analyticsEvents.visitorId) })
    .from(analyticsEvents)
    .where(rangeWhere(range));
  return Number(row?.n ?? 0);
}

async function countDistinctSessions(range: PeriodRange): Promise<number> {
  const [row] = await db
    .select({ n: countDistinct(analyticsEvents.sessionId) })
    .from(analyticsEvents)
    .where(rangeWhere(range));
  return Number(row?.n ?? 0);
}

async function countEvent(
  eventName: string,
  range: PeriodRange,
  extra?: ReturnType<typeof sql>
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.eventName, eventName),
        rangeWhere(range),
        extra
      )
    );
  return Number(row?.n ?? 0);
}

async function countDistinctActiveUsers(range: PeriodRange): Promise<number> {
  const [row] = await db
    .select({ n: countDistinct(analyticsEvents.userId) })
    .from(analyticsEvents)
    .where(
      and(rangeWhere(range), sql`${analyticsEvents.userId} IS NOT NULL`)
    );
  return Number(row?.n ?? 0);
}

async function sumPaymentRevenue(range: PeriodRange): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM((${analyticsEvents.properties}->>'amount_fcfa')::bigint), 0)`,
    })
    .from(analyticsEvents)
    .where(
      and(eq(analyticsEvents.eventName, "payment_completed"), rangeWhere(range))
    );
  return Number(row?.total ?? 0);
}

export async function countOnlineNow(): Promise<number> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const [row] = await db
    .select({ n: countDistinct(analyticsEvents.sessionId) })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, cutoff));
  return Number(row?.n ?? 0);
}

export async function getAnalyticsOverview(periodParam: string, compare: boolean) {
  const period = parsePeriod(periodParam);
  const current = getPeriodRange(period);
  const previous = compare ? getPreviousPeriodRange(period) : null;

  const fetchSet = async (range: PeriodRange) =>
    Promise.all([
      countDistinctVisitors(range),
      countDistinctSessions(range),
      countEvent("page_view", range),
      countEvent("signup_completed", range),
      countEvent("subscription_created", range),
      sumPaymentRevenue(range),
      countDistinctActiveUsers(range),
      countEvent("ai_call", range, sql`${analyticsEvents.properties}->>'success' = 'true'`),
      countOnlineNow(),
    ]);

  const [currentValues, previousValues] = await Promise.all([
    fetchSet(current),
    previous ? fetchSet(previous) : Promise.resolve(null),
  ]);

  const [
    visitors,
    sessions,
    pageViews,
    signups,
    newSubscriptions,
    revenue,
    activeUsers,
    aiCalls,
    onlineNow,
  ] = currentValues;

  const kpis = {
    visitors: {
      value: visitors,
      change: pctChange(visitors, previousValues?.[0]),
    },
    sessions: {
      value: sessions,
      change: pctChange(sessions, previousValues?.[1]),
    },
    page_views: {
      value: pageViews,
      change: pctChange(pageViews, previousValues?.[2]),
    },
    signups: { value: signups, change: pctChange(signups, previousValues?.[3]) },
    new_subscriptions: {
      value: newSubscriptions,
      change: pctChange(newSubscriptions, previousValues?.[4]),
    },
    revenue_fcfa: {
      value: revenue,
      change: pctChange(revenue, previousValues?.[5]),
    },
    active_users: {
      value: activeUsers,
      change: pctChange(activeUsers, previousValues?.[6]),
    },
    ai_calls: { value: aiCalls, change: pctChange(aiCalls, previousValues?.[7]) },
    online_now: { value: onlineNow, change: null },
  };

  return { period, range: current, kpis };
}

export async function getDailyTrafficSeries(periodParam: string) {
  const period = parsePeriod(periodParam);
  const range = getPeriodRange(period);

  const rows = await db
    .select({
      day: sql<string>`DATE_TRUNC('day', ${analyticsEvents.createdAt} AT TIME ZONE 'Africa/Douala')`,
      visitors: countDistinct(analyticsEvents.visitorId),
      sessions: countDistinct(analyticsEvents.sessionId),
      pageViews: sql<number>`COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'page_view')`,
    })
    .from(analyticsEvents)
    .where(rangeWhere(range))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return rows.map((r) => ({
    day: formatDayLabel(new Date(r.day)),
    Visiteurs: Number(r.visitors),
    Sessions: Number(r.sessions),
    "Pages vues": Number(r.pageViews),
  }));
}

export async function getTopPages(periodParam: string, limit = 10) {
  const period = parsePeriod(periodParam);
  const range = getPeriodRange(period);

  const rows = await db
    .select({
      path: analyticsEvents.path,
      views: count(),
      uniqueVisitors: countDistinct(analyticsEvents.visitorId),
      avgDuration: sql<number>`AVG(${analyticsEvents.durationMs}) FILTER (WHERE ${analyticsEvents.durationMs} IS NOT NULL)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.eventName, "page_view"),
        rangeWhere(range),
        sql`${analyticsEvents.path} IS NOT NULL`
      )
    )
    .groupBy(analyticsEvents.path)
    .orderBy(desc(count()))
    .limit(limit);

  return rows.map((r) => ({
    path: r.path ?? "/",
    views: Number(r.views),
    uniqueVisitors: Number(r.uniqueVisitors),
    avgDurationMs: Math.round(Number(r.avgDuration ?? 0)),
  }));
}

export async function getTrafficSources(periodParam: string) {
  const period = parsePeriod(periodParam);
  const range = getPeriodRange(period);

  const rows = await db
    .select({
      utmSource: analyticsEvents.utmSource,
      referrer: analyticsEvents.referrer,
      visitors: countDistinct(analyticsEvents.visitorId),
    })
    .from(analyticsEvents)
    .where(rangeWhere(range))
    .groupBy(analyticsEvents.utmSource, analyticsEvents.referrer);

  const merged = new Map<string, number>();
  for (const row of rows) {
    const source = resolveTrafficSource(row.utmSource, row.referrer);
    merged.set(source, (merged.get(source) ?? 0) + Number(row.visitors));
  }

  return [...merged.entries()]
    .map(([source, visitors]) => ({ source, visitors }))
    .sort((a, b) => b.visitors - a.visitors);
}

export async function getGeography(periodParam: string, limit = 10) {
  const period = parsePeriod(periodParam);
  const range = getPeriodRange(period);

  const rows = await db
    .select({
      country: analyticsEvents.country,
      visitors: countDistinct(analyticsEvents.visitorId),
    })
    .from(analyticsEvents)
    .where(and(rangeWhere(range), sql`${analyticsEvents.country} IS NOT NULL`))
    .groupBy(analyticsEvents.country)
    .orderBy(desc(countDistinct(analyticsEvents.visitorId)))
    .limit(limit);

  return rows.map((r) => ({
    country: r.country ?? "—",
    visitors: Number(r.visitors),
  }));
}

export async function getDeviceBreakdown(periodParam: string) {
  const period = parsePeriod(periodParam);
  const range = getPeriodRange(period);

  const rows = await db
    .select({
      deviceType: analyticsEvents.deviceType,
      visitors: countDistinct(analyticsEvents.visitorId),
    })
    .from(analyticsEvents)
    .where(rangeWhere(range))
    .groupBy(analyticsEvents.deviceType)
    .orderBy(desc(countDistinct(analyticsEvents.visitorId)));

  return rows.map((r) => ({
    device: r.deviceType ?? "desktop",
    visitors: Number(r.visitors),
  }));
}

export async function getBrowserBreakdown(periodParam: string) {
  const period = parsePeriod(periodParam);
  const range = getPeriodRange(period);

  const rows = await db
    .select({
      browser: analyticsEvents.browser,
      visitors: countDistinct(analyticsEvents.visitorId),
    })
    .from(analyticsEvents)
    .where(and(rangeWhere(range), sql`${analyticsEvents.browser} IS NOT NULL`))
    .groupBy(analyticsEvents.browser)
    .orderBy(desc(countDistinct(analyticsEvents.visitorId)))
    .limit(8);

  return rows.map((r) => ({
    browser: r.browser ?? "Autre",
    visitors: Number(r.visitors),
  }));
}

export async function getRecentEvents(limit = 50, category?: string) {
  const conditions = category
    ? eq(analyticsEvents.eventCategory, category)
    : undefined;

  const rows = await db
    .select({
      id: analyticsEvents.id,
      eventName: analyticsEvents.eventName,
      eventCategory: analyticsEvents.eventCategory,
      path: analyticsEvents.path,
      country: analyticsEvents.country,
      city: analyticsEvents.city,
      userId: analyticsEvents.userId,
      createdAt: analyticsEvents.createdAt,
      properties: analyticsEvents.properties,
    })
    .from(analyticsEvents)
    .where(conditions)
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(limit);

  return rows;
}

export async function getOnlineUsers() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);

  const rows = await db
    .select({
      sessionId: analyticsEvents.sessionId,
      userId: analyticsEvents.userId,
      path: analyticsEvents.path,
      city: analyticsEvents.city,
      country: analyticsEvents.country,
      lastSeen: sql<Date>`MAX(${analyticsEvents.createdAt})`,
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, cutoff))
    .groupBy(
      analyticsEvents.sessionId,
      analyticsEvents.userId,
      analyticsEvents.path,
      analyticsEvents.city,
      analyticsEvents.country
    )
    .orderBy(desc(sql`MAX(${analyticsEvents.createdAt})`))
    .limit(50);

  const userIds = rows
    .map((r) => r.userId)
    .filter((id): id is string => Boolean(id));

  const userRows =
    userIds.length > 0
      ? await db
          .select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const userMap = new Map(userRows.map((u) => [u.id, u]));

  return rows.map((r) => {
    const user = r.userId ? userMap.get(r.userId) : null;
    return {
      sessionId: r.sessionId,
      userId: r.userId,
      nom: user?.fullName ?? null,
      email: user?.email ?? null,
      path: r.path ?? "/",
      city: r.city,
      country: r.country,
      lastSeen:
        r.lastSeen instanceof Date ? r.lastSeen.toISOString() : String(r.lastSeen),
    };
  });
}

export async function getIaUsage(periodParam: string) {
  const period = parsePeriod(periodParam);
  const range = getPeriodRange(period);

  const [totals] = await db
    .select({
      total: count(),
      success: sql<number>`COUNT(*) FILTER (WHERE ${analyticsEvents.properties}->>'success' = 'true')`,
      failed: sql<number>`COUNT(*) FILTER (WHERE ${analyticsEvents.properties}->>'success' = 'false')`,
    })
    .from(analyticsEvents)
    .where(
      and(eq(analyticsEvents.eventCategory, "ia"), rangeWhere(range))
    );

  const byFeature = await db
    .select({
      feature: analyticsEvents.eventName,
      count: count(),
    })
    .from(analyticsEvents)
    .where(
      and(eq(analyticsEvents.eventCategory, "ia"), rangeWhere(range))
    )
    .groupBy(analyticsEvents.eventName)
    .orderBy(desc(count()));

  return {
    total: Number(totals?.total ?? 0),
    success: Number(totals?.success ?? 0),
    failed: Number(totals?.failed ?? 0),
    byFeature: byFeature.map((r) => ({
      feature: r.feature,
      count: Number(r.count),
    })),
  };
}

export async function getBusinessRevenueSeries(period: AnalyticsPeriod) {
  const range = getPeriodRange(period);

  const rows = await db
    .select({
      day: sql<string>`DATE_TRUNC('day', ${analyticsEvents.createdAt} AT TIME ZONE 'Africa/Douala')`,
      revenue: sql<number>`COALESCE(SUM((${analyticsEvents.properties}->>'amount_fcfa')::bigint), 0)`,
      subscriptions: sql<number>`COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'subscription_created')`,
    })
    .from(analyticsEvents)
    .where(
      and(
        rangeWhere(range),
        inArray(analyticsEvents.eventName, [
          "payment_completed",
          "subscription_created",
        ])
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return rows.map((r) => ({
    day: formatDayLabel(new Date(r.day)),
    Revenus: Number(r.revenue),
    Abonnements: Number(r.subscriptions),
  }));
}
