export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d";

export type PeriodRange = {
  from: Date;
  to: Date;
  label: string;
};

export function parsePeriod(value: string | null | undefined): AnalyticsPeriod {
  if (value === "24h" || value === "7d" || value === "30d" || value === "90d") {
    return value;
  }
  return "7d";
}

export function getPeriodRange(period: AnalyticsPeriod, now = new Date()): PeriodRange {
  const to = now;
  const from = new Date(now);

  switch (period) {
    case "24h":
      from.setHours(from.getHours() - 24);
      return { from, to, label: "Dernières 24h" };
    case "7d":
      from.setDate(from.getDate() - 7);
      return { from, to, label: "7 derniers jours" };
    case "30d":
      from.setDate(from.getDate() - 30);
      return { from, to, label: "30 derniers jours" };
    case "90d":
      from.setDate(from.getDate() - 90);
      return { from, to, label: "90 derniers jours" };
  }
}

export function getPreviousPeriodRange(
  period: AnalyticsPeriod,
  now = new Date()
): PeriodRange {
  const current = getPeriodRange(period, now);
  const durationMs = current.to.getTime() - current.from.getTime();
  const to = new Date(current.from.getTime());
  const from = new Date(current.from.getTime() - durationMs);
  return { from, to, label: `Période précédente (${current.label})` };
}

export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

export function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "Africa/Douala",
  }).format(date);
}
