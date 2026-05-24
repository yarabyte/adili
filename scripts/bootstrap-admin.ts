/**
 * Crée le premier super_admin à partir de ADMIN_BOOTSTRAP_EMAIL.
 * Usage : ADMIN_BOOTSTRAP_EMAIL=you@example.com npx tsx scripts/bootstrap-admin.ts
 */
import "./load-env";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { adminUsers, users } from "@/lib/db/schema";

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  if (!email) {
    console.error("Définissez ADMIN_BOOTSTRAP_EMAIL");
    process.exit(1);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.error(`Aucun user public.users pour ${email}`);
    process.exit(1);
  }

  await db
    .insert(adminUsers)
    .values({
      userId: user.id,
      role: "super_admin",
      permissions: [],
      actif: true,
    })
    .onConflictDoUpdate({
      target: adminUsers.userId,
      set: { role: "super_admin", actif: true },
    });

  console.log(`✅ super_admin : ${email} (${user.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
