/**
 * Sérialisation TipTap JSON → HTML pour l'export PDF (impression).
 *
 * Pourquoi pas `@tiptap/html` : on évite une dépendance supplémentaire et
 * on garde un contrôle exact sur le markup produit (citations inline /
 * bloc, attributs `data-…` pour le CSS d'impression). Le schéma supporté
 * est exactement celui des extensions utilisées dans `EditorAffaire`
 * (StarterKit + Link + CitationMark + CitationBlock).
 */

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: Mark[];
  content?: Node[];
  text?: string;
};

const ESCAPE_RE = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(ESCAPE_RE, (c) => ESCAPE_MAP[c]);
}

function attrPairs(attrs: Record<string, unknown> | undefined): string {
  if (!attrs) return "";
  const out: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === "") continue;
    out.push(`${k}="${escapeHtml(String(v))}"`);
  }
  return out.length ? " " + out.join(" ") : "";
}

// ─── Marks (inline wrappers autour du texte) ─────────────────────
function openMark(m: Mark): string {
  switch (m.type) {
    case "bold":
      return "<strong>";
    case "italic":
      return "<em>";
    case "strike":
      return "<s>";
    case "code":
      return "<code>";
    case "underline":
      return "<u>";
    case "link": {
      const href = String(m.attrs?.href ?? "#");
      return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">`;
    }
    case "citation": {
      const a = m.attrs ?? {};
      const dataAttrs: Record<string, unknown> = {
        "data-citation": "",
        class: "adili-citation",
        title: a.articleLabel ?? "",
        "data-chunk-id": a.chunkId ?? "",
        "data-source-short-code": a.sourceShortCode ?? "",
        "data-article-number": a.articleNumber ?? "",
        "data-article-label": a.articleLabel ?? "",
      };
      return `<span${attrPairs(dataAttrs)}>`;
    }
    default:
      return "";
  }
}

function closeMark(m: Mark): string {
  switch (m.type) {
    case "bold":
      return "</strong>";
    case "italic":
      return "</em>";
    case "strike":
      return "</s>";
    case "code":
      return "</code>";
    case "underline":
      return "</u>";
    case "link":
      return "</a>";
    case "citation":
      return "</span>";
    default:
      return "";
  }
}

function renderText(node: Node): string {
  const text = node.text ?? "";
  const safe = escapeHtml(text);
  const marks = node.marks ?? [];
  if (marks.length === 0) return safe;
  // Application ordonnée des marques (l'ordre d'origine ProseMirror est
  // déjà cohérent).
  const open = marks.map(openMark).join("");
  const close = marks
    .slice()
    .reverse()
    .map(closeMark)
    .join("");
  return open + safe + close;
}

// ─── Nodes (blocs + inline non-text) ─────────────────────────────
function renderChildren(node: Node): string {
  if (!Array.isArray(node.content)) return "";
  return node.content.map(renderNode).join("");
}

function renderNode(node: Node): string {
  switch (node.type) {
    case "doc":
      return renderChildren(node);
    case "paragraph":
      return `<p>${renderChildren(node)}</p>`;
    case "heading": {
      const lvl = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
      return `<h${lvl}>${renderChildren(node)}</h${lvl}>`;
    }
    case "bulletList":
      return `<ul>${renderChildren(node)}</ul>`;
    case "orderedList": {
      const start = node.attrs?.start ? ` start="${escapeHtml(String(node.attrs.start))}"` : "";
      return `<ol${start}>${renderChildren(node)}</ol>`;
    }
    case "listItem":
      return `<li>${renderChildren(node)}</li>`;
    case "blockquote":
      return `<blockquote>${renderChildren(node)}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${renderChildren(node)}</code></pre>`;
    case "horizontalRule":
      return "<hr />";
    case "hardBreak":
      return "<br />";
    case "text":
      return renderText(node);
    case "citationBlock": {
      const a = node.attrs ?? {};
      const attrs: Record<string, unknown> = {
        "data-citation-block": "",
        class: "adili-citation-block",
        "data-chunk-id": a.chunkId ?? "",
        "data-source-short-code": a.sourceShortCode ?? "",
        "data-article-number": a.articleNumber ?? "",
        "data-article-label": a.articleLabel ?? "",
      };
      // Le label est rendu en surtitre via CSS ::before (data-article-label).
      // On laisse aussi un span "article-label" en clair pour les lecteurs
      // d'écran et les exports qui n'évalueraient pas les pseudo-éléments
      // (certains parseurs PDF).
      const label = a.articleLabel
        ? `<span class="adili-citation-block__label">${escapeHtml(String(a.articleLabel))}</span>`
        : "";
      return `<blockquote${attrPairs(attrs)}>${label}${renderChildren(node)}</blockquote>`;
    }
    default:
      // Type inconnu : on rend les enfants par sécurité plutôt que de
      // perdre du contenu utilisateur.
      return renderChildren(node);
  }
}

/**
 * Transforme un arbre TipTap JSON en chaîne HTML inerte (échappée).
 * À injecter via `dangerouslySetInnerHTML` dans un conteneur stylisé.
 */
export function tiptapToHtml(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  return renderNode(doc as Node);
}
