import { NextResponse } from "next/server";
import { canManageWorkspace, getWorkspaceContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workspace = await getWorkspaceContext();
  if (!workspace.ok) return NextResponse.json({ error: workspace.error, code: workspace.code }, { status: workspace.status });
  if (!canManageWorkspace(workspace.role)) return NextResponse.json({ error: "Workspace administrator access is required." }, { status: 403 });

  const { data, error } = await createAdminClient().from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspace.workspace.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "API key could not be revoked." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Active API key not found." }, { status: 404 });
  return NextResponse.json({ status: "revoked" });
}