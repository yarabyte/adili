
import { db } from "@/lib/db/client";
import { adminActions, type adminUsers } from "@/lib/db/schema";

type AdminRow = typeof adminUsers.$inferSelect;

type AuditableAdminAction<T> = {
  admin: AdminRow;
  action: string;
  cibleType: string;
  cibleId: string;
  motif: string;
  request?: Request;
  impactFinancierFcfa?: number;
  exec: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  ) => Promise<{
    result: T;
    etatAvant?: unknown;
    etatApres?: unknown;
  }>;
};

export async function executeAdminAction<T>(
  params: AuditableAdminAction<T>
): Promise<T> {
  const adminId = params.admin.id;
  return db.transaction(async (tx) => {
    const { result, etatAvant, etatApres } = await params.exec(tx);

    await tx.insert(adminActions).values({
      adminUserId: adminId,
      action: params.action,
      cibleType: params.cibleType,
      cibleId: params.cibleId,
      etatAvant: etatAvant ?? null,
      etatApres: etatApres ?? null,
      motif: params.motif,
      ipAddress:
        params.request?.headers.get("x-forwarded-for") ??
        params.request?.headers.get("x-real-ip"),
      userAgent: params.request?.headers.get("user-agent"),
      impactFinancierFcfa: params.impactFinancierFcfa ?? null,
    });

    return result;
  });
}
