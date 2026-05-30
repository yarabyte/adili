import { NextResponse } from "next/server";
import { z } from "zod";

import { isBot } from "@/lib/analytics/anti-bot";
import { categorizeEvent } from "@/lib/analytics/events";
import { getGeoFromHeaders, stripSensitiveQuery } from "@/lib/analytics/geo";
import { anonymizeIp, getClientIp } from "@/lib/analytics/ip";
import { shouldSample, isAnalyticsEnabled } from "@/lib/analytics/sampling";
import {
  updateSessionAggregates,
  type EnrichedEvent,
} from "@/lib/analytics/sessions";
import { parseUserAgent } from "@/lib/analytics/ua";
import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const EventSchema = z.object({
  event_name: z.string().max(100),
  visitor_id: z.string().min(8).max(64),
  session_id: z.string().min(8).max(64),
  url: z.string().max(2000).optional(),
  path: z.string().max(500).optional(),
  referrer: z.string().max(2000).nullable().optional(),
  utm_source: z.string().max(200).nullable().optional(),
  utm_medium: z.string().max(200).nullable().optional(),
  utm_campaign: z.string().max(200).nullable().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  screen_resolution: z.string().max(32).optional(),
  client_timestamp: z.string().optional(),
});

const BodySchema = z.object({
  events: z.array(EventSchema).max(50),
});

export async function POST(req: Request) {
  if (!isAnalyticsEnabled()) {
    return NextResponse.json({ ok: true, accepted: 0, disabled: true });
  }

  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) {
    return NextResponse.json({ ok: true, accepted: 0, skipped: "bot" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const profile = await getCurrentProfile();
  const ip = getClientIp(req);
  const ipAnonymized = anonymizeIp(ip);
  const geo = getGeoFromHeaders(req);
  const parsedUa = parseUserAgent(ua);

  const enriched: EnrichedEvent[] = [];

  for (const event of parsed.data.events) {
    if (!shouldSample(event.event_name)) continue;

    enriched.push({
      eventName: event.event_name,
      eventCategory: categorizeEvent(event.event_name),
      visitorId: event.visitor_id,
      sessionId: event.session_id,
      userId: profile?.user.id ?? null,
      cabinetId: profile?.profile?.cabinetId ?? null,
      url: stripSensitiveQuery(event.url) ?? null,
      path: event.path ?? null,
      referrer: event.referrer ?? null,
      utmSource: event.utm_source ?? null,
      utmMedium: event.utm_medium ?? null,
      utmCampaign: event.utm_campaign ?? null,
      userAgent: ua,
      browser: parsedUa.browser,
      browserVersion: parsedUa.browserVersion,
      os: parsedUa.os,
      deviceType: parsedUa.deviceType,
      screenResolution: event.screen_resolution ?? null,
      ipAnonymized,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      properties: event.properties ?? {},
      durationMs: event.duration_ms ?? null,
    });
  }

  if (enriched.length === 0) {
    return NextResponse.json({ ok: true, accepted: 0 });
  }

  await db.insert(analyticsEvents).values(
    enriched.map((e) => ({
      eventName: e.eventName,
      eventCategory: e.eventCategory,
      visitorId: e.visitorId,
      sessionId: e.sessionId,
      userId: e.userId,
      cabinetId: e.cabinetId,
      url: e.url,
      path: e.path,
      referrer: e.referrer,
      utmSource: e.utmSource,
      utmMedium: e.utmMedium,
      utmCampaign: e.utmCampaign,
      userAgent: e.userAgent,
      browser: e.browser,
      browserVersion: e.browserVersion,
      os: e.os,
      deviceType: e.deviceType,
      screenResolution: e.screenResolution,
      ipAnonymized: e.ipAnonymized,
      country: e.country,
      region: e.region,
      city: e.city,
      properties: e.properties,
      durationMs: e.durationMs,
    }))
  );

  updateSessionAggregates(enriched).catch((err) => {
    console.error("[analytics/collect] session update failed", err);
  });

  return NextResponse.json({ ok: true, accepted: enriched.length });
}
