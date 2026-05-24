import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaires, cabinets, clients, users } from "@/lib/db/schema";
import {
  alertesActivesLabels,
  echeanceCountdownLabel,
} from "@/lib/echeances/countdown-label";
import { sendEmail } from "@/lib/email/smtp";
import {
  buildEcheanceCalendarUrl,
  echeanceResponsableEmailHtml,
  echeanceResponsableEmailText,
} from "@/lib/email/templates/echeance-responsable";
import { STATUTS_AFFAIRE_LABEL } from "@/lib/constants/statuts";
import {
  LABELS_CONTENTIEUX,
  type TypeContentieux,
} from "@/lib/constants/types-contentieux";
import { toDate } from "@/lib/datetime";
import { TYPES_ECHEANCE } from "@/lib/validation/echeances";

const TYPE_LABELS: Record<(typeof TYPES_ECHEANCE)[number], string> = {
  audience: "Audience",
  depot: "Dépôt",
  signification: "Signification",
  delai_appel: "Délai d'appel",
  autre: "Autre",
};

function siteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function formatEcheanceDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export type NotifyEcheanceResponsableResult =
  | { sent: true }
  | { sent: false; reason: string };

/**
 * Envoie l'email d'assignation au responsable de l'échéance.
 * Ne lève pas : retourne un statut pour avertir l'UI si SMTP indisponible.
 */
export async function notifyEcheanceResponsable(opts: {
  affaireId: string;
  cabinetId: string;
  responsableUserId: string;
  assignerUserId: string;
  echeanceTitre: string;
  description?: string | null;
  dateEcheance: Date;
  type: (typeof TYPES_ECHEANCE)[number] | null;
  alerteJ7?: boolean;
  alerteJ2?: boolean;
  alerteJ1?: boolean;
  isReassignment?: boolean;
}): Promise<NotifyEcheanceResponsableResult> {
  const [affaire] = await db
    .select({
      reference: affaires.reference,
      intitule: affaires.intitule,
      statut: affaires.statut,
      juridiction: affaires.juridiction,
      typeContentieux: affaires.typeContentieux,
      clientNom: clients.nom,
    })
    .from(affaires)
    .innerJoin(clients, eq(affaires.clientId, clients.id))
    .where(eq(affaires.id, opts.affaireId))
    .limit(1);
  if (!affaire) {
    return { sent: false, reason: "Dossier introuvable." };
  }

  const [cabinet] = await db
    .select({ name: cabinets.name })
    .from(cabinets)
    .where(eq(cabinets.id, opts.cabinetId))
    .limit(1);

  const [responsable] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, opts.responsableUserId))
    .limit(1);
  if (!responsable?.email) {
    return { sent: false, reason: "Adresse email du responsable introuvable." };
  }

  const [assigner] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, opts.assignerUserId))
    .limit(1);

  const responsableName =
    responsable.fullName?.trim() || responsable.email.split("@")[0];
  const assignerName =
    assigner?.fullName?.trim() ||
    assigner?.email?.split("@")[0] ||
    "Un membre du cabinet";

  const typeLabel =
    opts.type && (TYPES_ECHEANCE as readonly string[]).includes(opts.type)
      ? TYPE_LABELS[opts.type]
      : null;

  const dateEcheance =
    toDate(opts.dateEcheance) ?? opts.dateEcheance;
  const dateLabel = formatEcheanceDate(dateEcheance);
  const link = `${siteBaseUrl()}/app/affaires/${opts.affaireId}?tab=echeances`;

  const typeContentieuxLabel =
    affaire.typeContentieux in LABELS_CONTENTIEUX
      ? LABELS_CONTENTIEUX[affaire.typeContentieux as TypeContentieux]
      : null;

  const affaireStatutLabel =
    affaire.statut in STATUTS_AFFAIRE_LABEL
      ? STATUTS_AFFAIRE_LABEL[
          affaire.statut as keyof typeof STATUTS_AFFAIRE_LABEL
        ]
      : null;

  const alertesLabels = alertesActivesLabels({
    alerteJ7: opts.alerteJ7 ?? true,
    alerteJ2: opts.alerteJ2 ?? true,
    alerteJ1: opts.alerteJ1 ?? true,
  });

  const baseParams = {
    responsableName,
    assignerName,
    assignerEmail: assigner?.email ?? null,
    cabinetName: cabinet?.name ?? "Adili",
    affaireReference: affaire.reference,
    affaireIntitule: affaire.intitule,
    affaireStatutLabel,
    clientNom: affaire.clientNom,
    juridiction: affaire.juridiction,
    typeContentieuxLabel,
    echeanceTitre: opts.echeanceTitre,
    description: opts.description ?? null,
    dateLabel,
    countdownLabel: echeanceCountdownLabel(dateEcheance),
    typeLabel,
    alertesLabels,
    link,
    isReassignment: opts.isReassignment,
  };

  const calendarUrl = buildEcheanceCalendarUrl(
    { ...baseParams, link },
    dateEcheance
  );

  const params = { ...baseParams, calendarUrl };

  const subject = opts.isReassignment
    ? `Échéance assignée — ${opts.echeanceTitre} (${affaire.reference})`
    : `Nouvelle échéance — ${opts.echeanceTitre} (${affaire.reference})`;

  try {
    await sendEmail({
      to: responsable.email,
      subject,
      html: echeanceResponsableEmailHtml(params),
      text: echeanceResponsableEmailText(params),
      replyTo: assigner?.email ?? undefined,
    });
    return { sent: true };
  } catch (err) {
    console.error("[echeances] notification responsable échouée :", err);
    const reason = err instanceof Error ? err.message : String(err);
    return { sent: false, reason };
  }
}
