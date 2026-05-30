"use client";

import { shouldTrackWebPath } from "@/lib/analytics/geo";

const VISITOR_COOKIE = "adili_vid";
const SESSION_COOKIE = "adili_sid";
const SESSION_TTL_MIN = 30;

type QueuedEvent = {
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
  client_timestamp?: string;
};

class AnalyticsClient {
  private visitorId: string;
  private sessionId: string;
  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
    this.scheduleFlush();
  }

  private getOrCreateVisitorId(): string {
    let id = this.getCookie(VISITOR_COOKIE);
    if (!id) {
      id = crypto.randomUUID();
      this.setCookie(VISITOR_COOKIE, id, 365);
    }
    return id;
  }

  private getOrCreateSessionId(): string {
    let id = this.getCookie(SESSION_COOKIE);
    if (!id) {
      id = crypto.randomUUID();
      this.setCookie(SESSION_COOKIE, id, null, SESSION_TTL_MIN);
    }
    return id;
  }

  private refreshSession() {
    this.setCookie(SESSION_COOKIE, this.sessionId, null, SESSION_TTL_MIN);
  }

  track(eventName: string, properties: Record<string, unknown> = {}) {
    if (!this.enabled) return;
    const path =
      typeof properties.path === "string"
        ? properties.path
        : window.location.pathname;
    if (!shouldTrackWebPath(path)) return;

    const utm = this.getStoredUtm();
    this.queue.push({
      event_name: eventName,
      visitor_id: this.visitorId,
      session_id: this.sessionId,
      url: window.location.href,
      path,
      referrer: document.referrer || null,
      utm_source: utm?.utm_source ?? null,
      utm_medium: utm?.utm_medium ?? null,
      utm_campaign: utm?.utm_campaign ?? null,
      properties,
      client_timestamp: new Date().toISOString(),
    });
    this.refreshSession();

    if (this.queue.length >= 5) void this.flush();
  }

  trackPageView(extras: Record<string, unknown> = {}) {
    this.track("page_view", {
      title: document.title,
      screen_resolution: `${screen.width}x${screen.height}`,
      ...extras,
    });
  }

  trackCta(label: string, href?: string) {
    this.track("click_cta", { label, href });
  }

  private getStoredUtm(): {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
  } | null {
    try {
      const raw = sessionStorage.getItem("adili_utm");
      return raw ? (JSON.parse(raw) as ReturnType<AnalyticsClient["getStoredUtm"]>) : null;
    } catch {
      return null;
    }
  }

  async flush() {
    if (this.queue.length === 0) return;
    const events = [...this.queue];
    this.queue = [];

    try {
      const res = await fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
      if (!res.ok) {
        this.queue.unshift(...events);
      }
    } catch {
      this.queue.unshift(...events);
    }
  }

  private scheduleFlush() {
    this.flushTimer = setInterval(() => void this.flush(), 10_000);

    window.addEventListener("beforeunload", () => {
      if (this.queue.length === 0) return;
      const blob = new Blob([JSON.stringify({ events: this.queue })], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/analytics/collect", blob);
    });

    window.addEventListener("pagehide", () => void this.flush());
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]!) : null;
  }

  private setCookie(
    name: string,
    value: string,
    days?: number | null,
    minutes?: number
  ) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    let expires = "";
    if (minutes != null) {
      expires = `; max-age=${minutes * 60}`;
    } else if (days != null) {
      expires = `; max-age=${days * 86400}`;
    }
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}${expires}`;
  }
}

export const analytics =
  typeof window !== "undefined" ? new AnalyticsClient() : null;

export function useAnalytics() {
  return analytics;
}
