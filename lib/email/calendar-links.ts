/** Lien « Ajouter à Google Agenda » (compatible la plupart des clients mail). */
export function googleCalendarEventUrl(opts: {
  title: string;
  start: Date;
  /** Durée par défaut : 1 h (audience, dépôt, etc.). */
  durationMinutes?: number;
  details?: string;
  location?: string;
}): string {
  const durationMs = (opts.durationMinutes ?? 60) * 60_000;
  const end = new Date(opts.start.getTime() + durationMs);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(end)}`,
  });
  if (opts.details) params.set("details", opts.details);
  if (opts.location) params.set("location", opts.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
