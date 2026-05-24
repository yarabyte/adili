import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  candidaturesBeta,
  leadsGrandCabinet,
  paiements,
  validationsEtudiants,
} from "@/lib/db/schema";

export type AdminNavCounts = {
  virements: number;
  beta: number;
  etudiants: number;
  leadsGc: number;
  paiements: number;
};

/** Compteurs pour badges de navigation (files en attente). */
export async function getAdminNavCounts(): Promise<AdminNavCounts> {
  const [beta, etudiants, leadsGc, pendingPayments] = await Promise.all([
    db
      .select({ n: count() })
      .from(candidaturesBeta)
      .where(eq(candidaturesBeta.statut, "en_revue")),
    db
      .select({ n: count() })
      .from(validationsEtudiants)
      .where(eq(validationsEtudiants.statut, "en_attente")),
    db
      .select({ n: count() })
      .from(leadsGrandCabinet)
      .where(eq(leadsGrandCabinet.statut, "nouveau")),
    db
      .select({ methode: paiements.methode })
      .from(paiements)
      .where(eq(paiements.statut, "en_attente")),
  ]);

  const virements = pendingPayments.filter((p) => p.methode === "virement").length;

  return {
    virements,
    beta: beta[0]?.n ?? 0,
    etudiants: etudiants[0]?.n ?? 0,
    leadsGc: leadsGc[0]?.n ?? 0,
    paiements: pendingPayments.length,
  };
}
