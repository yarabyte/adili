import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { adminUsers } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";

export async function getCurrentAdmin() {
  const session = await getCurrentProfile();
  if (!session) return null;

  const [row] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, session.user.id))
    .limit(1);

  if (!row?.actif) return null;
  return { ...row, session };
}
