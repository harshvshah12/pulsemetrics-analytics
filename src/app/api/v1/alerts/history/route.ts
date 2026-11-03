import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  const { data, error } = await createAdminClient().from("alert_events")
    .select("id, rule_name, metric, observed_value, threshold, triggered_at, details")
    .eq("workspace_id", context.workspace.id)
    .order("triggered_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Alert history is unavailable." }, { status: 503 });
  return NextResponse.json({ history: data || [] });
}