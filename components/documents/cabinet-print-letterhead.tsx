import Image from "next/image";

import type { CabinetPrintIdentity } from "@/lib/documents/pdf/cabinet-print-identity";

export function CabinetPrintLetterhead({
  cabinet,
}: {
  cabinet: CabinetPrintIdentity;
}) {
  const location = [cabinet.address?.trim(), cabinet.city?.trim()]
    .filter(Boolean)
    .join(", ");

  const legalParts: string[] = [];
  if (location) legalParts.push(location);
  if (cabinet.phone?.trim()) legalParts.push(`Tél. ${cabinet.phone.trim()}`);
  if (cabinet.registreCommerce?.trim()) {
    legalParts.push(`RC ${cabinet.registreCommerce.trim()}`);
  }
  if (cabinet.niu?.trim()) legalParts.push(`NIU ${cabinet.niu.trim()}`);

  return (
    <>
      {cabinet.logoUrl ? (
        <Image
          src={cabinet.logoUrl}
          alt=""
          width={180}
          height={56}
          className="print-doc__cabinet-logo mb-3 h-auto max-h-14 w-auto max-w-[45mm] object-contain"
          unoptimized
        />
      ) : null}
      <p className="print-doc__cabinet">{cabinet.name}</p>
      {legalParts.length > 0 && (
        <p className="print-doc__cabinet-legal">{legalParts.join(" · ")}</p>
      )}
    </>
  );
}

export function cabinetPrintFooterRight(cabinet: CabinetPrintIdentity): string {
  const bits = [cabinet.name];
  if (cabinet.registreCommerce?.trim()) {
    bits.push(`RC ${cabinet.registreCommerce.trim()}`);
  }
  if (cabinet.niu?.trim()) bits.push(`NIU ${cabinet.niu.trim()}`);
  return `${bits.join(" · ")} · Adili`;
}
