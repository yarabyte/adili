import Anthropic from "@anthropic-ai/sdk";

/**
 * Singleton client Anthropic. Le SDK gère son propre keep-alive ;
 * on évite simplement la réinstanciation à chaque requête.
 */
let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY manquant — synthèse IA désactivée. Ajoutez la clé dans .env.local."
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";

export const SYNTHESIS_TEMPERATURE = (() => {
  const raw = process.env.SYNTHESIS_TEMPERATURE;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.2;
})();

export const SYNTHESIS_MAX_TOKENS = (() => {
  const raw = process.env.SYNTHESIS_MAX_TOKENS;
  const n = raw ? Number(raw) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 4096 ? n : 1500;
})();

/** Score minimum (0–100) pour qu'un chunk soit envoyé au LLM. */
export const SYNTHESIS_MIN_CHUNK_SCORE = (() => {
  const raw = process.env.SYNTHESIS_MIN_CHUNK_SCORE;
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n)) {
    // Tolérer un seuil fourni en 0–1 (ex. 0.5) ou en 0–100.
    if (n > 0 && n <= 1) return Math.round(n * 100);
    if (n >= 0 && n <= 100) return Math.round(n);
  }
  return 50;
})();
