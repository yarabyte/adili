import { Node, mergeAttributes } from "@tiptap/core";

/**
 * `citationBlock` — bloc citant intégralement (ou partiellement) un
 * article du corpus. Rendu visuellement comme un encart avec barre
 * latérale. Le contenu interne est éditable (l'utilisateur peut
 * extraire les seuls passages utiles, ajouter "…").
 *
 * Schéma HTML :
 *   <blockquote data-citation-block
 *               data-chunk-id="…"
 *               data-source-short-code="AUDCG"
 *               data-article-number="134"
 *               data-article-label="Art. 134 AUDCG">
 *     <p>texte de l'article…</p>
 *   </blockquote>
 */

export interface CitationBlockAttrs {
  chunkId: string | null;
  sourceShortCode: string | null;
  articleNumber: string | null;
  articleLabel: string;
}

declare module "@tiptap/core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Commands<ReturnType> {
    citationBlock: {
      insertCitationBlock: (
        attrs: CitationBlockAttrs,
        body: string
      ) => ReturnType;
    };
  }
}

export const CitationBlock = Node.create<{
  HTMLAttributes: Record<string, unknown>;
}>({
  name: "citationBlock",
  group: "block",
  content: "block+",
  defining: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      chunkId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-chunk-id"),
        renderHTML: (attrs) =>
          attrs.chunkId ? { "data-chunk-id": attrs.chunkId } : {},
      },
      sourceShortCode: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-source-short-code"),
        renderHTML: (attrs) =>
          attrs.sourceShortCode
            ? { "data-source-short-code": attrs.sourceShortCode }
            : {},
      },
      articleNumber: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-article-number"),
        renderHTML: (attrs) =>
          attrs.articleNumber
            ? { "data-article-number": attrs.articleNumber }
            : {},
      },
      articleLabel: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-article-label") ?? "",
        renderHTML: (attrs) => ({
          "data-article-label": attrs.articleLabel ?? "",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "blockquote[data-citation-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(
        { "data-citation-block": "", class: "adili-citation-block" },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      insertCitationBlock:
        (attrs: CitationBlockAttrs, body: string) =>
        ({ chain }) => {
          const paragraphs = splitIntoParagraphs(body).map((text) => ({
            type: "paragraph",
            content: text ? [{ type: "text", text }] : [],
          }));
          const content = paragraphs.length
            ? paragraphs
            : [{ type: "paragraph" }];
          return chain()
            .insertContent({
              type: "citationBlock",
              attrs,
              content,
            })
            .createParagraphNear()
            .focus()
            .run();
        },
    };
  },
});

function splitIntoParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}
