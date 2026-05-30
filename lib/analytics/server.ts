import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";
import { categorizeEvent, type AnalyticsEventCategory } from "@/lib/analytics/events";
import { isAnalyticsEnabled } from "@/lib/analytics/sampling";

export type TrackServerEventParams = {
  event_name: string;
  event_category?: AnalyticsEventCategory;
  user_id?: string | null;
  cabinet_id?: string | null;
  visitor_id?: string;
  session_id?: string;
  path?: string;
  properties?: Record<string, unknown>;
  duration_ms?: number;
};

export async function trackServerEvent(params: TrackServerEventParams): Promise<void> {
  if (!isAnalyticsEnabled()) return;

  const visitorId =
    params.visitor_id ?? `srv_${params.user_id ?? "anon"}_${Date.now()}`;
  const sessionId = params.session_id ?? `srv_${params.user_id ?? "anon"}_${Date.now()}`;

  await db.insert(analyticsEvents).values({
    eventName: params.event_name,
    eventCategory: params.event_category ?? categorizeEvent(params.event_name),
    visitorId,
    sessionId,
    userId: params.user_id ?? null,
    cabinetId: params.cabinet_id ?? null,
    path: params.path ?? null,
    properties: params.properties ?? {},
    durationMs: params.duration_ms ?? null,
  });
}
