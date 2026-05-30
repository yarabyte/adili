import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  bigint,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ═══════════════════ ENUMS ═══════════════════
export const roleEnum = pgEnum('role', ['admin', 'avocat', 'collaborateur']);
export const sourceTypeEnum = pgEnum('source_type', ['acte_uniforme', 'ccja', 'national']);

// ═══════════════════ ENUMS — MODULE AFFAIRES ═══════════════════
export const typeContentieuxEnum = pgEnum('type_contentieux', [
  'commercial', 'societes', 'suretes', 'recouvrement',
  'procedures_collectives', 'arbitrage', 'penal_affaires',
  'social', 'fiscal', 'bail_commercial', 'transport',
  'propriete_intellectuelle', 'autre',
]);
export const typeClientEnum = pgEnum('type_client', ['personne_physique', 'personne_morale']);
export const confidentialiteEnum = pgEnum('confidentialite', ['standard', 'sensible']);
export const statutAffaireEnum = pgEnum('statut_affaire', [
  'ouvert', 'en_cours', 'en_delibere', 'clos', 'archive',
]);
export const statutDocumentEnum = pgEnum('statut_document', [
  'brouillon', 'en_revue', 'valide', 'rejete', 'archive',
]);
export const roleAffaireEnum = pgEnum('role_affaire', [
  'responsable', 'contributeur', 'lecteur',
]);
export const typeEcheanceEnum = pgEnum('type_echeance', [
  'audience', 'depot', 'signification', 'delai_appel', 'autre',
]);
export const statutEcheanceEnum = pgEnum('statut_echeance', [
  'a_venir', 'passee', 'annulee',
]);
export const statutCompteRenduEnum = pgEnum('statut_compte_rendu', [
  'brouillon', 'finalise', 'en_revue', 'valide', 'rejete',
]);
export const triggerVersionEnum = pgEnum('trigger_version', [
  'soumission', 'validation', 'rejet', 'manuel',
]);
export const citationModeEnum = pgEnum('citation_mode', ['inline', 'block']);

// ═══════════════════ CABINETS (workspaces) ═══════════════════
export const cabinets = pgTable('cabinets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  ownerId: uuid('owner_id').notNull(),
  city: text('city'),
  country: text('country'),
  logoUrl: text('logo_url'),
  address: text('address'),
  phone: text('phone'),
  registreCommerce: text('registre_commerce'),
  niu: text('niu'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════ USERS ═══════════════════
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),  // Lié à auth.users de Supabase
  email: text('email').unique().notNull(),
  fullName: text('full_name'),
  phone: text('phone'),                                  // ex. "+221 77 123 45 67"
  titre: text('titre'),                                  // avocat, huissier, juriste…
  cabinetId: uuid('cabinet_id').references(() => cabinets.id),
  intendedPlan: text('intended_plan'),                   // etudiant | individuel | cabinet
  role: roleEnum('role').default('avocat').notNull(),
  barreau: text('barreau'),                              // ex. "Barreau de Dakar"
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════ INVITATIONS ═══════════════════
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id).notNull(),
  email: text('email').notNull(),
  role: roleEnum('role').default('avocat').notNull(),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════ CORPUS JURIDIQUE ═══════════════════
// Sources = un Acte Uniforme entier ou un arrêt CCJA
export const sources = pgTable('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: sourceTypeEnum('type').notNull(),
  title: text('title').notNull(),                          // "Acte Uniforme sur le Droit Commercial Général"
  shortCode: text('short_code').notNull(),                 // "AUDCG"
  reference: text('reference'),                            // "Révisé 15/12/2010"
  publishedAt: timestamp('published_at'),
  metadata: jsonb('metadata'),                             // { country, court, etc }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Chunks = portions indexées pour la recherche
export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'cascade' }).notNull(),
  articleNumber: text('article_number'),                   // "134"
  articleLabel: text('article_label'),                     // "Art. 134 AUDCG"
  chapter: text('chapter'),
  content: text('content').notNull(),                      // Le texte brut
  contentTokens: integer('content_tokens'),
  embedding: vector('embedding', { dimensions: 1024 }),    // voyage-law-2 = 1024 dims
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  embeddingIdx: index('chunks_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  articleIdx: index('chunks_article_idx').on(t.sourceId, t.articleNumber),
}));

// (Les tables `documents` et `templates` "legacy" ont été remplacées par le
// module Affaires — voir plus bas dans ce fichier. La migration
// 0007_module_affaires.sql se charge du DROP CASCADE des anciennes tables.)

// ═══════════════════ LEDGER APPELS IA ═══════════════════
// Sert à la fois de rate-limit (count par user / heure) et de log léger.
export const aiCalls = pgTable('ai_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),                          // FK → auth.users (côté SQL)
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'set null' }),
  action: text('action').notNull(),                           // ex. 'synthesize'
  query: text('query'),
  status: text('status').notNull().default('pending'),        // pending | ok | error | rate_limited
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  latencyMs: integer('latency_ms'),
  meta: jsonb('meta'),
  feature: text('feature'),
  model: text('model'),
  costFcfaEstime: numeric('cost_fcfa_estime', { precision: 10, scale: 2 }),
  quotaVia: text('quota_via'),
  packId: uuid('pack_id'),
  depassementGratuit: boolean('depassement_gratuit').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => ({
  userActionRecentIdx: index('ai_calls_user_action_created_idx').on(t.userId, t.action, t.createdAt),
}));

// ═══════════════════ FACTURATION & QUOTAS IA ═══════════════════
export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  nom: text('nom').notNull(),
  description: text('description'),
  prixMensuelFcfa: integer('prix_mensuel_fcfa').notNull().default(0),
  prixAnnuelFcfa: integer('prix_annuel_fcfa').notNull().default(0),
  typeFacturation: text('type_facturation').notNull(),
  maxUsers: integer('max_users'),
  quotaIaParUser: integer('quota_ia_par_user').notNull(),
  stockageGo: integer('stockage_go'),
  modulesInclus: jsonb('modules_inclus').notNull(),
  features: jsonb('features'),
  modesPaiement: jsonb('modes_paiement').notNull(),
  isActive: boolean('is_active').default(true),
  ordreAffichage: integer('ordre_affichage'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id'),                               // abonnement étudiant sans cabinet
  planId: text('plan_id').references(() => plans.id).notNull(),
  statut: text('statut').notNull(),
  cycle: text('cycle').notNull(),
  dateDebut: timestamp('date_debut', { withTimezone: true }).notNull(),
  dateFin: timestamp('date_fin', { withTimezone: true }).notNull(),
  dateRenouvellement: timestamp('date_renouvellement', { withTimezone: true }),
  autoRenouvellement: boolean('auto_renouvellement').default(true),
  estBeta: boolean('est_beta').default(false),
  dateFinBeta: timestamp('date_fin_beta', { withTimezone: true }),
  estEssai: boolean('est_essai').default(false),
  dateFinEssai: timestamp('date_fin_essai', { withTimezone: true }),
  prixNegocieFcfa: integer('prix_negocie_fcfa'),
  nbUsersNegocies: integer('nb_users_negocies'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const quotasIa = pgTable('quotas_ia', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'cascade' }),
  periodeDebut: date('periode_debut').notNull(),
  periodeFin: date('periode_fin').notNull(),
  quotaMensuel: integer('quota_mensuel').notNull(),
  consomme: integer('consomme').notNull().default(0),
  depassementGratuitUtilise: boolean('depassement_gratuit_utilise').default(false),
  packsActifs: jsonb('packs_actifs').default([]),
  alerte80Envoyee: boolean('alerte_80_envoyee').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('quotas_ia_user_periode_uniq').on(t.userId, t.periodeDebut),
}));

export const packsAdditionnels = pgTable('packs_additionnels', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'set null' }),
  typePack: text('type_pack').notNull().default('requetes_ia_100'),
  prixFcfa: integer('prix_fcfa').notNull().default(5000),
  quantite: integer('quantite').notNull().default(100),
  consomme: integer('consomme').notNull().default(0),
  dateAchat: timestamp('date_achat', { withTimezone: true }).defaultNow().notNull(),
  dateExpiration: timestamp('date_expiration', { withTimezone: true }).notNull(),
  paiementId: uuid('paiement_id'),
  statut: text('statut').notNull().default('actif'),
});

export const paiements = pgTable('paiements', {
  id: uuid('id').primaryKey().defaultRandom(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'set null' }),
  userId: uuid('user_id'),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  packId: uuid('pack_id'),
  montantFcfa: integer('montant_fcfa').notNull(),
  monnaie: text('monnaie').notNull().default('XAF'),
  methode: text('methode').notNull(),
  statut: text('statut').notNull(),
  cinetpayTransactionId: text('cinetpay_transaction_id'),
  cinetpayPaymentToken: text('cinetpay_payment_token'),
  cinetpayPaymentUrl: text('cinetpay_payment_url'),
  referenceVirement: text('reference_virement'),
  factureProformaUrl: text('facture_proforma_url'),
  preuveVirementUrl: text('preuve_virement_url'),
  dateVirementConstate: date('date_virement_constate'),
  validePar: uuid('valide_par'),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  role: text('role').notNull(),
  permissions: jsonb('permissions').default([]),
  creePar: uuid('cree_par'),
  actif: boolean('actif').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminActions = pgTable('admin_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: uuid('admin_user_id').references(() => adminUsers.id).notNull(),
  action: text('action').notNull(),
  cibleType: text('cible_type').notNull(),
  cibleId: uuid('cible_id').notNull(),
  etatAvant: jsonb('etat_avant'),
  etatApres: jsonb('etat_apres'),
  motif: text('motif').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  impactFinancierFcfa: integer('impact_financier_fcfa'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ecolesEtudiant = pgTable('ecoles_etudiant', {
  id: uuid('id').primaryKey().defaultRandom(),
  nom: text('nom').notNull(),
  ville: text('ville'),
  actif: boolean('actif').notNull().default(true),
  ordreAffichage: integer('ordre_affichage').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const leadsGrandCabinet = pgTable('leads_grand_cabinet', {
  id: uuid('id').primaryKey().defaultRandom(),
  nomCabinet: text('nom_cabinet').notNull(),
  ville: text('ville').notNull(),
  nombreAvocats: integer('nombre_avocats').notNull(),
  telephone: text('telephone').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  statut: text('statut').notNull().default('nouveau'),
  traitePar: uuid('traite_par'),
  notesInternes: text('notes_internes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const validationsEtudiants = pgTable('validations_etudiants', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  ecoleId: uuid('ecole_id').references(() => ecolesEtudiant.id, { onDelete: 'set null' }),
  ecole: text('ecole').notNull(),
  numeroEtudiant: text('numero_etudiant'),
  emailInstitutionnel: text('email_institutionnel'),
  justificatifUrl: text('justificatif_url'),
  statut: text('statut').notNull().default('en_attente'),
  valideePar: uuid('validee_par'),
  motifRejet: text('motif_rejet'),
  expireAt: timestamp('expire_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const candidaturesBeta = pgTable('candidatures_beta', {
  id: uuid('id').primaryKey().defaultRandom(),
  nom: text('nom').notNull(),
  email: text('email').notNull(),
  telephone: text('telephone'),
  barreau: text('barreau'),
  anneesExperience: integer('annees_experience'),
  typePratique: text('type_pratique'),
  dossiersActifs: integer('dossiers_actifs'),
  motivation: text('motivation').notNull(),
  statut: text('statut').notNull().default('en_revue'),
  userIdCree: uuid('user_id_cree'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const factures = pgTable('factures', {
  id: uuid('id').primaryKey().defaultRandom(),
  numero: text('numero').notNull().unique(),
  type: text('type').notNull(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'set null' }),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  paiementId: uuid('paiement_id').references(() => paiements.id, { onDelete: 'set null' }),
  montantHtFcfa: integer('montant_ht_fcfa').notNull(),
  tvaPourcent: numeric('tva_pourcent', { precision: 5, scale: 2 }),
  montantTtcFcfa: integer('montant_ttc_fcfa').notNull(),
  periodeDebut: date('periode_debut'),
  periodeFin: date('periode_fin'),
  lignes: jsonb('lignes').notNull().default([]),
  pdfUrl: text('pdf_url'),
  dateEmission: date('date_emission'),
  dateEcheance: date('date_echeance'),
  datePaiement: date('date_paiement'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ═══════════════════ HISTORIQUE RECHERCHES ═══════════════════
export const searches = pgTable('searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  // Référence un document du module Affaires (FK ajoutée en SQL pour éviter
  // les forward references TS — voir 0007_module_affaires.sql).
  documentId: uuid('document_id'),
  query: text('query').notNull(),
  resultsCount: integer('results_count'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ═══════════════════ NOTATION RÉSULTATS (BETA FEEDBACK) ═══════════════════
// Permet aux praticiens d'évaluer la pertinence d'un extrait pour une requête
// donnée (1 = hors-sujet ; 5 = parfaitement pertinent). Sert à entraîner le
// ranking et à mesurer la qualité perçue.
export const searchRatings = pgTable('search_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),                                          // FK auth.users (côté SQL)
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'set null' }),
  chunkId: uuid('chunk_id').references(() => chunks.id, { onDelete: 'cascade' }).notNull(),
  query: text('query').notNull(),
  rating: integer('rating').notNull(),                                        // 1..5
  comment: text('comment'),
  metadata: jsonb('metadata'),                                                // { relevancePercent, position, ... }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('search_ratings_uniq').on(t.userId, t.chunkId, t.query),
  chunkIdx: index('search_ratings_chunk_idx').on(t.chunkId),
  queryIdx: index('search_ratings_query_idx').on(t.query),
  createdIdx: index('search_ratings_created_idx').on(t.createdAt),
}));

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════ MODULE AFFAIRES (dossiers) ═════════════════════
// ═══════════════════════════════════════════════════════════════════

// ─── Clients (un client par affaire au MVP) ────────────────────────
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'cascade' }).notNull(),
  nom: text('nom').notNull(),
  type: typeClientEnum('type'),
  // { email, tel, adresse, rccm, nif, ... }
  contact: jsonb('contact'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index('clients_cabinet_idx').on(t.cabinetId),
  nomIdx: index('clients_nom_idx').on(t.cabinetId, t.nom),
}));

// ─── Affaires ──────────────────────────────────────────────────────
export const affaires = pgTable('affaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'cascade' }).notNull(),
  // Référence cabinet — ex. "2026-087" — unique par cabinet (cf. unique idx).
  reference: text('reference').notNull(),
  intitule: text('intitule').notNull(),
  typeContentieux: typeContentieuxEnum('type_contentieux').notNull(),
  juridiction: text('juridiction'),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'restrict' }).notNull(),
  // [{ nom, qualite, conseil }]
  adversaires: jsonb('adversaires').default(sql`'[]'::jsonb`).notNull(),
  dateOuverture: date('date_ouverture').defaultNow().notNull(),
  statut: statutAffaireEnum('statut').default('ouvert').notNull(),
  confidentialite: confidentialiteEnum('confidentialite').default('standard').notNull(),
  responsableId: uuid('responsable_id').references(() => users.id).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  cabinetRefUniq: uniqueIndex('affaires_cabinet_reference_uniq').on(t.cabinetId, t.reference),
  cabinetIdx: index('affaires_cabinet_idx').on(t.cabinetId),
  statutIdx: index('affaires_cabinet_statut_idx').on(t.cabinetId, t.statut),
  clientIdx: index('affaires_client_idx').on(t.clientId),
  responsableIdx: index('affaires_responsable_idx').on(t.responsableId),
}));

// ─── Affaire ↔ Utilisateurs (qui travaille dessus) ─────────────────
export const affaireMembres = pgTable('affaire_membres', {
  id: uuid('id').primaryKey().defaultRandom(),
  affaireId: uuid('affaire_id').references(() => affaires.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: roleAffaireEnum('role').notNull(),
  addedBy: uuid('added_by').references(() => users.id),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('affaire_membres_uniq').on(t.affaireId, t.userId),
  affaireIdx: index('affaire_membres_affaire_idx').on(t.affaireId),
  userIdx: index('affaire_membres_user_idx').on(t.userId),
}));

// ─── Documents (pièces rédigées dans l'affaire) ────────────────────
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  affaireId: uuid('affaire_id').references(() => affaires.id, { onDelete: 'cascade' }).notNull(),
  // Clé snake_case du catalogue OHADA — cf. lib/constants/types-documents.ts.
  // Pour rester souple (extensions, libellés FR/EN/PT), on garde du TEXT
  // plutôt qu'un pg_enum à 40+ valeurs.
  typeDocument: text('type_document').notNull(),
  titre: text('titre').notNull(),
  // Document TipTap (JSON ProseMirror)
  contenuTiptap: jsonb('contenu_tiptap').notNull(),
  // Plain text dérivé pour la recherche full-text.
  contenuText: text('contenu_text'),
  statut: statutDocumentEnum('statut').default('brouillon').notNull(),
  // Verrou collaboratif (1 rédacteur à la fois). NULL = libre.
  verrouUserId: uuid('verrou_user_id').references(() => users.id, { onDelete: 'set null' }),
  verrouAcquisAt: timestamp('verrou_acquis_at', { withTimezone: true }),
  auteurId: uuid('auteur_id').references(() => users.id).notNull(),
  validateurId: uuid('validateur_id').references(() => users.id, { onDelete: 'set null' }),
  valideAt: timestamp('valide_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  affaireIdx: index('documents_affaire_idx').on(t.affaireId),
  statutIdx: index('documents_affaire_statut_idx').on(t.affaireId, t.statut),
  verrouIdx: index('documents_verrou_idx').on(t.verrouUserId),
  auteurIdx: index('documents_auteur_idx').on(t.auteurId),
}));

// ─── Versions de documents (snapshots aux événements clés) ─────────
export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  contenuTiptap: jsonb('contenu_tiptap').notNull(),
  contenuText: text('contenu_text'),
  versionNum: integer('version_num').notNull(),
  trigger: triggerVersionEnum('trigger').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('document_versions_uniq').on(t.documentId, t.versionNum),
  documentIdx: index('document_versions_document_idx').on(t.documentId, t.createdAt),
}));

// ─── Comptes rendus (événements rapportés dans l'affaire) ──────────
export const comptesRendus = pgTable('comptes_rendus', {
  id: uuid('id').primaryKey().defaultRandom(),
  affaireId: uuid('affaire_id').references(() => affaires.id, { onDelete: 'cascade' }).notNull(),
  typeCr: text('type_cr').notNull(),
  titre: text('titre').notNull(),
  dateEvenement: timestamp('date_evenement', { withTimezone: true }).notNull(),
  dureeMinutes: integer('duree_minutes'),
  lieu: text('lieu'),
  participants: jsonb('participants').default(sql`'[]'::jsonb`).notNull(),
  corpsTiptap: jsonb('corps_tiptap').notNull(),
  corpsText: text('corps_text'),
  decisionsActions: jsonb('decisions_actions').default(sql`'[]'::jsonb`).notNull(),
  piecesRemises: jsonb('pieces_remises').default(sql`'[]'::jsonb`).notNull(),
  statut: statutCompteRenduEnum('statut').default('brouillon').notNull(),
  soumisValidation: boolean('soumis_validation').default(false).notNull(),
  confidentialite: confidentialiteEnum('confidentialite').default('standard').notNull(),
  genereIa: boolean('genere_ia').default(false).notNull(),
  iaTokensUtilises: integer('ia_tokens_utilises'),
  auteurId: uuid('auteur_id').references(() => users.id).notNull(),
  validateurId: uuid('validateur_id').references(() => users.id, { onDelete: 'set null' }),
  valideAt: timestamp('valide_at', { withTimezone: true }),
  verrouUserId: uuid('verrou_user_id').references(() => users.id, { onDelete: 'set null' }),
  verrouAcquisAt: timestamp('verrou_acquis_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  affaireDateIdx: index('comptes_rendus_affaire_date_idx').on(t.affaireId, t.dateEvenement),
  auteurCreatedIdx: index('comptes_rendus_auteur_created_idx').on(t.auteurId, t.createdAt),
  affaireStatutIdx: index('comptes_rendus_affaire_statut_idx').on(t.affaireId, t.statut),
  verrouIdx: index('comptes_rendus_verrou_idx').on(t.verrouUserId),
}));

export const comptesRendusVersions = pgTable('comptes_rendus_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  compteRenduId: uuid('compte_rendu_id').references(() => comptesRendus.id, { onDelete: 'cascade' }).notNull(),
  corpsTiptap: jsonb('corps_tiptap').notNull(),
  corpsText: text('corps_text'),
  formulaireSnapshot: jsonb('formulaire_snapshot'),
  versionNum: integer('version_num').notNull(),
  trigger: text('trigger').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('comptes_rendus_versions_uniq').on(t.compteRenduId, t.versionNum),
  crIdx: index('comptes_rendus_versions_cr_idx').on(t.compteRenduId, t.createdAt),
}));

// ─── Commentaires en marge (threading + ancres TipTap) ─────────────
export const commentaires = pgTable('commentaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  compteRenduId: uuid('compte_rendu_id').references(() => comptesRendus.id, { onDelete: 'cascade' }),
  auteurId: uuid('auteur_id').references(() => users.id).notNull(),
  contenu: text('contenu').notNull(),
  // { from, to, text } — position TipTap (ProseMirror)
  ancre: jsonb('ancre'),
  parentId: uuid('parent_id').references((): AnyPgColumn => commentaires.id, { onDelete: 'cascade' }),
  resolu: boolean('resolu').default(false).notNull(),
  resoluBy: uuid('resolu_by').references(() => users.id, { onDelete: 'set null' }),
  resoluAt: timestamp('resolu_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  documentIdx: index('commentaires_document_idx').on(t.documentId, t.createdAt),
  compteRenduIdx: index('commentaires_compte_rendu_idx').on(t.compteRenduId, t.createdAt),
  parentIdx: index('commentaires_parent_idx').on(t.parentId),
  resoluIdx: index('commentaires_document_resolu_idx').on(t.documentId, t.resolu),
}));

// ─── Citations du corpus (re-extraites depuis le JSON TipTap) ──────
//
// Représentation des références au corpus juridique (chunks) à
// l'intérieur d'un document rédigé. Reconstituée à chaque sauvegarde
// par `lib/documents/citations.ts#syncDocumentCitations` à partir du
// JSON TipTap.
//
// Contrat JSON côté TipTap (cf. extensions à créer au point 5) :
//
//   // Inline (mark sur un span de texte)
//   {
//     type: "text", text: "Art. 134 AUDCG",
//     marks: [{
//       type: "citation",
//       attrs: { chunkId, sourceShortCode, articleNumber, articleLabel }
//     }]
//   }
//
//   // Bloc (node structurel reprenant le texte d'article)
//   {
//     type: "citationBlock",
//     attrs: { chunkId, sourceShortCode, articleNumber, articleLabel },
//     content: [{ type: "text", text: "..." }]
//   }
//
// La FK `chunk_id` est en SET NULL : si un chunk disparaît (ré-indexation),
// la citation devient « orpheline » mais reste visible dans le document
// grâce aux snapshots (sourceShortCode, articleNumber, articleLabel).
export const documentCitations = pgTable('document_citations', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  chunkId: uuid('chunk_id').references(() => chunks.id, { onDelete: 'set null' }),
  // Snapshots issus du chunk au moment de l'insertion — résistent à une
  // suppression / ré-indexation côté corpus.
  sourceShortCode: text('source_short_code'),
  articleNumber: text('article_number'),
  articleLabel: text('article_label').notNull(),
  mode: citationModeEnum('mode').notNull(),
  // Position approximative dans le document (ordre d'apparition), pour
  // ordonner les citations dans une vue « bibliographie ».
  position: integer('position'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Un même chunk peut apparaître plusieurs fois en mode inline mais on
  // dédoublonne par (document_id, chunk_id, mode) pour limiter le bruit.
  // Les citations sans chunk_id (orphelines) ne sont pas contraintes par
  // cet index (NULLs distincts en Postgres).
  uniq: uniqueIndex('document_citations_uniq').on(t.documentId, t.chunkId, t.mode),
  documentIdx: index('document_citations_document_idx').on(t.documentId),
  chunkIdx: index('document_citations_chunk_idx').on(t.chunkId),
}));

// ─── Échéances (audiences, dépôts, délais) ─────────────────────────
export const echeances = pgTable('echeances', {
  id: uuid('id').primaryKey().defaultRandom(),
  affaireId: uuid('affaire_id').references(() => affaires.id, { onDelete: 'cascade' }).notNull(),
  titre: text('titre').notNull(),
  description: text('description'),
  dateEcheance: timestamp('date_echeance', { withTimezone: true }).notNull(),
  type: typeEcheanceEnum('type'),
  alerteJ7: boolean('alerte_j7').default(true).notNull(),
  alerteJ2: boolean('alerte_j2').default(true).notNull(),
  alerteJ1: boolean('alerte_j1').default(true).notNull(),
  // { j7: timestamp, j2: timestamp, j1: timestamp } — empêche les doublons.
  alertesEnvoyees: jsonb('alertes_envoyees').default(sql`'{}'::jsonb`).notNull(),
  statut: statutEcheanceEnum('statut').default('a_venir').notNull(),
  responsableId: uuid('responsable_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  affaireIdx: index('echeances_affaire_idx').on(t.affaireId, t.dateEcheance),
  upcomingIdx: index('echeances_statut_date_idx').on(t.statut, t.dateEcheance),
}));

// ─── Journal d'audit (historique métier — niveau 1) ────────────────
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'cascade' }).notNull(),
  affaireId: uuid('affaire_id').references(() => affaires.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  compteRenduId: uuid('compte_rendu_id').references(() => comptesRendus.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  // Clé entity.action — cf. lib/constants/audit-actions.ts (ex. "document.soumis")
  action: text('action').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  affaireIdx: index('audit_log_affaire_created_idx').on(t.affaireId, t.createdAt),
  documentIdx: index('audit_log_document_created_idx').on(t.documentId, t.createdAt),
  compteRenduIdx: index('audit_log_compte_rendu_created_idx').on(t.compteRenduId, t.createdAt),
  cabinetIdx: index('audit_log_cabinet_created_idx').on(t.cabinetId, t.createdAt),
}));

// ═══════════════════ RELATIONS ═══════════════════
export const cabinetsRelations = relations(cabinets, ({ many }) => ({
  members: many(users),
  affaires: many(affaires),
  clients: many(clients),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  cabinet: one(cabinets, { fields: [users.cabinetId], references: [cabinets.id] }),
  affairesResponsable: many(affaires, { relationName: 'affaires_responsable' }),
  affaireMemberships: many(affaireMembres),
  documentsAuteur: many(documents, { relationName: 'documents_auteur' }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  chunks: many(chunks),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  cabinet: one(cabinets, { fields: [clients.cabinetId], references: [cabinets.id] }),
  affaires: many(affaires),
}));

export const affairesRelations = relations(affaires, ({ one, many }) => ({
  cabinet: one(cabinets, { fields: [affaires.cabinetId], references: [cabinets.id] }),
  client: one(clients, { fields: [affaires.clientId], references: [clients.id] }),
  responsable: one(users, {
    fields: [affaires.responsableId],
    references: [users.id],
    relationName: 'affaires_responsable',
  }),
  membres: many(affaireMembres),
  documents: many(documents),
  comptesRendus: many(comptesRendus),
  echeances: many(echeances),
}));

export const affaireMembresRelations = relations(affaireMembres, ({ one }) => ({
  affaire: one(affaires, { fields: [affaireMembres.affaireId], references: [affaires.id] }),
  user: one(users, { fields: [affaireMembres.userId], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  affaire: one(affaires, { fields: [documents.affaireId], references: [affaires.id] }),
  auteur: one(users, {
    fields: [documents.auteurId],
    references: [users.id],
    relationName: 'documents_auteur',
  }),
  validateur: one(users, { fields: [documents.validateurId], references: [users.id] }),
  verrouPar: one(users, { fields: [documents.verrouUserId], references: [users.id] }),
  versions: many(documentVersions),
  commentaires: many(commentaires),
  citations: many(documentCitations),
}));

export const documentCitationsRelations = relations(
  documentCitations,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentCitations.documentId],
      references: [documents.id],
    }),
    chunk: one(chunks, {
      fields: [documentCitations.chunkId],
      references: [chunks.id],
    }),
  })
);

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, { fields: [documentVersions.documentId], references: [documents.id] }),
  auteur: one(users, { fields: [documentVersions.createdBy], references: [users.id] }),
}));

export const comptesRendusRelations = relations(comptesRendus, ({ one, many }) => ({
  affaire: one(affaires, { fields: [comptesRendus.affaireId], references: [affaires.id] }),
  auteur: one(users, {
    fields: [comptesRendus.auteurId],
    references: [users.id],
    relationName: 'comptes_rendus_auteur',
  }),
  validateur: one(users, { fields: [comptesRendus.validateurId], references: [users.id] }),
  verrouPar: one(users, { fields: [comptesRendus.verrouUserId], references: [users.id] }),
  versions: many(comptesRendusVersions),
  commentaires: many(commentaires),
}));

export const comptesRendusVersionsRelations = relations(
  comptesRendusVersions,
  ({ one }) => ({
    compteRendu: one(comptesRendus, {
      fields: [comptesRendusVersions.compteRenduId],
      references: [comptesRendus.id],
    }),
    auteur: one(users, {
      fields: [comptesRendusVersions.createdBy],
      references: [users.id],
    }),
  })
);

export const commentairesRelations = relations(commentaires, ({ one, many }) => ({
  document: one(documents, { fields: [commentaires.documentId], references: [documents.id] }),
  compteRendu: one(comptesRendus, {
    fields: [commentaires.compteRenduId],
    references: [comptesRendus.id],
  }),
  auteur: one(users, { fields: [commentaires.auteurId], references: [users.id] }),
  parent: one(commentaires, {
    fields: [commentaires.parentId],
    references: [commentaires.id],
    relationName: 'commentaire_parent',
  }),
  enfants: many(commentaires, { relationName: 'commentaire_parent' }),
}));

export const echeancesRelations = relations(echeances, ({ one }) => ({
  affaire: one(affaires, { fields: [echeances.affaireId], references: [affaires.id] }),
  responsable: one(users, { fields: [echeances.responsableId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  cabinet: one(cabinets, { fields: [auditLog.cabinetId], references: [cabinets.id] }),
  affaire: one(affaires, { fields: [auditLog.affaireId], references: [affaires.id] }),
  document: one(documents, { fields: [auditLog.documentId], references: [documents.id] }),
  compteRendu: one(comptesRendus, {
    fields: [auditLog.compteRenduId],
    references: [comptesRendus.id],
  }),
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));

// ═══════════════════ ANALYTICS ═══════════════════
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    eventName: text('event_name').notNull(),
    eventCategory: text('event_category').notNull(),
    visitorId: text('visitor_id').notNull(),
    sessionId: text('session_id').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    cabinetId: uuid('cabinet_id').references(() => cabinets.id, { onDelete: 'set null' }),
    url: text('url'),
    path: text('path'),
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    userAgent: text('user_agent'),
    browser: text('browser'),
    browserVersion: text('browser_version'),
    os: text('os'),
    deviceType: text('device_type'),
    screenResolution: text('screen_resolution'),
    ipAnonymized: text('ip_anonymized'),
    country: text('country'),
    region: text('region'),
    city: text('city'),
    properties: jsonb('properties').notNull().default({}),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdIdx: index('idx_analytics_events_created').on(t.createdAt),
    nameCreatedIdx: index('idx_analytics_events_name_created').on(t.eventName, t.createdAt),
    sessionIdx: index('idx_analytics_events_session').on(t.sessionId),
  })
);

export const analyticsSessions = pgTable(
  'analytics_sessions',
  {
    id: text('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'),
    entryPage: text('entry_page').notNull(),
    entryReferrer: text('entry_referrer'),
    entryUtmSource: text('entry_utm_source'),
    entryUtmMedium: text('entry_utm_medium'),
    entryUtmCampaign: text('entry_utm_campaign'),
    exitPage: text('exit_page'),
    pageViewsCount: integer('page_views_count').notNull().default(0),
    eventsCount: integer('events_count').notNull().default(0),
    country: text('country'),
    city: text('city'),
    deviceType: text('device_type'),
    browser: text('browser'),
    isBounce: boolean('is_bounce').notNull().default(false),
    isConverted: boolean('is_converted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    visitorIdx: index('idx_analytics_sessions_visitor').on(t.visitorId, t.startedAt),
    datesIdx: index('idx_analytics_sessions_dates').on(t.startedAt),
  })
);

export const analyticsFunnels = pgTable('analytics_funnels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  steps: jsonb('steps').notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});