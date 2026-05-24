import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EmailConfirmedBanner } from "@/components/onboarding/email-confirmed-banner";
import { getCurrentProfile } from "@/lib/auth/profile";
import { syncUserFromAuthMetadata } from "@/lib/onboarding/sync-user";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile) {
    await syncUserFromAuthMetadata(session.user);
  }
  return (
    <>
      <Suspense fallback={null}>
        <div className="mx-auto w-full max-w-lg px-4 pt-6">
          <EmailConfirmedBanner />
        </div>
      </Suspense>
      {children}
    </>
  );
}
