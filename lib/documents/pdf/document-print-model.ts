import type { CabinetPrintIdentity } from "./cabinet-print-identity";

export type DocumentPrintModel = {
  document: {
    id: string;
    titre: string;
    typeLabel: string;
    statutLabel: string;
    statut: string;
  };
  affaire: {
    reference: string;
    intitule: string;
  };
  cabinet: CabinetPrintIdentity;
  authorName: string | null;
  validatorName: string | null;
  exportDate: string;
  validatedDate: string | null;
  signatureCity: string;
  bodyHtml: string;
  isEmpty: boolean;
  watermarkText: string | null;
  isDraftLike: boolean;
  isFinal: boolean;
};
