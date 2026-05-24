import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documentCitations } from "@/lib/db/schema";

/**
 * Extraction et synchronisation des citations OHADA contenues dans un
 * document TipTap.
 *
 * Le JSON TipTap est traité comme un arbre ProseMirror : on parcourt
 * récursivement les noeuds pour récolter :
 *   - Les `marks` de type `citation` (références inline).
 *   - Les nodes de type `citationBlock` (citations en bloc).
 *
 * À chaque sauvegarde de document, on appelle `syncDocumentCitations` :
 *   1) on extrait les citations du JSON
 *   2) on remplace l'ensemble des lignes en base par celles extraites
 *      (DELETE + INSERT ... ON CONFLICT DO NOTHING)
 *
 * Le contrat d'attributs est : { chunkId, sourceShortCode, articleNumber,
 * articleLabel } — snapshot résilient à la suppression d'un chunk.
 */

export type CitationMode = "inline" | "block";

/**
 * Extrait une version texte brut depuis un arbre ProseMirror/TipTap.
 * Utilisé côté server fallback si le client ne fournit pas `contenuText`
 * (peu probable, mais robuste). Les blocs sont séparés par un saut de
 * ligne ; les citations inline gardent leur label visible ; les blocs
 * citation sont rendus comme blocs distincts.
 */
export function tiptapToPlainText(doc: unknown): string {
  const parts: string[] = [];

  function visit(node: TipTapNode | null | undefined): void {
    if (!node || typeof node !== "object") return;
    if (typeof (node as { text?: unknown }).text === "string") {
      parts.push((node as { text: string }).text);
      return;
    }
    if (node.type === "citationBlock") {
      parts.push("\n");
      if (Array.isArray(node.content)) {
        for (const c of node.content) visit(c);
      }
      parts.push("\n");
      return;
    }
    if (Array.isArray(node.content)) {
      const isStructural =
        node.type === "paragraph" ||
        node.type === "heading" ||
        node.type === "blockquote" ||
        node.type === "listItem" ||
        node.type === "codeBlock";
      for (const c of node.content) visit(c);
      if (isStructural) parts.push("\n");
    }
  }

  visit(doc as TipTapNode);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export type ExtractedCitation = {
  chunkId: string | null;
  sourceShortCode: string | null;
  articleNumber: string | null;
  articleLabel: string;
  mode: CitationMode;
  /** Position approximative (ordre d'apparition). */
  position: number;
};

type TipTapNode = {
  type?: string;
  attrs?: Record<string, unknown> | null;
  content?: TipTapNode[] | null;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> | null }> | null;
};

/**
 * Parcourt le JSON TipTap et retourne la liste des citations détectées.
 * Les noeuds dont les attributs sont incomplets sont silencieusement
 * ignorés (label manquant) — on préfère un dropping plutôt qu'un crash.
 */
export function extractCitations(doc: unknown): ExtractedCitation[] {
  const out: ExtractedCitation[] = [];
  let cursor = 0;

  function visit(node: TipTapNode | null | undefined): void {
    if (!node || typeof node !== "object") return;

    // Node-level : citationBlock
    if (node.type === "citationBlock" && node.attrs) {
      const cit = readCitationAttrs(node.attrs, "block", cursor++);
      if (cit) out.push(cit);
    }

    // Marks inline : citation
    if (Array.isArray(node.marks)) {
      for (const m of node.marks) {
        if (m?.type === "citation" && m.attrs) {
          const cit = readCitationAttrs(m.attrs, "inline", cursor++);
          if (cit) out.push(cit);
        }
      }
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) visit(child);
    }
  }

  visit(doc as TipTapNode);
  return dedupe(out);
}

function readCitationAttrs(
  attrs: Record<string, unknown>,
  mode: CitationMode,
  position: number
): ExtractedCitation | null {
  const label = asString(attrs.articleLabel);
  if (!label) return null;
  return {
    chunkId: asUuidOrNull(attrs.chunkId),
    sourceShortCode: asString(attrs.sourceShortCode) ?? null,
    articleNumber: asString(attrs.articleNumber) ?? null,
    articleLabel: label,
    mode,
    position,
  };
}

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function asUuidOrNull(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  // Validation laxiste : on garde tout ce qui ressemble à un UUID v4.
  // En cas de format inattendu, on rebascule en NULL pour ne pas violer la FK.
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    s
  )
    ? s
    : null;
}

/**
 * Dédoublonne par (chunkId, mode) en gardant la première position.
 * Les citations sans chunkId sont conservées telles quelles (chacune
 * compte comme distincte pour les besoins de l'affichage).
 */
function dedupe(items: ExtractedCitation[]): ExtractedCitation[] {
  const seen = new Map<string, ExtractedCitation>();
  const orphans: ExtractedCitation[] = [];
  for (const c of items) {
    if (!c.chunkId) {
      orphans.push(c);
      continue;
    }
    const key = `${c.chunkId}::${c.mode}`;
    if (!seen.has(key)) seen.set(key, c);
  }
  return [...seen.values(), ...orphans];
}

/**
 * Réécrit l'ensemble des citations pour un document donné.
 * À appeler systématiquement après une sauvegarde TipTap.
 *
 * Implémentation : DELETE total puis INSERT en lot. Simple et correct
 * tant que le volume reste raisonnable (< 200 citations par document,
 * largement suffisant). En cas de scale, à remplacer par un diff.
 */
export async function syncDocumentCitations(
  documentId: string,
  doc: unknown
): Promise<{ count: number }> {
  const citations = extractCitations(doc);

  await db
    .delete(documentCitations)
    .where(eq(documentCitations.documentId, documentId));

  if (citations.length === 0) return { count: 0 };

  await db
    .insert(documentCitations)
    .values(
      citations.map((c) => ({
        documentId,
        chunkId: c.chunkId,
        sourceShortCode: c.sourceShortCode,
        articleNumber: c.articleNumber,
        articleLabel: c.articleLabel,
        mode: c.mode,
        position: c.position,
      }))
    )
    .onConflictDoNothing({
      target: [
        documentCitations.documentId,
        documentCitations.chunkId,
        documentCitations.mode,
      ],
    });

  return { count: citations.length };
}
