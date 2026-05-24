import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/lib/admin/check";
import { canAdmin, type AdminPermission } from "@/lib/admin/permissions";

export async function requireAdminPage(permission?: AdminPermission) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/connexion?redirect=/admin");
  if (permission && !canAdmin(admin.role, permission)) {
    redirect("/admin?erreur=permission");
  }
  return admin;
}
