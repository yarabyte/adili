/**
 * Retire le bruit typique des PDF OHADA (en-têtes, URLs, numéros de page)
 * pour l’affichage des résultats de recherche, puis réagence le texte en
 * paragraphes lisibles.
 */
const NOISE_LINE = [
  /^https?:\/\/\S+$/i,
  /^www\.[a-z0-9.-]+\.[a-z]{2,}\/?\S*$/i,
  /^\s*page\s+\d+\s*\/\s*\d+\s*$/i,
  /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/i,
  /^\s*\(\s*[A-Z]{2,8}\s*\)\s*$/,
  /^publié au journal officiel/i,
  /^adopté le\s+\d{1,2}\/\d{1,2}\/\d{4}/i,
  /^adopté le\s+\d{1,2}\s+[a-zéû]+\s+\d{4}/i,
  /^acte uniforme\s+relatif\b/i,
  /^acte uniforme\s+portant\b/i,
  /^acte uniforme\s+sur\b/i,
  /^.{0,160}journal\s+officiel.{0,80}$/i,
  /^.{0,120}ohada\.com\S*$/i,
  /^.{0,200}www\.ohada\.com/i,
  /^powered by tcpdf/i,
  /tcpdf\.org/i,
  /^journal officiel\b/i,
  /ohada\.org/i,
  /secretariat@/i,
  /^.{0,80}organisation pour l['']harmonisation/i,
  /^.{0,80}secrétariat permanent/i,
  /^.{0,8}b\.?\s*p\.?\s+\d{2,}/i,
  /^.{0,30}tél\s*[:.]/i,
  /^.{0,30}fax\s*[:.]/i,
  /^.{0,30}courriel\s*[:.]/i,
  /^.{0,30}site web\s*[:.]/i,
  /^numéro spécial\s+\d/i,
  /^prix\s*:\s*\d/i,
  /^\d{1,3}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\s*$/i,
  /^table des matières/i,
];

function isNoiseLine(line: string): boolean {
  const t = line.trim();
  if (t.length <= 1) return true;
  if (t.length < 80 && /^[\d\s./\-–—:]+$/.test(t)) return true;
  if (NOISE_LINE.some((re) => re.test(t))) return true;
  // Densité de lettres : ligne d'au moins 30 caractères contenant moins de 40 %
  // de lettres → bruit (suite de numéros de page, etc.).
  if (t.length >= 30) {
    const letters = (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) ?? []).length;
    if (letters / t.length < 0.4) return true;
  }
  return false;
}

/**
 * Nettoyage inline : retire des motifs de bruit qui peuvent se trouver
 * AU MILIEU d'une ligne (cas fréquent quand l'extracteur PDF concatène
 * tout en une seule phrase).
 */
function stripInlineNoise(s: string): string {
  return (
    s
      // URLs / emails
      .replace(/https?:\/\/[^\s)\]]+/gi, "")
      .replace(/www\.[\w.-]+\.[a-z]{2,}\S*/gi, "")
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "")
      // Marqueurs de page
      .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
      .replace(/\bpage\s+\d+\s*\/\s*\d+/gi, "")
      // TCPDF
      .replace(/Powered by TCPDF\s*\([^)]*\)/gi, "")
      // Adresses postales OHADA / coordonnées
      .replace(/B\.?\s*P\.?\s+\d{2,6}[^,.;]*[,.;]?/gi, "")
      .replace(/T[ée]l\s*[:.][^.;]*?(?=\s[A-Z]|\.|;|$)/gi, "")
      .replace(/Fax\s*[:.][^.;]*?(?=\s[A-Z]|\.|;|$)/gi, "")
      .replace(/Courriel\s*[:.][^.;]*?(?=\s[A-Z]|\.|;|$)/gi, "")
      .replace(/Site web\s*[:.][^.;]*?(?=\s[A-Z]|\.|;|$)/gi, "")
      // Tables des matières : longues séries de nombres "11 13 14 14 17 17 18…"
      .replace(/(?:\b\d{1,3}\b[\s,]+){4,}\d{1,3}/g, "")
      // Nettoyage typographique
      .replace(/\[\s*\]/g, "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+([,.;:])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

/**
 * Vrai si la ligne ressemble au début d'un nouvel item / titre :
 * `a)`, `b)`, `1)`, `1.`, `- …`, `Article …`, `ARTICLE …`, etc.
 * Dans ce cas le retour à la ligne PDF est sémantique et doit être conservé.
 */
function isStructuralLineStart(line: string): boolean {
  return (
    /^[a-z]\)\s/i.test(line) ||
    /^\d{1,3}\)\s/.test(line) ||
    /^\d{1,3}[.°]\s/.test(line) ||
    /^[-*•]\s/.test(line) ||
    /^Article\b/i.test(line) ||
    /^Art\.\s*\d/i.test(line) ||
    /^Chapitre\s+\w/i.test(line) ||
    /^Section\s+\w/i.test(line) ||
    /^Titre\s+\w/i.test(line)
  );
}

/**
 * Fusionne les retours à la ligne « techniques » insérés par l'extracteur PDF
 * (wraps de colonne) à l'intérieur d'un même paragraphe, sans détruire les
 * sauts structurels (items de liste, articles, titres).
 */
function reflowLines(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph.split("\n");
      const out: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length === 0) continue;
        if (out.length === 0) {
          out.push(line);
          continue;
        }
        const prev = out[out.length - 1];
        if (isStructuralLineStart(line)) {
          out.push(line);
          continue;
        }
        // césure en fin de ligne : "exécu-\ntion" → "exécution"
        if (/[A-Za-zÀ-ÖØ-öø-ÿ]-$/.test(prev) && /^[a-zà-ÿ]/.test(line)) {
          out[out.length - 1] = prev.slice(0, -1) + line;
        } else {
          out[out.length - 1] = `${prev} ${line}`;
        }
      }
      return out.join("\n");
    })
    .join("\n\n");
}

/** Phrases de « promulgation » que l'on retire des extraits affichés. */
const BOILERPLATE_SENTENCE = [
  /\bfait à\s+[A-ZÀ-Ÿ][^,.]*,\s*le\s+\d/i,
  /\ble présent acte uniforme[^.]*?(abroge|sera publié|entre en vigueur|prendra effet)/i,
  /\bsera publié au\s+(journal officiel|j\.?\s*o\b)/i,
  /\bentre(?:nt|ra|ront)?\s+en\s+vigueur\b/i,
  /\babroge l['']acte uniforme\b/i,
  /\badopté(e|es|s)? (le|à)\s+(\d|[A-ZÀ-Ÿ])/i,
  /\bpublié au journal officiel\b/i,
];

function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^.;!?]+[.;!?]+(?=\s|$)|[^.;!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

/**
 * Retire les phrases « boilerplate » (dates de promulgation, abrogation,
 * publication au Journal officiel…) qui parasitent les résultats sans
 * détruire la structure de listes (sauts `\n` internes préservés).
 */
function dropBoilerplateSentences(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const segments = paragraph.split("\n").map((segment) => {
        const sentences = splitSentences(segment);
        if (sentences.length === 0) {
          return BOILERPLATE_SENTENCE.some((re) => re.test(segment))
            ? ""
            : segment;
        }
        const kept = sentences.filter(
          (s) => !BOILERPLATE_SENTENCE.some((re) => re.test(s))
        );
        return kept.join(" ").trim();
      });
      return segments.filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Découpe un blob mono-ligne en plusieurs paragraphes en s'appuyant sur
 * les fins de phrase. Idempotent si le texte a déjà des `\n\n`.
 */
function softParagraphs(input: string, targetChars = 320): string {
  if (input.includes("\n\n")) return input;
  if (input.length <= targetChars * 1.4) return input;

  // Tokenize en phrases : on coupe après `.`, `;`, `!`, `?` suivis d'un espace.
  const sentences: string[] = [];
  const re = /[^.;!?]+[.;!?]+(?=\s|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    sentences.push(m[0].trim());
    last = re.lastIndex;
  }
  if (last < input.length) {
    const tail = input.slice(last).trim();
    if (tail) sentences.push(tail);
  }
  if (sentences.length <= 1) return input;

  const paras: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (!buf) {
      buf = s;
    } else if (buf.length + 1 + s.length > targetChars) {
      paras.push(buf);
      buf = s;
    } else {
      buf = `${buf} ${s}`;
    }
  }
  if (buf) paras.push(buf);
  return paras.join("\n\n");
}

/**
 * Texte d’extrait pour la recherche et la synthèse : nettoyage habituel, puis
 * repli sur le brut tronqué si tout a été filtré (sinon Zod / LLM reçoivent un
 * snippet vide alors que le chunk existe en base).
 */
export function searchHitSnippet(raw: string, maxChars = 960): string {
  const cleaned = cleanCorpusSnippet(raw, maxChars);
  if (cleaned.length > 0) return cleaned;
  const fallback = raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
  if (fallback.length > 0) return fallback;
  return "Contenu de l’extrait indisponible.";
}

export function cleanCorpusSnippet(raw: string, maxChars = 960): string {
  if (!raw.trim()) return "";

  let t = raw.replace(/\u00a0/g, " ").replace(/\r\n?/g, "\n");
  t = stripInlineNoise(t);

  const lines = t.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (isNoiseLine(line)) continue;
    const trimmed = stripInlineNoise(line);
    if (!trimmed) {
      if (kept.length === 0) continue;
      if (kept[kept.length - 1] === "") continue;
      kept.push("");
      continue;
    }
    if (isNoiseLine(trimmed)) continue;
    if (kept.length && kept[kept.length - 1] === trimmed) continue;
    kept.push(trimmed);
  }

  let joined = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  joined = stripInlineNoise(joined);

  if (!joined) {
    joined = stripInlineNoise(
      raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
    );
  }

  // 1) Fusionne les retours à la ligne d'extraction PDF dans un même paragraphe.
  joined = reflowLines(joined);
  // 2) Supprime les phrases de promulgation (dates, abrogation, JO…).
  joined = dropBoilerplateSentences(joined);
  // 3) Auto-paragraphage si le texte est resté un blob mono-ligne.
  joined = softParagraphs(joined);

  if (joined.length <= maxChars) return joined;

  // Découpe respectant la frontière de paragraphe / mot.
  const slice = joined.slice(0, maxChars);
  const lastPara = slice.lastIndexOf("\n\n");
  if (lastPara > maxChars * 0.6) {
    return `${slice.slice(0, lastPara).trim()}…`;
  }
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxChars * 0.65 ? lastSpace : maxChars;
  return `${slice.slice(0, cut).trim()}…`;
}

/**
 * Contenu chunk prêt pour la base et l’embedding document : nettoyage PDF,
 * repli sur le brut si le filtre supprime trop peu de texte.
 */
export function prepareChunkContentForCorpus(
  raw: string,
  maxChars = 2000
): string {
  const cleaned = cleanCorpusSnippet(raw, maxChars);
  if (cleaned.length >= 40) return cleaned;
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

/** Distance cosinus pgvector (= 1 − similarité cosinus). → score 0–100 %. */
export function distanceToRelevancePercent(distance: number): number {
  const sim = 1 - Math.min(Math.max(distance, 0), 2);
  return Math.round(sim * 100);
}
