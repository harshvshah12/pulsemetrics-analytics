import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEmbedding } from "@/lib/telemetry/embeddings";
import { safeDigestMatch, verifyHmacSignature } from "@/lib/telemetry/signatures";
import { telemetryEventSchema } from "@/lib/telemetry/validation";
import { evaluateWorkspaceAlerts } from "@/lib/alerts/evaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function getToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return request.headers.get("x-api-key");
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1024 * 1024) {
    return respond({ error: "Payload exceeds the 1 MB limit." }, 413);
  }

  const token = getToken(request);
  const tokenMatch = token?.match(/^pm_live_([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/i);
  if (!tokenMatch) return respond({ error: "A valid PulseMetrics API key is required." }, 401);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return respond({ error: "Request body must contain valid JSON." }, 400);
  }

  const signature = verifyHmacSignature(
    tokenMatch[2],
    rawBody,
    request.headers.get("x-pulse-timestamp"),
    request.headers.get("x-pulse-signature"),
  );
  if (!signature.valid) return respond({ error: signature.reason || "Invalid request signature." }, 401);

  const candidates = Array.isArray(body) ? body :
    body && typeof body === "object" && Array.isArray((body as { events?: unknown }).events)
      ? (body as { events: unknown[] }).events : [body];

  if (candidates.length < 1 || candidates.length > 100) {
    return respond({ error: "Submit between 1 and 100 telemetry events per request." }, 400);
  }

  const parsed = candidates.map((event) => telemetryEventSchema.safeParse(event));
  const invalid = parsed.map((result, index) => !result.success ? {
    index,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  } : null).filter(Boolean);

  if (invalid.length) return respond({ error: "One or more events failed validation.", invalid }, 400);

  const events = parsed.map((result) => {
    if (!result.success) throw new Error("Unreachable invalid event.");
    return result.data;
  });

  const admin = createAdminClient();
  const publicId = tokenMatch[1];
  const secret = tokenMatch[2];
  const { data: apiKey, error: keyError } = await admin
    .from("api_keys")
    .select("id, workspace_id, secret_hash, scopes, revoked_at")
    .eq("public_id", publicId)
    .maybeSingle();

  if (keyError || !apiKey || apiKey.revoked_at || !safeDigestMatch(apiKey.secret_hash, secret)) {
    return respond({ error: "Invalid or revoked API key." }, 401);
  }
  if (!Array.isArray(apiKey.scopes) || !apiKey.scopes.includes("telemetry:write")) {
    return respond({ error: "This API key does not have telemetry:write permission." }, 403);
  }

  const { data: withinQuota, error: quotaError } = await admin.rpc("consume_pulsemetrics_quota", {
    p_workspace_id: apiKey.workspace_id,
    p_count: events.length,
  });
  if (quotaError) {
    console.error("Quota check failed:", quotaError.message);
    return respond({ error: "Usage quota could not be checked. Apply the database schema and retry." }, 503);
  }
  if (!withinQuota) return respond({ error: "Monthly ingestion quota reached for this workspace." }, 429);

  const observedRegion = request.headers.get("x-vercel-id")?.split(":")[0] || null;
  const rows = events.map((event) => ({
    workspace_id: apiKey.workspace_id,
    service: event.service,
    event_name: event.event_name || null,
    message: event.message || null,
    severity: event.severity,
    status_code: event.status_code ?? null,
    latency_ms: event.latency_ms ?? null,
    occurred_at: event.occurred_at || new Date().toISOString(),
    region: event.region || observedRegion,
    attributes: event.attributes || {},
  }));

  const { data: inserted, error: insertError } = await admin
    .from("telemetry_events")
    .insert(rows)
    .select("id, service, event_name, message, severity, status_code, latency_ms, occurred_at, received_at, region, attributes");

  if (insertError) {
    console.error("Telemetry persistence failed:", insertError.message);
    return respond({ error: "Telemetry events could not be persisted." }, 503);
  }

  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKey.id);

  let indexed = 0;
  let indexingFailed = false;
  for (const event of inserted || []) {
    try {
      const text = [event.service, event.event_name, event.message, event.severity].filter(Boolean).join(" ");
      const embedding = await createEmbedding(text);
      if (embedding) {
        const { error } = await admin.from("event_embeddings").upsert({
          workspace_id: apiKey.workspace_id,
          event_id: event.id,
          embedding,
          model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
        }, { onConflict: "event_id" });
        if (error) indexingFailed = true;
        else indexed += 1;
      }
    } catch (error) {
      indexingFailed = true;
      console.error("Embedding indexing failed:", error);
    }
  }

  await evaluateWorkspaceAlerts(apiKey.workspace_id);

  return respond({
    status: "accepted",
    requestId: randomUUID(),
    accepted: inserted?.length || 0,
    rejected: 0,
    indexed,
    searchMode: process.env.EMBEDDING_API_KEY ? "vector_when_available" : "keyword_fallback",
    ...(indexingFailed ? { indexingWarning: "Events were persisted but some vector embeddings could not be indexed." } : {}),
    receivedAt: new Date().toISOString(),
  }, 202);
}