import { NextResponse } from "next/server";
import { canManageWorkspace, getWorkspaceContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workspace = await getWorkspaceContext();
  if (!workspace.ok) return NextResponse.json({ error: workspace.error, code: workspace.code }, { status: workspace.status });
  if (!canManageWorkspace(workspace.role)) return NextResponse.json({ error: "Workspace administrator access is required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim().slice(0, 100);
  if (typeof body.threshold === "number" && Number.isFinite(body.threshold) && body.threshold >= 0) update.threshold = body.threshold;
  if (!Object.keys(update).length) return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });

  const { data, error } = await createAdminClient().from("alert_rules").update(update)
    .eq("id", id).eq("workspace_id", workspace.workspace.id)
    .select("id, name, metric, threshold, enabled").maybeSingle();
  if (error) return NextResponse.json({ error: "Alert rule could not be updated." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Alert rule not found." }, { status: 404 });
  return NextResponse.json({ rule: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workspace = await getWorkspaceContext();
  if (!workspace.ok) return NextResponse.json({ error: workspace.error, code: workspace.code }, { status: workspace.status });
  if (!canManageWorkspace(workspace.role)) return NextResponse.json({ error: "Workspace administrator access is required." }, { status: 403 });

  const { data, error } = await createAdminClient().from("alert_rules").delete()
    .eq("id", id).eq("workspace_id", workspace.workspace.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Alert rule could not be deleted." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Alert rule not found." }, { status: 404 });
  return NextResponse.json({ status: "deleted" });
}