import { redirect } from "next/navigation";

import type { AppShellData } from "@/components/app-shell/app-shell";
import {
  getCurrentProfile,
  type CurrentProfile,
} from "@/lib/auth/profile";
import { buildAppShellData } from "@/lib/auth/shell";
import { getIntendedPlan } from "@/lib/onboarding/intended-plan";
import { resolvePostAuthPath } from "@/lib/onboarding/resolve";
import {
  getLatestStudentValidation,
  isStudentValidationActive,
} from "@/lib/onboarding/student";

export type StudentAppAccess = {
  mode: "student";
  session: CurrentProfile;
  validation: Awaited<ReturnType<typeof getLatestStudentValidation>>;
  canUseApp: boolean;
};

export type CabinetAppAccess = {
  mode: "cabinet";
  session: CurrentProfile;
  shell: AppShellData;
};

export type AppAccess = StudentAppAccess | CabinetAppAccess;

/**
 * Garde d'accès `/app/**` : redirige vers la bonne étape d'onboarding.
 */
export async function requireAppAccess(
  pathname?: string
): Promise<AppAccess> {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");

  const intended = getIntendedPlan(session);
  const postAuthPath = await resolvePostAuthPath(session);

  if (pathname && !pathname.startsWith(postAuthPath) && postAuthPath !== "/app") {
    if (
      postAuthPath.startsWith("/onboarding") ||
      postAuthPath === "/app/en-attente"
    ) {
      redirect(postAuthPath);
    }
  }

  if (intended === "etudiant") {
    const validation = await getLatestStudentValidation(session.user.id);
    const canUseApp = isStudentValidationActive(validation);

    if (!validation && pathname !== "/onboarding/etudiant") {
      redirect("/onboarding/etudiant");
    }
    if (validation?.statut === "en_attente" && pathname !== "/app/en-attente") {
      redirect("/app/en-attente");
    }
    if (
      validation &&
      (validation.statut === "rejetee" ||
        (!canUseApp && validation.statut === "validee"))
    ) {
      if (!pathname?.startsWith("/onboarding/etudiant")) {
        redirect(
          validation.statut === "rejetee"
            ? "/onboarding/etudiant?rejet=1"
            : "/onboarding/etudiant?renouvel=1"
        );
      }
    }

    if (
      pathname?.startsWith("/app/affaires") ||
      pathname?.startsWith("/app/cabinet")
    ) {
      redirect("/app");
    }

    return {
      mode: "student",
      session,
      validation,
      canUseApp: Boolean(canUseApp),
    };
  }

  if (!session.profile?.cabinetId) {
    redirect(postAuthPath);
  }

  const shell = await buildAppShellData(session);
  if (!shell) redirect("/onboarding/cabinet");

  if (
    postAuthPath.startsWith("/onboarding") ||
    postAuthPath === "/onboarding/profil"
  ) {
    if (pathname !== postAuthPath && !pathname?.startsWith(postAuthPath)) {
      redirect(postAuthPath);
    }
  }

  return { mode: "cabinet", session, shell };
}
