const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";

export type VoyageInputType = "document" | "query";

/**
 * Embeddings Voyage (ex. `voyage-law-2`, 1024 dims — aligné sur `chunks.embedding` du schéma).
 */
export async function embed(
  texts: string[],
  inputType: VoyageInputType = "document"
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY est requis pour l’ingestion.");
  }

  const model =
    process.env.VOYAGE_EMBEDDING_MODEL?.trim() || "voyage-law-2";

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embeddings HTTP ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };

  const ordered = [...json.data].sort((a, b) => a.index - b.index);
  return ordered.map((d) => d.embedding);
}
