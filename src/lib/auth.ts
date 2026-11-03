import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeDigestMatch } from "@/lib/telemetry/signatures";

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

/**
 * Resolve either a signed-in workspace member or a scoped read-only API key.
 * A write-only ingestion key cannot be used to read events or analytics.
 */
export async function getWorkspaceAccess(request: Request, requiredScope: string): Promise<WorkspaceContext | WorkspaceContextError> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : request.headers.get("x-api-key");

  if (!token) return getWorkspaceContext();
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, code: "database_not_configured", error: "PulseMetrics server credentials are not configured." };
  }

  const match = token.match(/^pm_live_([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/i);
  if (!match) return { ok: false, status: 401, code: "invalid_api_key", error: "The API key is invalid." };

  try {
    const admin = createAdminClient();
    const { data: key, error } = await admin.from("api_keys")
      .select("id, workspace_id, secret_hash, scopes, revoked_at, created_by")
      .eq("public_id", match[1])
      .maybeSingle();

    if (error || !key || key.revoked_at || !safeDigestMatch(key.secret_hash, match[2])) {
      return { ok: false, status: 401, code: "invalid_api_key", error: "The API key is invalid or revoked." };
    }
    if (!Array.isArray(key.scopes) || !key.scopes.includes(requiredScope)) {
      return { ok: false, status: 403, code: "insufficient_scope", error: "This API key does not have the required " + requiredScope + " permission." };
    }

    const { data: rateAllowed, error: rateError } = await admin.rpc("consume_pulsemetrics_rate_limit", {
      p_api_key_id: key.id,
      p_limit: 120,
    });
    if (rateError) return { ok: false, status: 503, code: "rate_limit_unavailable", error: "API rate limiting is not configured. Apply the latest database schema." };
    if (!rateAllowed) return { ok: false, status: 429, code: "rate_limit_exceeded", error: "This API key has exceeded 120 requests per minute." };

    const { data: workspace, error: workspaceError } = await admin.from("workspaces")
      .select("id, name, slug, monthly_event_quota")
      .eq("id", key.workspace_id)
      .maybeSingle();
    if (workspaceError || !workspace) {
      return { ok: false, status: 404, code: "workspace_not_found", error: "The API key workspace no longer exists." };
    }

    return {
      ok: true,
      user: { id: key.created_by || key.id },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, monthly_event_quota: Number(workspace.monthly_event_quota || 1000000) },
      role: "api-key",
    };
  } catch (error) {
    console.error("API key access check failed:", error);
    return { ok: false, status: 503, code: "api_key_lookup_failed", error: "API key verification is temporarily unavailable." };
  }
}

export function canManageWorkspace(role: string): boolean {
  return role === "owner" || role === "admin";
}