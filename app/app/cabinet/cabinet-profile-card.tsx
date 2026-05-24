import Image from "next/image";
import { Building2, MapPin, Phone, FileText, Hash } from "lucide-react";

import type { CabinetSettingsValues } from "./cabinet-settings-form";

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="flex gap-3 text-sm">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-brand-justice/60"
        aria-hidden
      />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function CabinetProfileCard({
  cabinet,
}: {
  cabinet: CabinetSettingsValues;
}) {
  const location = [cabinet.address, cabinet.city, cabinet.country]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-2xl border border-brand-justice/10 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-justice/10 bg-brand-parchment-dark/30">
          {cabinet.logoUrl ? (
            <Image
              src={cabinet.logoUrl}
              alt=""
              fill
              className="object-contain p-2"
              unoptimized
            />
          ) : (
            <Building2 className="h-9 w-9 text-brand-justice/35" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <Row icon={MapPin} label="Adresse" value={location || null} />
          <Row icon={Phone} label="Téléphone" value={cabinet.phone} />
          <Row
            icon={FileText}
            label="Registre du commerce"
            value={cabinet.registreCommerce}
          />
          <Row icon={Hash} label="NIU" value={cabinet.niu} />
          {!location &&
            !cabinet.phone &&
            !cabinet.registreCommerce &&
            !cabinet.niu && (
              <p className="text-sm text-muted-foreground">
                Le propriétaire du cabinet n&apos;a pas encore renseigné les
                coordonnées officielles.
              </p>
            )}
        </div>
      </div>
    </section>
  );
}
