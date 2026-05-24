import { redirect } from "next/navigation";

import { Banner } from "@/components/ui/banner";
import { CabinetDashboard } from "@/components/dashboard/cabinet-dashboard";
import { StudentHome } from "@/components/dashboard/student-home";
import { getRecentActivity } from "@/lib/activity";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getCabinetDashboard } from "@/lib/dashboard/get-cabinet-dashboard";
import { getCorpusBreakdownCached } from "@/lib/corpus/stats";
import { buildAppShellData } from "@/lib/auth/shell";
import { getIntendedPlan } from "@/lib/onboarding/intended-plan";
import {
  getLatestStudentValidation,
  isStudentValidationActive,
} from "@/lib/onboarding/student";

export const dynamic = "force-dynamic";

const WELCOME_MESSAGES: Record<string, { title: string; description: string }> =
  {
    "cabinet-created": {
      title: "Cabinet créé",
      description:
        "Votre espace de travail est prêt. Consultez vos dossiers ou lancez une recherche.",
    },
    "invitation-accepted": {
      title: "Invitation acceptée",
      description: "Vous avez rejoint le cabinet. Bonne exploration !",
    },
    "trial-started": {
      title: "Essai gratuit activé",
      description:
        "30 jours d'accès complet — aucune carte requise. Bonne exploration !",
    },
  };

export default async function AppHome({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");

  const welcome = searchParams.welcome
    ? WELCOME_MESSAGES[searchParams.welcome]
    : undefined;

  const corpus = await getCorpusBreakdownCached();

  if (getIntendedPlan(session) === "etudiant") {
    const validation = await getLatestStudentValidation(session.user.id);
    if (!isStudentValidationActive(validation)) {
      redirect("/app/en-attente");
    }
    const displayName =
      session.profile?.fullName ??
      session.user.email?.split("@")[0] ??
      "Étudiant";
    return (
      <div className="space-y-6">
        {welcome && (
          <Banner title={welcome.title} description={welcome.description} />
        )}
        <StudentHome displayName={displayName} corpus={corpus} />
      </div>
    );
  }

  const [activity, dashboard, shell] = await Promise.all([
    session.user.id ? getRecentActivity(session.user.id, 8) : Promise.resolve([]),
    getCabinetDashboard(session),
    buildAppShellData(session),
  ]);

  if (!dashboard) redirect("/onboarding/cabinet");

  const displayName =
    shell?.displayName ??
    session.profile?.fullName ??
    session.user.email?.split("@")[0] ??
    "Utilisateur";

  return (
    <div className="space-y-6">
      {welcome && (
        <Banner title={welcome.title} description={welcome.description} />
      )}

      <CabinetDashboard
        displayName={displayName}
        cabinetName={shell?.cabinetName ?? null}
        dashboard={dashboard}
        corpus={corpus}
        activity={activity}
      />
    </div>
  );
}
