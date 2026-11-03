import { getEmbeddingConfig } from "@/lib/env";

export async function createEmbedding(input: string): Promise<number[] | null> {
  const config = getEmbeddingConfig();
  if (!config.configured || !config.baseUrl || !config.apiKey) return null;

  const endpoint = config.baseUrl.endsWith("/embeddings")
    ? config.baseUrl
    : config.baseUrl.replace(/\/$/, "") + "/embeddings";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer " + config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.model, input, dimensions: config.dimensions }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Embedding provider returned HTTP " + response.status + ".");
  const payload = await response.json();
  const embedding = payload?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== config.dimensions ||
      !embedding.every((value: unknown) => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("Embedding provider returned an unexpected vector shape.");
  }
  return embedding as number[];
}