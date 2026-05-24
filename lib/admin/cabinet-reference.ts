import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { cabinets, users } from "@/lib/db/schema";

export type AdminCabinetReference = {
  id: string;
  name: string;
  email: string;
  ownerName: string | null;
  city: string | null;
};

/** Cabinets avec email du propriétaire (admin beta / rattachement). */
export async function listCabinetsForAdmin(): Promise<AdminCabinetReference[]> {
  const rows = await db
    .select({
      id: cabinets.id,
      name: cabinets.name,
      email: users.email,
      ownerName: users.fullName,
      city: cabinets.city,
    })
    .from(cabinets)
    .innerJoin(users, eq(users.id, cabinets.ownerId))
    .orderBy(asc(cabinets.name));

  return rows;
}
