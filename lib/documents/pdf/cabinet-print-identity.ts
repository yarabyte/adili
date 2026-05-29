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

/** Logo + nom du cabinet (sans adresse / tél. / NIU sur l'en-tête). */
export function buildCabinetLetterheadHtml(
  cabinet: CabinetPrintIdentity,
  escape: (s: string) => string
): string {
  const logo = cabinet.logoUrl
    ? `<img src="${escape(cabinet.logoUrl)}" alt="" class="print-doc__cabinet-logo" />`
    : "";

  return `${logo}
      <p class="print-doc__cabinet">${escape(cabinet.name)}</p>`;
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
