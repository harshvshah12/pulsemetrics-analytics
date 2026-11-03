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
  const admin = createAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [summaryResult, usageResult] = await Promise.all([
    admin.rpc("pulsemetrics_analytics_summary", {
      p_workspace_id: context.workspace.id,
      p_since: since,
    }),
    admin.from("ingestion_usage").select("event_count")
      .eq("workspace_id", context.workspace.id)
      .eq("period_start", monthStart.toISOString().slice(0, 10))
      .maybeSingle(),
  ]);

  if (summaryResult.error || usageResult.error) {
    console.error("Analytics query failed:", summaryResult.error?.message || usageResult.error?.message);
    return NextResponse.json({ error: "Analytics are unavailable. Confirm that the PulseMetrics schema is applied." }, { status: 503 });
  }
  const used = Number(usageResult.data?.event_count || 0);
  const quota = context.workspace.monthly_event_quota;
  return NextResponse.json({
    range,
    summary: summaryResult.data || {},
    usage: { used, quota, remaining: Math.max(0, quota - used), percent: quota ? Math.min(100, used / quota * 100) : 0 },
  }, { headers: { "Cache-Control": "no-store" } });
}