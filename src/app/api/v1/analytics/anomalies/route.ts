import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getWorkspaceAccess(request, "telemetry:read");
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  const { data, error } = await createAdminClient().rpc("pulsemetrics_anomaly_summary", {
    p_workspace_id: context.workspace.id,
    p_now: new Date().toISOString(),
  });
  if (error) {
    console.error("Anomaly analysis failed:", error.message);
    return NextResponse.json({ error: "Anomaly analysis is unavailable. Apply the latest database schema." }, { status: 503 });
  }
  return NextResponse.json({ anomaly: data || { status: "insufficient_baseline" } }, { headers: { "Cache-Control": "no-store" } });
}