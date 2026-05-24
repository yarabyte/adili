import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaires, cabinets, comptesRendus, users } from "@/lib/db/schema";
import { LABELS_CR } from "@/lib/constants/types-comptes-rendus";
import { STATUTS_CR_LABEL } from "@/lib/constants/statuts-compte-rendu";
import { tiptapToHtml } from "@/lib/documents/tiptap/serialize-html";
import type { DecisionAction } from "@/lib/validation/compte-rendu";
import type { Participant } from "@/lib/validation/compte-rendu";
import type { PieceRemise } from "@/lib/validation/compte-rendu";

import { formatMemberDisplayName } from "@/lib/users/display-name";

import type { CompteRenduPrintModel } from "./compte-rendu-print-model";

function formatLongDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(minutes: number | null): string | null {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const QUALITE_LABEL: Record<string, string> = {
  juge: "Juge",
  greffier: "Greffier",
  avocat: "Avocat",
  client: "Client",
  partie_adverse: "Partie adverse",
  temoin: "Témoin",
  expert: "Expert",
  huissier: "Huissier",
  notaire: "Notaire",
  mediateur: "Médiateur",
  arbitre: "Arbitre",
  collaborateur_cabinet: "Collaborateur cabinet",
  autre: "Autre",
};

const PARTIE_LABEL: Record<string, string> = {
  demandeur: "demandeur",
  defendeur: "défendeur",
  intervenant: "intervenant",
  neutre: "neutre",
};

function labelQualite(q: string): string {
  return QUALITE_LABEL[q] ?? q.replace(/_/g, " ");
}

function labelPartie(p: string): string {
  return PARTIE_LABEL[p] ?? p.replace(/_/g, " ");
}

function participantsHtml(rows: Participant[]): string {
  if (!rows.length) return "<p>—</p>";
  const lines = rows
    .filter((p) => p.nom?.trim())
    .map((p) => {
      const meta = [
        labelQualite(p.qualite),
        p.partie ? labelPartie(p.partie) : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return `<li>
        <span class="print-cr__participant-name">${escape(p.nom.trim())}</span>
        <span class="print-cr__participant-meta"> — ${escape(meta)}</span>
      </li>`;
    });
  return lines.length ? `<ul>${lines.join("")}</ul>` : "<p>—</p>";
}

function decisionsHtml(rows: DecisionAction[]): string {
  if (!rows.length) return "<p>—</p>";
  const out = rows.map((r) => {
    const tagClass =
      r.type === "decision"
        ? "print-cr__action-tag print-cr__action-tag--decision"
        : "print-cr__action-tag print-cr__action-tag--action";
    const tag = r.type === "decision" ? "Décision" : "Action";
    const done = r.fait
      ? ` <span class="print-cr__action-done">(réalisé)</span>`
      : "";
    const dl = r.deadline
      ? `<span class="print-cr__action-deadline">Échéance : ${escape(formatLongDate(r.deadline))}</span>`
      : "";
    return `<li>
      <span class="${tagClass}">${escape(tag)}</span>${done}
      <span> — ${escape(r.texte)}</span>
      ${dl}
    </li>`;
  });
  return `<ul>${out.join("")}</ul>`;
}

function piecesHtml(rows: PieceRemise[]): string {
  if (!rows.length) return "<p>—</p>";
  const sens: Record<string, string> = { recue: "Reçue", remise: "Remise" };
  const out = rows.map((p) => {
    const ref = [p.partie ? escape(labelPartie(p.partie)) : null, p.numero ? escape(p.numero) : null]
      .filter(Boolean)
      .join(" · ");
    const refBlock = ref ? ` <span class="print-cr__participant-meta">(${ref})</span>` : "";
    return `<li>
      <span class="print-cr__piece-sens">${escape(sens[p.sens] ?? p.sens)}</span>
      — ${escape(p.nom)}${refBlock}
    </li>`;
  });
  return `<ul>${out.join("")}</ul>`;
}

export async function loadCompteRenduPrintData(
  compteRenduId: string,
  affaireId: string
): Promise<CompteRenduPrintModel | null> {
  const [cr] = await db
    .select()
    .from(comptesRendus)
    .where(eq(comptesRendus.id, compteRenduId))
    .limit(1);
  if (!cr || cr.affaireId !== affaireId) return null;

  const [affaireRow] = await db
    .select({
      reference: affaires.reference,
      intitule: affaires.intitule,
      cabinetId: affaires.cabinetId,
    })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);
  if (!affaireRow) return null;

  const [cabinet] = await db
    .select({
      name: cabinets.name,
      city: cabinets.city,
      logoUrl: cabinets.logoUrl,
      phone: cabinets.phone,
      address: cabinets.address,
      registreCommerce: cabinets.registreCommerce,
      niu: cabinets.niu,
    })
    .from(cabinets)
    .where(eq(cabinets.id, affaireRow.cabinetId))
    .limit(1);

  const [author] = await db
    .select({
      fullName: users.fullName,
      email: users.email,
      titre: users.titre,
    })
    .from(users)
    .where(eq(users.id, cr.auteurId))
    .limit(1);

  const [validator] = cr.validateurId
    ? await db
        .select({
          fullName: users.fullName,
          email: users.email,
          titre: users.titre,
        })
        .from(users)
        .where(eq(users.id, cr.validateurId))
        .limit(1)
    : [undefined];

  const typeLabel =
    LABELS_CR[cr.typeCr as keyof typeof LABELS_CR] ?? cr.typeCr;
  const statutLabel =
    STATUTS_CR_LABEL[cr.statut as keyof typeof STATUTS_CR_LABEL] ?? cr.statut;

  const bodyHtml = tiptapToHtml(cr.corpsTiptap);
  const isEmpty = bodyHtml.trim().length === 0;

  const participants = (cr.participants ?? []) as Participant[];
  const decisions = (cr.decisionsActions ?? []) as DecisionAction[];
  const pieces = (cr.piecesRemises ?? []) as PieceRemise[];

  const authorName = author
    ? formatMemberDisplayName(author.fullName, author.email, author.titre)
    : null;
  const validatorName = validator
    ? formatMemberDisplayName(
        validator.fullName,
        validator.email,
        validator.titre
      )
    : null;
  const exportDate = formatLongDate(new Date());
  const validatedDate = cr.valideAt ? formatLongDate(cr.valideAt) : null;
  const signatureCity = cabinet?.city?.trim() || "—";

  return {
    compteRendu: {
      titre: cr.titre,
      typeLabel,
      statutLabel,
      statut: cr.statut,
      dateEvenementLabel: formatLongDate(cr.dateEvenement),
      dureeLabel: formatDuration(cr.dureeMinutes),
      lieu: cr.lieu,
      participantsHtml: participantsHtml(participants),
      decisionsActionsHtml: decisionsHtml(decisions),
      piecesHtml: piecesHtml(pieces),
      confidentialite: cr.confidentialite,
    },
    affaire: {
      reference: affaireRow.reference,
      intitule: affaireRow.intitule,
    },
    cabinet: {
      name: cabinet?.name ?? "Cabinet Adili",
      city: signatureCity,
      logoUrl: cabinet?.logoUrl ?? null,
      phone: cabinet?.phone ?? null,
      address: cabinet?.address ?? null,
      registreCommerce: cabinet?.registreCommerce ?? null,
      niu: cabinet?.niu ?? null,
    },
    authorName,
    validatorName,
    validatedDate,
    exportDate,
    signatureCity,
    bodyHtml,
    isEmpty,
  };
}
