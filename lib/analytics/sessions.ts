import { eq, sql } from "drizzle-orm";

import { BUSINESS_CONVERSION_EVENTS } from "@/lib/analytics/events";
import { db } from "@/lib/db/client";
import { analyticsSessions } from "@/lib/db/schema";

export type RawCollectedEvent = {
  event_name: string;
  visitor_id: string;
  session_id: string;
  url?: string;
  path?: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  properties?: Record<string, unknown>;
  duration_ms?: number;
  screen_resolution?: string;
};

export type EnrichedEvent = {
  eventName: string;
  eventCategory: string;
  visitorId: string;
  sessionId: string;
  userId: string | null;
  cabinetId: string | null;
  url: string | null;
  path: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  userAgent: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  deviceType: string | null;
  screenResolution: string | null;
  ipAnonymized: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  properties: Record<string, unknown>;
  durationMs: number | null;
};

export async function updateSessionAggregates(events: EnrichedEvent[]): Promise<void> {
  if (events.length === 0) return;

  const bySession = new Map<string, EnrichedEvent[]>();
  for (const event of events) {
    const list = bySession.get(event.sessionId) ?? [];
    list.push(event);
    bySession.set(event.sessionId, list);
  }

  for (const [sessionId, sessionEvents] of bySession) {
    const first = sessionEvents[0]!;
    const last = sessionEvents[sessionEvents.length - 1]!;
    const pageViews = sessionEvents.filter((e) => e.eventName === "page_view").length;
    const hasConversion = sessionEvents.some((e) =>
      BUSINESS_CONVERSION_EVENTS.has(e.eventName)
    );

    await db
      .insert(analyticsSessions)
      .values({
        id: sessionId,
        visitorId: first.visitorId,
        userId: first.userId,
        startedAt: new Date(),
        entryPage: first.path ?? "/",
        entryReferrer: first.referrer,
        entryUtmSource: first.utmSource,
        entryUtmMedium: first.utmMedium,
        entryUtmCampaign: first.utmCampaign,
        exitPage: last.path,
        pageViewsCount: pageViews,
        eventsCount: sessionEvents.length,
        country: first.country,
        city: first.city,
        deviceType: first.deviceType,
        browser: first.browser,
        isConverted: hasConversion,
      })
      .onConflictDoUpdate({
        target: analyticsSessions.id,
        set: {
          userId: sql`COALESCE(excluded.user_id, ${analyticsSessions.userId})`,
          exitPage: sql`COALESCE(excluded.exit_page, ${analyticsSessions.exitPage})`,
          pageViewsCount: sql`${analyticsSessions.pageViewsCount} + excluded.page_views_count`,
          eventsCount: sql`${analyticsSessions.eventsCount} + excluded.events_count`,
          country: sql`COALESCE(excluded.country, ${analyticsSessions.country})`,
          city: sql`COALESCE(excluded.city, ${analyticsSessions.city})`,
          deviceType: sql`COALESCE(excluded.device_type, ${analyticsSessions.deviceType})`,
          browser: sql`COALESCE(excluded.browser, ${analyticsSessions.browser})`,
          isConverted: sql`${analyticsSessions.isConverted} OR excluded.is_converted`,
        },
      });

    if (hasConversion) {
      await db
        .update(analyticsSessions)
        .set({ isConverted: true })
        .where(eq(analyticsSessions.id, sessionId));
    }
  }
}
