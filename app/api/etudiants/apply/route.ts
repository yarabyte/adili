import { addMonths } from "date-fns";
import { and, eq } from "drizzle-orm";

import { jsonError, jsonOk } from "@/lib/api/json";
import { getCurrentProfile } from "@/lib/auth/profile";
import { uploadEtudiantJustificatif } from "@/lib/billing/etudiant-storage";
import { db } from "@/lib/db/client";
import { ecolesEtudiant, validationsEtudiants } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getCurrentProfile();
  if (!session) {
    return jsonError("Connectez-vous pour soumettre une demande étudiant.", 401);
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const ecoleId = formData.get("ecole_id");
    const numero = formData.get("numero");
    const emailInst = formData.get("email_inst");
    const justificatif = formData.get("justificatif");

    if (typeof ecoleId !== "string" || !ecoleId) {
      return jsonError("École requise", 400);
    }

    const [ecoleRow] = await db
      .select()
      .from(ecolesEtudiant)
      .where(eq(ecolesEtudiant.id, ecoleId))
      .limit(1);

    if (!ecoleRow?.actif) {
      return jsonError("École non reconnue ou inactive", 400);
    }

    const [pending] = await db
      .select()
      .from(validationsEtudiants)
      .where(
        and(
          eq(validationsEtudiants.userId, session.user.id),
          eq(validationsEtudiants.statut, "en_attente")
        )
      )
      .limit(1);

    if (pending) {
      return jsonError("Une demande est déjà en cours de validation.", 409);
    }

    const expireAt = addMonths(new Date(), 12);
    const [row] = await db
      .insert(validationsEtudiants)
      .values({
        userId: session.user.id,
        ecoleId: ecoleRow.id,
        ecole: ecoleRow.nom,
        numeroEtudiant:
          typeof numero === "string" && numero ? numero : null,
        emailInstitutionnel:
          typeof emailInst === "string" && emailInst ? emailInst : null,
        statut: "en_attente",
        expireAt,
      })
      .returning();

    if (justificatif instanceof File && justificatif.size > 0) {
      try {
        const path = await uploadEtudiantJustificatif(
          session.user.id,
          row.id,
          justificatif
        );
        await db
          .update(validationsEtudiants)
          .set({ justificatifUrl: path, updatedAt: new Date() })
          .where(eq(validationsEtudiants.id, row.id));
      } catch (err) {
        return jsonError(
          err instanceof Error ? err.message : "Échec upload justificatif",
          500
        );
      }
    }

    return jsonOk({
      id: row.id,
      message:
        "Demande enregistrée — validation sous 72 h par notre équipe.",
    });
  }

  return jsonError(
    "Utilisez multipart/form-data avec le justificatif.",
    400
  );
}
