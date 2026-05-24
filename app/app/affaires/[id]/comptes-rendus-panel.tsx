import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaires, comptesRendus, users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getEffectiveRole } from "@/lib/permissions/affaires";
import { canViewCompteRenduDetail } from "@/lib/permissions/comptes-rendus";
import type { StatutCompteRendu } from "@/lib/constants/statuts-compte-rendu";
import type { CompteRenduListItem } from "@/lib/comptes-rendus/types";
import { formatMemberDisplayName } from "@/lib/users/display-name";

import { ComptesRendusPanelClient } from "./comptes-rendus-panel-client";

export async function ComptesRendusPanel({
  affaireId,
  canCreate,
}: {
  affaireId: string;
  canCreate: boolean;
}) {
  const session = await getCurrentProfile();
  const ctx = session ? await getEffectiveRole(session, affaireId) : null;

  const [affaireMeta] = await db
    .select({ responsableId: affaires.responsableId })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);

  const rows = await db
    .select({
      id: comptesRendus.id,
      typeCr: comptesRendus.typeCr,
      titre: comptesRendus.titre,
      dateEvenement: comptesRendus.dateEvenement,
      dureeMinutes: comptesRendus.dureeMinutes,
      statut: comptesRendus.statut,
      confidentialite: comptesRendus.confidentialite,
      auteurId: comptesRendus.auteurId,
      auteurName: users.fullName,
      auteurEmail: users.email,
      auteurTitre: users.titre,
    })
    .from(comptesRendus)
    .leftJoin(users, eq(users.id, comptesRendus.auteurId))
    .where(eq(comptesRendus.affaireId, affaireId))
    .orderBy(desc(comptesRendus.dateEvenement));

  const list: CompteRenduListItem[] = rows.map((r) => {
    const canViewDetail =
      session && affaireMeta
        ? canViewCompteRenduDetail({
            confidentialite: r.confidentialite,
            auteurId: r.auteurId,
            affaireResponsableId: affaireMeta.responsableId,
            userId: session.user.id,
            role: ctx?.role ?? null,
          })
        : false;

    return {
      id: r.id,
      typeCr: r.typeCr,
      titre: r.titre,
      dateEvenement: r.dateEvenement.toISOString(),
      dureeMinutes: r.dureeMinutes,
      statut: r.statut as StatutCompteRendu,
      confidentialite: r.confidentialite,
      auteurId: r.auteurId,
      auteurLabel: r.auteurName
        ? formatMemberDisplayName(
            r.auteurName,
            r.auteurEmail,
            r.auteurTitre
          )
        : r.auteurEmail || "—",
      canViewDetail,
    };
  });

  return (
    <ComptesRendusPanelClient
      affaireId={affaireId}
      comptesRendus={list}
      canCreate={canCreate}
      currentUserId={session?.user.id ?? ""}
    />
  );
}
