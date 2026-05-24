/** Libellé relatif pour une échéance (email, notifications). */
export function echeanceCountdownLabel(
  dateEcheance: Date,
  now: Date = new Date()
): string {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round(
    (startOfDay(dateEcheance).getTime() - startOfDay(now).getTime()) /
      86_400_000
  );

  if (diff < 0) return "Date dépassée";
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff <= 14) return `Dans ${diff} jours`;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateEcheance);
}

export function alertesActivesLabels(opts: {
  alerteJ7: boolean;
  alerteJ2: boolean;
  alerteJ1: boolean;
}): string[] {
  const out: string[] = [];
  if (opts.alerteJ7) out.push("J-7");
  if (opts.alerteJ2) out.push("J-2");
  if (opts.alerteJ1) out.push("J-1");
  return out;
}
