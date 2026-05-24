import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * `citation` — marque inline représentant une référence courte à un
 * article du corpus juridique. Rendu visuellement comme une "chip" :
 *
 *     Conformément à [Art. 134 AUDCG], la prescription…
 *
 * Le `chunkId` est la clé canonique vers `chunks.id`. Les autres
 * attributs sont des snapshots résilients (le chunk peut disparaître).
 *
 * Le contrat ProseMirror est aligné avec `lib/documents/citations.ts`
 * pour que `syncDocumentCitations` extraie correctement les références.
 */

export interface CitationAttrs {
  chunkId: string | null;
  sourceShortCode: string | null;
  articleNumber: string | null;
  articleLabel: string;
}

declare module "@tiptap/core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Commands<ReturnType> {
    citation: {
      /**
       * Ajoute ou remplace une marque `citation` sur la sélection courante,
       * ou insère le label si la sélection est vide.
       */
      setCitation: (attrs: CitationAttrs) => ReturnType;
      unsetCitation: () => ReturnType;
    };
  }
}

export const CitationMark = Mark.create<{
  HTMLAttributes: Record<string, unknown>;
}>({
  name: "citation",

  inclusive: false,
  exitable: true,
  // Une marque citation ne se "merge" pas avec une autre — elles
  // doivent rester atomiques pour conserver chunkId distincts.
  excludes: "_",

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
        parseHTML: (el) =>
          el.getAttribute("data-article-label") ?? el.textContent ?? "",
        renderHTML: (attrs) => ({
          "data-article-label": attrs.articleLabel ?? "",
          title: attrs.articleLabel ?? "",
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: "span[data-citation]" },
      // Compatibilité descendante : <a data-citation>
      { tag: "a[data-citation]" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { "data-citation": "", class: "adili-citation" },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setCitation:
        (attrs: CitationAttrs) =>
        ({ chain, state }) => {
          const { empty } = state.selection;
          // Si rien n'est sélectionné, on insère le label entouré de la marque.
          if (empty) {
            const text = attrs.articleLabel || "Référence";
            return chain()
              .insertContent({
                type: "text",
                text,
                marks: [{ type: "citation", attrs }],
              })
              .run();
          }
          return chain().setMark("citation", attrs).run();
        },
      unsetCitation:
        () =>
        ({ commands }) =>
          commands.unsetMark("citation"),
    };
  },
});
