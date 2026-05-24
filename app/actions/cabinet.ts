"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getCurrentProfile, isCabinetOwner } from "@/lib/auth/profile";
import {
  BUCKET,
  cabinetLogoObjectPath,
  validateCabinetLogoFile,
} from "@/lib/cabinet/logo-storage";
import { db } from "@/lib/db/client";
import { cabinets } from "@/lib/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cabinetProfileSchema } from "@/lib/validation/cabinet";

export type CabinetProfileFormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

async function requireCabinetOwner() {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return { error: "Session expirée ou cabinet manquant." as const, ctx: null };
  }

  const [cabinet] = await db
    .select()
    .from(cabinets)
    .where(eq(cabinets.id, session.profile.cabinetId))
    .limit(1);

  if (!cabinet) {
    return { error: "Cabinet introuvable." as const, ctx: null };
  }

  if (!isCabinetOwner(session, cabinet)) {
    return {
      error:
        "Seul le propriétaire du cabinet peut modifier ces informations.",
      ctx: null,
    };
  }

  return { error: null, ctx: { session, cabinet } };
}

export async function updateCabinetProfile(
  _prev: CabinetProfileFormState,
  formData: FormData
): Promise<CabinetProfileFormState> {
  const gate = await requireCabinetOwner();
  if (gate.error || !gate.ctx) return { error: gate.error ?? "Accès refusé." };

  const { cabinet } = gate.ctx;

  const parsed = cabinetProfileSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city") ?? "",
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    registreCommerce: formData.get("registreCommerce") ?? "",
    niu: formData.get("niu") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return {
      error: "Corrigez les champs signalés.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  await db
    .update(cabinets)
    .set({
      name: data.name,
      city: data.city || null,
      address: data.address || null,
      phone: data.phone || null,
      registreCommerce: data.registreCommerce || null,
      niu: data.niu || null,
      updatedAt: new Date(),
    })
    .where(eq(cabinets.id, cabinet.id));

  revalidatePath("/app/cabinet");
  revalidatePath("/app", "layout");

  return { message: "Informations du cabinet enregistrées." };
}

export async function uploadCabinetLogo(
  _prev: CabinetProfileFormState,
  formData: FormData
): Promise<CabinetProfileFormState> {
  const gate = await requireCabinetOwner();
  if (gate.error || !gate.ctx) return { error: gate.error ?? "Accès refusé." };

  const { cabinet } = gate.ctx;
  const file = formData.get("logo");

  if (!(file instanceof File)) {
    return { error: "Sélectionnez une image." };
  }

  const validationError = validateCabinetLogoFile(file);
  if (validationError) return { error: validationError };

  const objectPath = cabinetLogoObjectPath(cabinet.id, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createSupabaseAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[cabinet] logo upload", uploadError);
    return {
      error:
        "Impossible d'enregistrer le logo. Vérifiez que le bucket « cabinet-logos » existe sur Supabase.",
    };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(objectPath);

  const logoUrl = `${publicUrl}?v=${Date.now()}`;

  await db
    .update(cabinets)
    .set({ logoUrl, updatedAt: new Date() })
    .where(eq(cabinets.id, cabinet.id));

  revalidatePath("/app/cabinet");
  revalidatePath("/app", "layout");

  return { message: "Logo mis à jour." };
}

export async function removeCabinetLogo(): Promise<CabinetProfileFormState> {
  const gate = await requireCabinetOwner();
  if (gate.error || !gate.ctx) return { error: gate.error ?? "Accès refusé." };

  const { cabinet } = gate.ctx;

  if (cabinet.logoUrl) {
    const admin = createSupabaseAdminClient();
    const prefix = `${cabinet.id}/`;
    const { data: objects } = await admin.storage.from(BUCKET).list(cabinet.id);
    if (objects?.length) {
      const paths = objects
        .map((o) => `${prefix}${o.name}`)
        .filter((p) => p.includes("logo."));
      if (paths.length) {
        await admin.storage.from(BUCKET).remove(paths);
      }
    }
  }

  await db
    .update(cabinets)
    .set({ logoUrl: null, updatedAt: new Date() })
    .where(eq(cabinets.id, cabinet.id));

  revalidatePath("/app/cabinet");
  revalidatePath("/app", "layout");

  return { message: "Logo supprimé." };
}
