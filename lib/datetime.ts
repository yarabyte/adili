/** Normalise une valeur Postgres / JSON en `Date` (évite `getTime is not a function`). */
export function toDate(
  value: Date | string | number | null | undefined
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
