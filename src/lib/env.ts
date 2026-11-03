export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function getSupabasePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
}

export function getSupabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey() && getSupabaseSecretKey());
}

export function missingSupabaseVariables(): string[] {
  const missing: string[] = [];
  if (!getSupabaseUrl()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!getSupabasePublishableKey()) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!getSupabaseSecretKey()) missing.push("SUPABASE_SECRET_KEY");
  return missing;
}

export function getEmbeddingConfig() {
  const baseUrl = process.env.EMBEDDING_API_URL;
  const apiKey = process.env.EMBEDDING_API_KEY;
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS || 1536);
  return {
    configured: Boolean(baseUrl && apiKey),
    baseUrl,
    apiKey,
    model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    dimensions: Number.isInteger(dimensions) && dimensions > 0 ? dimensions : 1536,
  };
}