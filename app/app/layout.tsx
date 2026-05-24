import { headers } from "next/headers";

import { AppShell } from "@/components/app-shell/app-shell";
import { StudentShell } from "@/components/app-shell/student-shell";
import { requireAppAccess } from "@/lib/auth/app-access";
import { formatMemberDisplayName } from "@/lib/users/display-name";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = headers().get("x-pathname") ?? "";
  const access = await requireAppAccess(pathname);

  if (access.mode === "student") {
    const displayName = formatMemberDisplayName(
      access.session.profile?.fullName,
      access.session.user.email,
      access.session.profile?.titre
    );
    if (pathname === "/app/en-attente") {
      return children;
    }
    return (
      <StudentShell
        displayName={displayName}
        email={access.session.user.email ?? ""}
      >
        {children}
      </StudentShell>
    );
  }

  return <AppShell data={access.shell}>{children}</AppShell>;
}
