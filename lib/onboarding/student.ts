import { cache } from "react";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { validationsEtudiants } from "@/lib/db/schema";

async function fetchLatestStudentValidation(userId: string) {
  const [row] = await db
    .select()
    .from(validationsEtudiants)
    .where(eq(validationsEtudiants.userId, userId))
    .orderBy(desc(validationsEtudiants.createdAt))
    .limit(1);
  return row ?? null;
}

/** Une requête par rendu serveur (layout + page + resolve). */
export const getLatestStudentValidation = cache(fetchLatestStudentValidation);

export function isStudentValidationActive(
  v: { statut: string; expireAt: Date } | null
): boolean {
  if (!v || v.statut !== "validee") return false;
  return v.expireAt > new Date();
}
