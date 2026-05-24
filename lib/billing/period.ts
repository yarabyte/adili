const TZ = "Africa/Douala";

/** Période mensuelle calendaire (fuseau Douala). */
export function getCurrentPeriode(now = new Date()): {
  debut: string;
  fin: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const lastDay = new Date(year, month, 0).getDate();

  const debut = `${year}-${String(month).padStart(2, "0")}-01`;
  const fin = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { debut, fin };
}

export function formatPeriodeFinLabel(finIso: string): string {
  const [y, m, d] = finIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
