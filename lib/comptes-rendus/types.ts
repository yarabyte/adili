import type { StatutCompteRendu } from "@/lib/constants/statuts-compte-rendu";
import type {
  DecisionAction,
  Participant,
  PieceRemise,
} from "@/lib/validation/compte-rendu";

export type CompteRenduListItem = {
  id: string;
  typeCr: string;
  titre: string;
  dateEvenement: string;
  dureeMinutes: number | null;
  statut: StatutCompteRendu;
  confidentialite: "standard" | "sensible";
  auteurId: string;
  auteurLabel: string;
  /** false = liste seule (titre + date), pas de lien détail */
  canViewDetail: boolean;
};

export type CompteRenduFormData = {
  typeCr: string;
  titre: string;
  dateEvenement: string;
  dureeMinutes: number | null;
  lieu: string;
  participants: Participant[];
  decisionsActions: DecisionAction[];
  piecesRemises: PieceRemise[];
  soumisValidation: boolean;
  confidentialite: "standard" | "sensible";
};

export type AdversaireAffaire = {
  nom: string;
  qualite?: string | null;
};
