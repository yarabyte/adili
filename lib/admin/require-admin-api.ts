
import { jsonError } from "@/lib/api/json";
import { getCurrentAdmin } from "@/lib/admin/check";
import {
  canAdmin,
  type AdminPermission,
} from "@/lib/admin/permissions";
import { db } from "@/lib/db/client";
import { adminActions } from "@/lib/db/schema";

export type AdminContext = NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;

export async function requireAdminApi(
  permission: AdminPermission,
  req?: Request
): Promise<{ admin: AdminContext } | Response> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return jsonError("Accès admin requis", 403, { code: "admin_required" });
  }

  if (!canAdmin(admin.role, permission)) {
    if (req) {
      await db.insert(adminActions).values({
        adminUserId: admin.id,
        action: `${permission}.denied`,
        cibleType: "system",
        cibleId: admin.id,
        motif: "Tentative non autorisée",
        ipAddress:
          req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      });
    }
    return jsonError("Permission refusée", 403, { code: "permission_denied" });
  }

  return { admin };
}
