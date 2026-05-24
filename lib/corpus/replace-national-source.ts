import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { sources } from "@/lib/db/schema";

/** Supprime la source nationale existante pour ce code (chunks en cascade). */
export async function replaceNationalSource(code: string) {
  const shortCode = code.toUpperCase();
  const deleted = await db
    .delete(sources)
    .where(
      and(eq(sources.type, "national"), eq(sources.shortCode, shortCode))
    )
    .returning({ id: sources.id });

  if (deleted.length > 0) {
    console.log(
      `   ↻ Source existante ${shortCode} supprimée (${deleted.length})`
    );
  }
}
