export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount) + " FCFA";
}

export function formatQuotaLabel(consomme: number, total: number): string {
  return `${consomme}/${total}`;
}
