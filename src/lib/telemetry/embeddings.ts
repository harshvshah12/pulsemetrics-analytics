import { getEmbeddingConfig } from "@/lib/env";

export async function createEmbeddings(inputs: string[]): Promise<number[][] | null> {
  const config = getEmbeddingConfig();
  if (!config.configured || !config.baseUrl || !config.apiKey || inputs.length === 0) return null;

  const endpoint = config.baseUrl.endsWith("/embeddings")
    ? config.baseUrl
    : config.baseUrl.replace(/\/$/, "") + "/embeddings";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer " + config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.model, input: inputs, dimensions: 1536 }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Embedding provider returned HTTP " + response.status + ".");
  const payload = await response.json();
  const data = payload?.data;
  if (!Array.isArray(data) || data.length !== inputs.length) {
    throw new Error("Embedding provider returned an unexpected number of vectors.");
  }

  const ordered = [...data].sort((a, b) => Number(a.index) - Number(b.index));
  const vectors = ordered.map((item) => item.embedding);
  if (vectors.some((vector: unknown) => !Array.isArray(vector) || vector.length !== 1536 ||
      !vector.every((value: unknown) => typeof value === "number" && Number.isFinite(value)))) {
    throw new Error("Embedding provider must return 1536-dimensional vectors.");
  }
  return vectors as number[][];
}