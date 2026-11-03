import { NextResponse } from "next/server";
import { canManageWorkspace, getWorkspaceContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  const admin = createAdminClient();
  const [rules, history] = await Promise.all([
    admin.from("alert_rules").select("id, name, metric, operator, threshold, window_minutes, cooldown_minutes, enabled, last_triggered_at, created_at")
      .eq("workspace_id", context.workspace.id).order("created_at", { ascending: false }),
    admin.from("alert_events").select("id, rule_id, rule_name, metric, observed_value, threshold, triggered_at, details")
      .eq("workspace_id", context.workspace.id).order("triggered_at", { ascending: false }).limit(20),
  ]);
  if (rules.error || history.error) return NextResponse.json({ error: "Alert data could not be loaded." }, { status: 503 });
  return NextResponse.json({ rules: rules.data || [], history: history.data || [] });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  if (!canManageWorkspace(context.role)) return NextResponse.json({ error: "Workspace administrator access is required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const metric = ["error_rate", "p95_latency_ms", "error_count"].includes(body.metric) ? body.metric : null;
  const operator = [">=", ">"].includes(body.operator) ? body.operator : ">=";
  const threshold = Number(body.threshold);
  const windowMinutes = Math.min(Math.max(Number(body.window_minutes || 5), 1), 1440);
  const cooldownMinutes = Math.min(Math.max(Number(body.cooldown_minutes || 15), 1), 1440);
  if (!name || !metric || !Number.isFinite(threshold) || threshold < 0) {
    return NextResponse.json({ error: "Provide a name, supported metric, and non-negative threshold." }, { status: 400 });
  }

  const { data, error } = await createAdminClient().from("alert_rules").insert({
    workspace_id: context.workspace.id, name, metric, operator, threshold,
    window_minutes: windowMinutes, cooldown_minutes: cooldownMinutes, enabled: true, created_by: context.user.id,
  }).select("id, name, metric, operator, threshold, window_minutes, cooldown_minutes, enabled, created_at").single();
  if (error) return NextResponse.json({ error: "Alert rule could not be created." }, { status: 503 });
  return NextResponse.json({ rule: data }, { status: 201 });
}