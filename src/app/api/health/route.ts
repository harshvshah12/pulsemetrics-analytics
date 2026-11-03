import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingConfig, isSupabaseConfigured, missingSupabaseVariables } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();
  let database: "connected" | "unavailable" | "not_configured" = "not_configured";

  if (configured) {
    try {
      const { error } = await createAdminClient().from("workspaces").select("id").limit(1);
      database = error ? "unavailable" : "connected";
    } catch {
      database = "unavailable";
    }
  }

  const status = database === "connected" ? "healthy" : database === "not_configured" ? "not_configured" : "degraded";
  return NextResponse.json({
    status,
    service: "PulseMetrics Cloud Analytics",
    checks: {
      database,
      embeddings: getEmbeddingConfig().configured ? "configured" : "not_configured",
    },
    missingVariables: missingSupabaseVariables(),
    timestamp: new Date().toISOString(),
  }, {
    status: status === "healthy" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}