import { NextResponse } from "next/server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { canManageWorkspace, getWorkspaceContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  if (!canManageWorkspace(context.role)) return NextResponse.json({ error: "Workspace administrator access is required." }, { status: 403 });

  const { data, error } = await createAdminClient().from("api_keys")
    .select("id, key_prefix, label, scopes, created_at, last_used_at, revoked_at")
    .eq("workspace_id", context.workspace.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "API keys could not be loaded." }, { status: 503 });
  return NextResponse.json({ keys: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });
  if (!canManageWorkspace(context.role)) return NextResponse.json({ error: "Workspace administrator access is required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : "";
  const scope = body.scope === "read" ? "telemetry:read" : "telemetry:write";
  if (!label) return NextResponse.json({ error: "Provide a name for this API key." }, { status: 400 });

  const publicId = randomUUID();
  const secret = randomBytes(32).toString("base64url");
  const token = "pm_live_" + publicId + "." + secret;
  const { data, error } = await createAdminClient().from("api_keys").insert({
    workspace_id: context.workspace.id,
    public_id: publicId,
    key_prefix: "pm_live_" + publicId.slice(0, 8),
    secret_hash: createHash("sha256").update(secret).digest("hex"),
    label,
    scopes: [scope],
    created_by: context.user.id,
  }).select("id, key_prefix, label, scopes, created_at").single();

  if (error) {
    console.error("API key creation failed:", error.message);
    return NextResponse.json({ error: "API key could not be created." }, { status: 503 });
  }
  return NextResponse.json({
    key: data,
    token,
    warning: "Copy this token now. It is displayed only once and cannot be retrieved again.",
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}