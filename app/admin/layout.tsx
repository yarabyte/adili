import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentAdmin } from "@/lib/admin/check";
import { getAdminNavCounts } from "@/lib/admin/nav-counts";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/connexion?redirect=/admin");

  const counts = await getAdminNavCounts();
  const email = admin.session.user.email ?? "Admin";

  return (
    <AdminShell counts={counts} role={admin.role} email={email}>
      {children}
    </AdminShell>
  );
}
