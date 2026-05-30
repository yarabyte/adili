"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import { adminAnalyticsFetcher } from "@/lib/admin/analytics/fetcher";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type OnlineUser = {
  sessionId: string;
  nom: string | null;
  email: string | null;
  path: string;
  city: string | null;
  country: string | null;
  lastSeen: string;
};

type EventRow = {
  id: number;
  eventName: string;
  path: string | null;
  createdAt: string | Date;
};

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  return `il y a ${Math.floor(mins / 60)} h`;
}

export default function AnalyticsOnlinePage() {
  const [recentEvents, setRecentEvents] = useState<EventRow[]>([]);

  const { data, mutate } = useSWR<{ users: OnlineUser[]; count: number }>(
    "/api/admin/analytics/users/online-now",
    adminAnalyticsFetcher,
    { refreshInterval: 30_000 }
  );

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("analytics-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_events" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setRecentEvents((prev) =>
            [
              {
                id: Number(row.id),
                eventName: String(row.event_name ?? ""),
                path: (row.path as string | null) ?? null,
                createdAt: String(row.created_at ?? new Date().toISOString()),
              },
              ...prev,
            ].slice(0, 50)
          );
          void mutate();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mutate]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-brand-justice/10 bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-brand-justice">
            Utilisateurs en ligne
          </h2>
          <span className="rounded-full bg-brand-sage/15 px-2.5 py-0.5 text-xs font-semibold text-brand-sage">
            {data?.count ?? 0}
          </span>
        </div>
        <ul className="space-y-3">
          {data?.users?.map((u) => (
            <li
              key={u.sessionId}
              className="flex items-start gap-3 rounded-lg border border-brand-justice/5 p-3"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-sage" />
              <div className="min-w-0">
                <p className="font-medium text-brand-ink">
                  {u.nom ?? u.email ?? "Visiteur anonyme"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.path}
                  {u.city || u.country
                    ? ` · ${[u.city, u.country].filter(Boolean).join(", ")}`
                    : ""}
                  {" · "}
                  {timeSince(u.lastSeen)}
                </p>
              </div>
            </li>
          ))}
          {!data?.users?.length && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              Personne en ligne dans les 5 dernières minutes.
            </li>
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-brand-justice/10 bg-card p-4">
        <h2 className="mb-4 font-heading text-lg font-semibold text-brand-justice">
          Flux temps réel
        </h2>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {recentEvents.map((e) => (
            <div
              key={e.id}
              className="rounded-lg border border-brand-justice/5 px-3 py-2 text-sm"
            >
              <span className="font-medium">{e.eventName}</span>
              <span className="text-muted-foreground"> · {e.path ?? "—"}</span>
            </div>
          ))}
          {!recentEvents.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              En attente d&apos;événements (WebSocket Supabase Realtime).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
