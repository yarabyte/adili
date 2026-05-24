import type { CabinetPrintIdentity } from "@/lib/documents/pdf/cabinet-print-identity";

export type CompteRenduPrintModel = {
  compteRendu: {
    titre: string;
    typeLabel: string;
    statutLabel: string;
    statut: string;
    dateEvenementLabel: string;
    dureeLabel: string | null;
    lieu: string | null;
    participantsHtml: string;
    decisionsActionsHtml: string;
    piecesHtml: string;
    confidentialite: "standard" | "sensible";
  };
  affaire: { reference: string; intitule: string };
  cabinet: CabinetPrintIdentity;
  authorName: string | null;
  validatorName: string | null;
  validatedDate: string | null;
  exportDate: string;
  signatureCity: string;
  bodyHtml: string;
  isEmpty: boolean;
};
