import {
  LABELS_DOCUMENTS,
  TYPES_DOCUMENTS,
  type TypeDocument,
} from "@/lib/constants/types-documents";

export const CORRESPONDANCE_TYPES = TYPES_DOCUMENTS.correspondance
  .items as readonly TypeDocument[];

export type CorrespondanceType = (typeof CORRESPONDANCE_TYPES)[number];

export function isCorrespondanceType(
  typeDocument: string
): typeDocument is CorrespondanceType {
  return (CORRESPONDANCE_TYPES as readonly string[]).includes(typeDocument);
}

export const CORRESPONDANCE_TEMPLATES: {
  type: CorrespondanceType;
  description: string;
}[] = [
  {
    type: "lettre_officielle",
    description:
      "Courrier formel au client, à la juridiction ou à un tiers (notification, information).",
  },
  {
    type: "courrier_confraternel",
    description:
      "Échange entre confrères : conseil adverse, huissier, expert ou confrère.",
  },
  {
    type: "note_client",
    description:
      "Note de synthèse, compte rendu écrit ou information transmise au client.",
  },
];

export function correspondanceTypeLabel(type: string): string {
  if (isCorrespondanceType(type)) {
    return LABELS_DOCUMENTS[type];
  }
  return type;
}
