import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getWorkspaceAccess(request, "telemetry:read");
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  const range = new URL(request.url).searchParams.get("range") || "24h";
  const hours: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };
  const since = new Date(Date.now() - (hours[range] || 24) * 60 * 60 * 1000).toISOString();
  const { data, error } = await createAdminClient().rpc("pulsemetrics_analytics_summary", {
    p_workspace_id: context.workspace.id,
    p_since: since,
  });

  if (error) {
    console.error("Analytics query failed:", error.message);
    return NextResponse.json({ error: "Analytics are unavailable. Confirm that the PulseMetrics schema is applied." }, { status: 503 });
  }
  return NextResponse.json({ range, summary: data || {} }, { headers: { "Cache-Control": "no-store" } });
}