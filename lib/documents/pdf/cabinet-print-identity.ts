/** Identité cabinet telle qu'affichée sur les exports PDF / impression. */
export type CabinetPrintIdentity = {
  name: string;
  city: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  registreCommerce: string | null;
  niu: string | null;
};

export function cabinetLegalLineHtml(
  cabinet: CabinetPrintIdentity,
  escape: (s: string) => string
): string | null {
  const parts: string[] = [];
  const location = [cabinet.address?.trim(), cabinet.city?.trim()]
    .filter(Boolean)
    .join(", ");
  if (location) parts.push(escape(location));
  if (cabinet.phone?.trim()) {
    parts.push(`Tél. ${escape(cabinet.phone.trim())}`);
  }
  if (cabinet.registreCommerce?.trim()) {
    parts.push(`RC ${escape(cabinet.registreCommerce.trim())}`);
  }
  if (cabinet.niu?.trim()) {
    parts.push(`NIU ${escape(cabinet.niu.trim())}`);
  }
  if (!parts.length) return null;
  return parts.join(" · ");
}

/** Logo + nom + ligne légale (adresse, tél., RC, NIU). */
export function buildCabinetLetterheadHtml(
  cabinet: CabinetPrintIdentity,
  escape: (s: string) => string
): string {
  const legal = cabinetLegalLineHtml(cabinet, escape);
  const logo = cabinet.logoUrl
    ? `<img src="${escape(cabinet.logoUrl)}" alt="" class="print-doc__cabinet-logo" />`
    : "";

  return `${logo}
      <p class="print-doc__cabinet">${escape(cabinet.name)}</p>
      ${legal ? `<p class="print-doc__cabinet-legal">${legal}</p>` : ""}`;
}

/** Pied de page : nom + immatriculation si renseignée. */
export function buildCabinetFooterRightHtml(
  cabinet: CabinetPrintIdentity,
  escape: (s: string) => string
): string {
  const bits = [escape(cabinet.name)];
  if (cabinet.registreCommerce?.trim()) {
    bits.push(`RC ${escape(cabinet.registreCommerce.trim())}`);
  }
  if (cabinet.niu?.trim()) {
    bits.push(`NIU ${escape(cabinet.niu.trim())}`);
  }
  return `${bits.join(" · ")} · Adili`;
}
