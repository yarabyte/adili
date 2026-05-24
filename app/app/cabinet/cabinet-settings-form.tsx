"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Building2, ImageIcon, Loader2, Trash2 } from "lucide-react";

import {
  removeCabinetLogo,
  updateCabinetProfile,
  uploadCabinetLogo,
  type CabinetProfileFormState,
} from "@/app/actions/cabinet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CabinetProfileFormState = {};

export type CabinetSettingsValues = {
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  phone: string | null;
  registreCommerce: string | null;
  niu: string | null;
  logoUrl: string | null;
};

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {label}
    </Button>
  );
}

export function CabinetSettingsForm({
  cabinet,
}: {
  cabinet: CabinetSettingsValues;
}) {
  const [profileState, profileAction] = useFormState(
    updateCabinetProfile,
    initialState
  );
  const [logoState, logoAction] = useFormState(uploadCabinetLogo, initialState);
  const [removeState, setRemoveState] = useState<CabinetProfileFormState>({});
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const feedback =
    profileState.message ||
    profileState.error ||
    logoState.message ||
    logoState.error ||
    removeState.message ||
    removeState.error;

  const feedbackIsError = Boolean(
    profileState.error || logoState.error || removeState.error
  );

  async function handleRemoveLogo() {
    setRemoving(true);
    setRemoveState({});
    const result = await removeCabinetLogo();
    setRemoveState(result);
    setRemoving(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-brand-justice/15 bg-brand-parchment-dark/40 shadow-sm">
            {cabinet.logoUrl ? (
              <Image
                src={cabinet.logoUrl}
                alt={`Logo ${cabinet.name}`}
                fill
                className="object-contain p-2"
                unoptimized
              />
            ) : (
              <Building2
                className="h-10 w-10 text-brand-justice/35"
                aria-hidden
              />
            )}
          </div>
          <form action={logoAction} className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              id="cabinet-logo-input"
              onChange={(e) => {
                const form = e.target.form;
                if (form && e.target.files?.[0]) form.requestSubmit();
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-brand-justice/20"
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" aria-hidden />
              {cabinet.logoUrl ? "Changer le logo" : "Ajouter un logo"}
            </Button>
            {cabinet.logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={removing}
                onClick={() => void handleRemoveLogo()}
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden />
                )}
                Supprimer
              </Button>
            )}
          </form>
          <p className="max-w-[200px] text-center text-[11px] text-muted-foreground sm:text-left">
            PNG, JPEG ou WebP — 2 Mo max. Affiché sur les PDF et l&apos;en-tête
            du cabinet.
          </p>
        </div>

        <form action={profileAction} className="min-w-0 flex-1 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cabinet-name">Nom du cabinet</Label>
              <Input
                id="cabinet-name"
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={cabinet.name}
                className="h-11"
              />
              {profileState.fieldErrors?.name && (
                <p className="text-xs text-destructive">
                  {profileState.fieldErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cabinet-address">Adresse</Label>
              <Input
                id="cabinet-address"
                name="address"
                maxLength={300}
                defaultValue={cabinet.address ?? ""}
                placeholder="Immeuble X, BP 1234, Yaoundé"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cabinet-city">Ville</Label>
              <Input
                id="cabinet-city"
                name="city"
                maxLength={80}
                defaultValue={cabinet.city ?? ""}
                placeholder="Yaoundé"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cabinet-country">Pays</Label>
              <Input
                id="cabinet-country"
                name="country"
                value={cabinet.country ?? "Cameroun"}
                readOnly
                tabIndex={-1}
                className="h-11 cursor-not-allowed bg-muted/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cabinet-phone">Téléphone</Label>
              <Input
                id="cabinet-phone"
                name="phone"
                type="tel"
                maxLength={40}
                defaultValue={cabinet.phone ?? ""}
                placeholder="+237 6 12 34 56 78"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cabinet-rc">Registre du commerce</Label>
              <Input
                id="cabinet-rc"
                name="registreCommerce"
                maxLength={80}
                defaultValue={cabinet.registreCommerce ?? ""}
                placeholder="RC/YAO/2024/B/12345"
                className="h-11"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cabinet-niu">NIU</Label>
              <Input
                id="cabinet-niu"
                name="niu"
                maxLength={40}
                defaultValue={cabinet.niu ?? ""}
                placeholder="Numéro d'identification unique"
                className="h-11 max-w-md"
              />
              <p className="text-[11px] text-muted-foreground">
                Numéro d&apos;identification unique (fiscal), si applicable.
              </p>
            </div>
          </div>

          {feedback && (
            <p
              role="alert"
              className={
                feedbackIsError
                  ? "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  : "rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100"
              }
            >
              {feedback}
            </p>
          )}

          <SaveButton label="Enregistrer les informations" />
        </form>
      </div>
    </div>
  );
}
