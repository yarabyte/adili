import { cache } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import type {
  AppShellData,
  RecentAffaireSidebarItem,
} from "@/components/app-shell/app-shell";
import { getRecentAffairesOpened } from "@/lib/affaires/recent-views";
import {
  getCurrentProfile,
  isCabinetOwner,
  type CurrentProfile,
} from "@/lib/auth/profile";
import { getCorpusBreakdownCached } from "@/lib/corpus/stats";
import { labelTitreProfessionnel } from "@/lib/constants/titres-professionnels";
import { db } from "@/lib/db/client";
import { cabinets } from "@/lib/db/schema";
import { formatMemberDisplayName } from "@/lib/users/display-name";

function initialsFromName(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    const out = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
    if (out) return out;
  }
  if (email) return (email[0] ?? "?").toUpperCase();
  return "?";
}

async function getCabinetRow(cabinetId: string) {
  try {
    const [row] = await db
      .select({ name: cabinets.name, ownerId: cabinets.ownerId })
      .from(cabinets)
      .where(eq(cabinets.id, cabinetId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

async function buildAppShellDataImpl(
  session: CurrentProfile
): Promise<AppShellData | null> {
  const cabinetId = session.profile?.cabinetId;
  if (!cabinetId) return null;

  const fullName =
    session.profile?.fullName ||
    (session.user.user_metadata?.full_name as string | undefined) ||
    null;
  const email = session.user.email ?? "";
  const titre = session.profile?.titre ?? null;
  const displayName = formatMemberDisplayName(
    fullName,
    email || null,
    titre
  );
  const titreLabel = labelTitreProfessionnel(titre);
  const initials = initialsFromName(fullName, email);

  const [cabinet, stats, recentAffaires] = await Promise.all([
    getCabinetRow(cabinetId),
    getCorpusBreakdownCached(),
    getRecentAffairesOpened(session, 3),
  ]);

  const isOwner = cabinet ? isCabinetOwner(session, cabinet) : false;

  const recentAffairesSidebar: RecentAffaireSidebarItem[] = recentAffaires.map(
    (a) => ({
      id: a.id,
      reference: a.reference,
      intitule: a.intitule,
    })
  );

  return {
    initials,
    displayName,
    email,
    titreLabel,
    cabinetName: cabinet?.name ?? null,
    isCabinetOwner: isOwner,
    sources: stats.total.sources,
    chunks: stats.total.chunks,
    recentAffaires: recentAffairesSidebar,
  };
}

const buildAppShellDataCached = cache(async (userId: string) => {
  const session = await getCurrentProfile();
  if (!session || session.user.id !== userId) return null;
  return buildAppShellDataImpl(session);
});

/**
 * Construit les données du shell. Dédupliqué par requête (layout + page d'accueil).
 */
export async function buildAppShellData(
  session: CurrentProfile
): Promise<AppShellData | null> {
  return buildAppShellDataCached(session.user.id);
}

/**
 * Variante stricte pour les routes privées (`/app/**`) : redirige vers
 * `/connexion` ou `/onboarding/cabinet` selon le cas.
 */
export async function requireAppShellData(): Promise<AppShellData> {
  const session = await getCurrentProfile();
  if (!session) redirect("/connexion");
  if (!session.profile?.cabinetId) redirect("/onboarding/cabinet");

  const data = await buildAppShellData(session);
  if (!data) redirect("/onboarding/cabinet");
  return data;
}
