import { and, eq, gte, lt, sql } from "drizzle-orm";

import { formatPeriodeFinLabel } from "@/lib/billing/period";
import { verifyCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db/client";
import { quotasIa, users } from "@/lib/db/schema";
import { quotaWarningEmailHtml } from "@/lib/email/templates/billing/quota-warning";
import { sendEmail } from "@/lib/email/smtp";

export const dynamic = "force-dynamic";

const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function GET(req: Request) {
  const denied = verifyCronSecret(req);
  if (denied) return denied;

  const rows = await db
    .select({
      quota: quotasIa,
      email: users.email,
      fullName: users.fullName,
    })
    .from(quotasIa)
    .innerJoin(users, eq(quotasIa.userId, users.id))
    .where(
      and(
        eq(quotasIa.alerte80Envoyee, false),
        lt(quotasIa.consomme, quotasIa.quotaMensuel),
        gte(
          quotasIa.consomme,
          sql`floor(${quotasIa.quotaMensuel} * 0.8)`
        )
      )
    );

  let sent = 0;
  for (const row of rows) {
    const to = row.email;
    if (!to) continue;
    try {
      await sendEmail({
        to,
        subject: "Adili — 80 % de votre quota IA utilisé",
        html: quotaWarningEmailHtml({
          displayName: row.fullName ?? "Utilisateur",
          consomme: row.quota.consomme,
          quotaMensuel: row.quota.quotaMensuel,
          resetDate: formatPeriodeFinLabel(row.quota.periodeFin),
          billingUrl: `${siteUrl()}/app/billing`,
        }),
      });
      await db
        .update(quotasIa)
        .set({ alerte80Envoyee: true, updatedAt: new Date() })
        .where(eq(quotasIa.id, row.quota.id));
      sent++;
    } catch (err) {
      console.error("[quota-alerts] email failed", to, err);
    }
  }

  return Response.json({ checked: rows.length, sent });
}
