import "server-only";

import {
  countQueryTokenHits,
  extractArticleNumbers,
  extractCitedShortCodes,
  normalizeSearchText,
  tokenizeQuery,
  tokenMatchesInText,
} from "./search-text";

export type LexicalScoreInput = {
  content: string;
  articleNumber: string | null;
  articleLabel: string | null;
  sourceShortCode: string;
  sourceTitle: string;
};

export type TokenHitStats = {
  matched: number;
  total: number;
  coverage: number;
};

export function tokenHitStatsForRow(
  query: string,
  row: LexicalScoreInput
): TokenHitStats {
  const haystack = [
    row.sourceShortCode,
    row.sourceTitle,
    row.articleLabel ?? "",
    row.articleNumber ?? "",
    row.content,
  ].join(" ");
  return countQueryTokenHits(query, haystack);
}

/**
 * Score lexical 0–1 : complète la similarité vectorielle (articles, codes, termes).
 */
export function lexicalRelevanceScore(
  query: string,
  row: LexicalScoreInput
): number {
  const tokens = tokenizeQuery(query);
  const articleNums = extractArticleNumbers(query);
  const citedCodes = extractCitedShortCodes(query);

  const haystack = normalizeSearchText(
    [
      row.sourceShortCode,
      row.sourceTitle,
      row.articleLabel ?? "",
      row.articleNumber ?? "",
      row.content,
    ].join(" ")
  );

  let score = 0;

  const codeUpper = row.sourceShortCode.toUpperCase();
  if (citedCodes.some((c) => c === codeUpper || codeUpper.startsWith(c))) {
    score += 0.42;
  }

  if (articleNums.length > 0) {
    const artNum = row.articleNumber?.trim();
    const artLabel = normalizeSearchText(row.articleLabel ?? "");
    for (const n of articleNums) {
      if (artNum === n) score += 0.45;
      else if (
        artLabel.includes(`article ${n}`) ||
        artLabel.includes(`art ${n}`)
      ) {
        score += 0.28;
      }
    }
  }

  if (tokens.length > 0) {
    let hits = 0;
    let weighted = 0;
    for (const t of tokens) {
      if (tokenMatchesInText(haystack, t)) {
        hits += 1;
        weighted += t.length >= 6 ? 1.2 : 1;
      }
    }
    const coverage = hits / tokens.length;
    const density = weighted / tokens.length;
    score += coverage * 0.42 + density * 0.14;

    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      if (haystack.includes(bigram)) score += 0.1;
    }

    if (tokens.length >= 2 && hits < 2) {
      score *= 0.55;
    }
  }

  return Math.min(1, score);
}

/** Pénalise les résultats trop éloignés ou ne partageant pas les termes clés. */
export function passesRelevanceGate(
  similarity: number,
  lexicalScore: number,
  tokenHits?: TokenHitStats
): boolean {
  const { matched = 0, total = 0 } = tokenHits ?? {};

  if (total >= 3 && matched < 2 && similarity < 0.52) return false;
  if (total >= 2 && matched === 0 && similarity < 0.48) return false;
  if (total >= 2 && matched === 1 && similarity < 0.4 && lexicalScore < 0.22) {
    return false;
  }

  if (similarity >= 0.34) return true;
  if (lexicalScore >= 0.28) return true;
  if (similarity >= 0.24 && lexicalScore >= 0.14) return true;
  return false;
}
