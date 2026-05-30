"use client";

import useSWR from "swr";

import { adminAnalyticsFetcher } from "@/lib/admin/analytics/fetcher";

type EventRow = {
  id: number;
  eventName: string;
  eventCategory: string;
  path: string | null;
  country: string | null;
  city: string | null;
  createdAt: string | Date;
};

export default function AnalyticsEventsPage() {
  const { data } = useSWR<{ events: EventRow[] }>(
    "/api/admin/analytics/events/list?limit=100",
    adminAnalyticsFetcher,
    { refreshInterval: 30_000 }
  );

  return (
    <div className="overflow-hidden rounded-xl border border-brand-justice/10 bg-card">
      <div className="border-b border-brand-justice/10 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-brand-justice">
          Flux d&apos;événements
        </h2>
      </div>
      <div className="max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Heure</th>
              <th className="px-4 py-2">Événement</th>
              <th className="px-4 py-2">Catégorie</th>
              <th className="px-4 py-2">Page</th>
              <th className="px-4 py-2">Lieu</th>
            </tr>
          </thead>
          <tbody>
            {data?.events?.map((e) => (
              <tr key={e.id} className="border-t border-brand-justice/5">
                <td className="px-4 py-2 tabular-nums text-muted-foreground">
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Douala",
                  }).format(new Date(e.createdAt))}
                </td>
                <td className="px-4 py-2 font-medium">{e.eventName}</td>
                <td className="px-4 py-2">{e.eventCategory}</td>
                <td className="px-4 py-2 font-mono text-xs">{e.path ?? "—"}</td>
                <td className="px-4 py-2">
                  {[e.city, e.country].filter(Boolean).join(", ") || "—"}
                </td>
              </tr>
            ))}
            {!data?.events?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun événement pour le moment. La collecte démarre dès la première visite.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
