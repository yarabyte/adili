import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { comptesRendusVersions } from "@/lib/db/schema";

export type CompteRenduVersionTrigger =
  | "soumission"
  | "validation"
  | "finalisation"
  | "rejet"
  | "manuel";

export async function createCompteRenduVersionSnapshot(opts: {
  compteRenduId: string;
  trigger: CompteRenduVersionTrigger;
  userId: string;
  corpsTiptap: unknown;
  corpsText: string | null;
  formulaireSnapshot?: Record<string, unknown> | null;
}): Promise<void> {
  const [last] = await db
    .select({
      next: sql<number>`coalesce(max(${comptesRendusVersions.versionNum}), 0)::int + 1`,
    })
    .from(comptesRendusVersions)
    .where(eq(comptesRendusVersions.compteRenduId, opts.compteRenduId));

  const nextNum = Number(last?.next ?? 1);

  await db
    .insert(comptesRendusVersions)
    .values({
      compteRenduId: opts.compteRenduId,
      corpsTiptap: opts.corpsTiptap as object,
      corpsText: opts.corpsText ?? null,
      formulaireSnapshot: opts.formulaireSnapshot ?? null,
      versionNum: nextNum,
      trigger: opts.trigger,
      createdBy: opts.userId,
    })
    .onConflictDoNothing({
      target: [
        comptesRendusVersions.compteRenduId,
        comptesRendusVersions.versionNum,
      ],
    });
}
