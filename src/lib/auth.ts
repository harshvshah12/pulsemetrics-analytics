import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type WorkspaceContext = {
  ok: true;
  user: { id: string; email?: string };
  workspace: { id: string; name: string; slug: string; monthly_event_quota: number };
  role: string;
};
export type WorkspaceContextError = { ok: false; status: number; error: string; code: string };

export async function getWorkspaceContext(): Promise<WorkspaceContext | WorkspaceContextError> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, code: "database_not_configured", error: "PulseMetrics needs an active Supabase project. Configure the required environment variables." };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { ok: false, status: 401, code: "unauthenticated", error: "Please sign in to continue." };
    }

    const admin = createAdminClient();
    const { data: membership, error: memberError } = await admin
      .from("workspace_members")
      .select("workspace_id, role, workspaces(id, name, slug, monthly_event_quota)")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberError) {
      console.error("Workspace lookup failed:", memberError.message);
      return { ok: false, status: 503, code: "workspace_lookup_failed", error: "Workspace schema is not ready. Apply supabase/schema.sql and try again." };
    }
    if (!membership || !membership.workspaces) {
      return { ok: false, status: 403, code: "workspace_missing", error: "No workspace is linked to this account. Sign up again after applying the PulseMetrics schema." };
    }

    const workspace = Array.isArray(membership.workspaces) ? membership.workspaces[0] : membership.workspaces;
    if (!workspace) return { ok: false, status: 403, code: "workspace_missing", error: "No workspace is linked to this account." };

    return {
      ok: true,
      user: { id: data.user.id, email: data.user.email || undefined },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, monthly_event_quota: Number(workspace.monthly_event_quota || 1000000) },
      role: membership.role,
    };
  } catch (error) {
    console.error("Workspace context failed:", error);
    return { ok: false, status: 503, code: "configuration_error", error: "The workspace service is temporarily unavailable." };
  }
}

export function canManageWorkspace(role: string): boolean {
  return role === "owner" || role === "admin";
}