import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getRangeStart(range: string): string {
  const hours: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };
  return new Date(Date.now() - (hours[range] || 24) * 60 * 60 * 1000).toISOString();
}

export async function GET(request: Request) {
  const context = await getWorkspaceAccess(request, "telemetry:read");
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  const params = new URL(request.url).searchParams;
  const range = params.get("range") || "24h";
  const limit = Math.min(Math.max(Number(params.get("limit") || 50), 1), 100);
  let query = createAdminClient().from("telemetry_events")
    .select("id, service, event_name, message, severity, status_code, latency_ms, occurred_at, received_at, region, attributes")
    .eq("workspace_id", context.workspace.id)
    .gte("received_at", getRangeStart(range))
    .order("received_at", { ascending: false })
    .limit(limit);

  const service = params.get("service");
  const severity = params.get("severity");
  const status = params.get("status");
  const search = params.get("q")?.trim().slice(0, 120);
  if (service) query = query.eq("service", service.slice(0, 100));
  if (severity && ["debug", "info", "warn", "error", "critical"].includes(severity)) query = query.eq("severity", severity);
  if (status && /^\d{3}$/.test(status)) query = query.eq("status_code", Number(status));
  const safeSearch = search?.replace(/[^\p{L}\p{N}\s_.:-]/gu, " ").trim();
  if (safeSearch) query = query.ilike("message", "%" + safeSearch + "%");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Events could not be loaded." }, { status: 503 });
  return NextResponse.json({ events: data || [] }, { headers: { "Cache-Control": "no-store" } });
}