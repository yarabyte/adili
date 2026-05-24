import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { cabinets, users } from "@/lib/db/schema";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ResolveBetaCabinetFailure =
  | { code: "no_account"; email: string }
  | { code: "no_cabinet"; email: string }
  | {
      code: "cabinet_email_mismatch";
      email: string;
      cabinetId: string;
      cabinetName: string | null;
      ownerEmail: string | null;
    };

export type ResolveBetaCabinetResult =
  | { ok: true; cabinetId: string }
  | { ok: false; failure: ResolveBetaCabinetFailure };

/**
 * Rattache une candidature beta à un cabinet uniquement si l'email du compte
 * Adili correspond à celui de la candidature (évite d'attribuer le cabinet d'un tiers).
 */
export async function resolveBetaCabinetForCandidature(
  candidatureEmail: string,
  explicitCabinetId?: string
): Promise<ResolveBetaCabinetResult> {
  const email = normalizeEmail(candidatureEmail);

  const [account] = await db
    .select({
      cabinetId: users.cabinetId,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  if (!account) {
    return { ok: false, failure: { code: "no_account", email } };
  }

  const cabinetId = explicitCabinetId ?? account.cabinetId ?? undefined;
  if (!cabinetId) {
    return { ok: false, failure: { code: "no_cabinet", email } };
  }

  if (account.cabinetId !== cabinetId) {
    const [cabinet] = await db
      .select({
        name: cabinets.name,
        ownerEmail: users.email,
      })
      .from(cabinets)
      .innerJoin(users, eq(users.id, cabinets.ownerId))
      .where(eq(cabinets.id, cabinetId))
      .limit(1);

    return {
      ok: false,
      failure: {
        code: "cabinet_email_mismatch",
        email,
        cabinetId,
        cabinetName: cabinet?.name ?? null,
        ownerEmail: cabinet?.ownerEmail ?? null,
      },
    };
  }

  return { ok: true, cabinetId };
}

export function resolveBetaCabinetErrorMessage(
  failure: ResolveBetaCabinetFailure
): string {
  switch (failure.code) {
    case "no_account":
      return `Aucun compte Adili pour ${failure.email}. Un email d'instructions est en cours d'envoi au candidat.`;
    case "no_cabinet":
      return `Le compte ${failure.email} existe mais n'a pas encore de cabinet configuré. Un email d'instructions est en cours d'envoi.`;
    case "cabinet_email_mismatch": {
      const hint = failure.ownerEmail
        ? ` (propriétaire du cabinet : ${failure.ownerEmail})`
        : "";
      const name = failure.cabinetName ? ` « ${failure.cabinetName} »` : "";
      return `L'email ${failure.email} n'est pas rattaché au cabinet${name}${hint}. Vérifiez l'ID cabinet ou demandez au candidat de finaliser son inscription avec le même email que la candidature.`;
    }
  }
}
