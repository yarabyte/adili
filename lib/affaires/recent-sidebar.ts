import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { getRecentAffairesOpened } from "@/lib/affaires/recent-views";
import type { CurrentProfile } from "@/lib/auth/profile";
import { LABELS_DOCUMENTS } from "@/lib/constants/types-documents";
import { toDate } from "@/lib/datetime";
import { db } from "@/lib/db/client";
import { comptesRendus, documents } from "@/lib/db/schema";

export const AFFAIRE_DOT_COUNT = 5;

export type RecentAffaireSidebarItem = {
  id: string;
  intitule: string;
  href: string;
  activityType: string;
  activityTime: string;
  /** Index 0…4 — les classes Tailwind sont dans `sidebar.tsx`. */
  dotIndex: number;
};

function dotIndexForAffaire(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h + id.charCodeAt(i)) % AFFAIRE_DOT_COUNT;
  }
  return h;
}

function shortDocumentLabel(type: string): string {
  const full =
    LABELS_DOCUMENTS[type as keyof typeof LABELS_DOCUMENTS] ?? type;
  if (type.startsWith("conclusions")) return "Conclusion";
  if (type.startsWith("memoire")) return "Mémoire";
  if (type.includes("plainte")) return "Plainte";
  if (type.includes("requete")) return "Requête";
  if (type === "note_delibere") return "Note en délibéré";
  return full.length > 28 ? `${full.slice(0, 26)}…` : full;
}

/** Horodatage style maquette sidebar : « modifié il y a 2 h », « hier », « 3 jan. 2026 ». */
export function formatSidebarActivityTime(
  date: Date,
  now: Date = new Date()
): string {
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "modifié à l'instant";
  if (minutes < 60) return `modifié il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `modifié il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

type LatestActivity = {
  at: Date;
  typeLabel: string;
  href: string;
};

export async function getRecentAffairesForSidebar(
  session: CurrentProfile,
  limit = 5
): Promise<RecentAffaireSidebarItem[]> {
  const recent = await getRecentAffairesOpened(session, limit);
  if (recent.length === 0) return [];

  const affaireIds = recent.map((a) => a.id);

  const [docRows, crRows] = await Promise.all([
    db
      .select({
        affaireId: documents.affaireId,
        documentId: documents.id,
        typeDocument: documents.typeDocument,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(inArray(documents.affaireId, affaireIds))
      .orderBy(desc(documents.updatedAt)),
    db
      .select({
        affaireId: comptesRendus.affaireId,
        compteRenduId: comptesRendus.id,
        titre: comptesRendus.titre,
        updatedAt: comptesRendus.updatedAt,
      })
      .from(comptesRendus)
      .where(inArray(comptesRendus.affaireId, affaireIds))
      .orderBy(desc(comptesRendus.updatedAt)),
  ]);

  const latestByAffaire = new Map<string, LatestActivity>();

  for (const d of docRows) {
    if (latestByAffaire.has(d.affaireId)) continue;
    const at = toDate(d.updatedAt);
    if (!at) continue;
    latestByAffaire.set(d.affaireId, {
      at,
      typeLabel: shortDocumentLabel(d.typeDocument),
      href: `/app/affaires/${d.affaireId}/documents/${d.documentId}`,
    });
  }

  for (const cr of crRows) {
    const at = toDate(cr.updatedAt);
    if (!at) continue;
    const existing = latestByAffaire.get(cr.affaireId);
    if (existing && existing.at >= at) continue;
    latestByAffaire.set(cr.affaireId, {
      at,
      typeLabel: "Compte rendu",
      href: `/app/affaires/${cr.affaireId}/comptes-rendus/${cr.compteRenduId}`,
    });
  }

  return recent.map((a) => {
    const activity = latestByAffaire.get(a.id);
    const at = activity?.at ?? a.lastViewedAt;
    return {
      id: a.id,
      intitule: a.intitule,
      href: activity?.href ?? `/app/affaires/${a.id}`,
      activityType: activity?.typeLabel ?? "Dossier",
      activityTime: formatSidebarActivityTime(at),
      dotIndex: dotIndexForAffaire(a.id),
    };
  });
}
