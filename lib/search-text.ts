const STOPWORDS = new Set([
  "le",
  "la",
  "les",
  "de",
  "du",
  "des",
  "un",
  "une",
  "et",
  "ou",
  "en",
  "au",
  "aux",
  "par",
  "pour",
  "sur",
  "dans",
  "que",
  "qui",
  "dont",
  "est",
  "sont",
  "été",
  "être",
  "avoir",
  "ce",
  "cette",
  "ces",
  "son",
  "sa",
  "ses",
  "leur",
  "leurs",
  "il",
  "elle",
  "on",
  "nous",
  "vous",
  "ils",
  "elles",
  "ne",
  "pas",
  "plus",
  "moins",
  "comme",
  "avec",
  "sans",
  "sous",
  "entre",
  "afin",
  "lors",
  "après",
  "avant",
  "tout",
  "tous",
  "toute",
  "toutes",
]);

/** Normalise pour comparaison lexicale (sans accents). */
export function normalizeSearchText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['']/g, "'");
}

export function tokenizeQuery(query: string): string[] {
  const norm = normalizeSearchText(query);
  const tokens = norm.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const out: string[] = [];
  for (const t of tokens) {
    if (t.length < 3 || STOPWORDS.has(t)) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/** Terme présent comme mot entier (évite de matcher « par » dans « comparer »). */
export function tokenMatchesInText(normHaystack: string, token: string): boolean {
  if (!token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    return new RegExp(
      `(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`,
      "u"
    ).test(normHaystack);
  } catch {
    return normHaystack.includes(token);
  }
}

export function countQueryTokenHits(
  query: string,
  haystackRaw: string
): { matched: number; total: number; coverage: number } {
  const tokens = tokenizeQuery(query);
  const haystack = normalizeSearchText(haystackRaw);
  let matched = 0;
  for (const t of tokens) {
    if (tokenMatchesInText(haystack, t)) matched += 1;
  }
  const total = tokens.length;
  return { matched, total, coverage: total > 0 ? matched / total : 0 };
}

/** Numéros d'articles mentionnés dans la requête (ex. « art. 134 », « articles 1 à 3 »). */
export function extractArticleNumbers(query: string): string[] {
  const norm = normalizeSearchText(query);
  const nums = new Set<string>();
  const re =
    /\b(?:art(?:icle)?s?)\s*\.?\s*(\d{1,4})(?:\s*(?:à|a|-|et|,)\s*(\d{1,4}))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    nums.add(m[1]!);
    if (m[2]) nums.add(m[2]!);
  }
  const bare = /\b(\d{1,4})\b/g;
  if (/art|article/.test(norm)) {
    while ((m = bare.exec(norm)) !== null) {
      if (m[1] && Number(m[1]) <= 999) nums.add(m[1]);
    }
  }
  return [...nums];
}

/** Codes OHADA / nationaux cités explicitement (AUDCG-2010, CGI-CM, AUS…). */
export function extractCitedShortCodes(query: string): string[] {
  const upper = query.toUpperCase();
  const found = new Set<string>();
  const re = /\b([A-Z]{2,10}(?:-[A-Z0-9]{2,8})*(?:-\d{4})?)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(upper)) !== null) {
    const code = m[1]!;
    if (code.length >= 3) found.add(code);
  }
  return [...found];
}
