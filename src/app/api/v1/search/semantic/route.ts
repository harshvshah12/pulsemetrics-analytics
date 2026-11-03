import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEmbeddings } from "@/lib/telemetry/embeddings";
import { getEmbeddingConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getWorkspaceAccess(request, "telemetry:read");
  if (!context.ok) return NextResponse.json({ error: context.error, code: context.code }, { status: context.status });

  const body = await request.json().catch(() => ({}));
  const queryText = typeof body.query === "string" ? body.query.trim().slice(0, 500) : "";
  if (!queryText) return NextResponse.json({ error: "Enter a search query." }, { status: 400 });

  const admin = createAdminClient();
  const config = getEmbeddingConfig();
  if (config.configured) {
    try {
      const vectors = await createEmbeddings([queryText]);
      const embedding = vectors?.[0];
      if (embedding) {
        const { data, error } = await admin.rpc("match_pulsemetrics_events", {
          p_workspace_id: context.workspace.id,
          p_embedding: "[" + embedding.join(",") + "]",
          p_match_count: 25,
        });
        if (!error) return NextResponse.json({
          mode: "semantic",
          note: "Results ranked by vector similarity.",
          results: data || [],
        });
        console.error("Vector search unavailable:", error.message);
      }
    } catch (error) {
      console.error("Embedding search failed:", error);
    }
  }

  const safeQuery = queryText.replace(/[^\p{L}\p{N}\s_-]/gu, " ").trim();
  if (!safeQuery) return NextResponse.json({
    mode: "keyword_fallback",
    note: "The search query did not contain searchable characters.",
    results: [],
  });
  const { data, error } = await admin.from("telemetry_events")
    .select("id, service, event_name, message, severity, status_code, latency_ms, occurred_at, received_at, region")
    .eq("workspace_id", context.workspace.id)
    .or("message.ilike.%" + safeQuery + "%,service.ilike.%" + safeQuery + "%,event_name.ilike.%" + safeQuery + "%")
    .order("received_at", { ascending: false })
    .limit(25);

  if (error) return NextResponse.json({ error: "Search is unavailable." }, { status: 503 });
  return NextResponse.json({
    mode: "keyword_fallback",
    note: "Embedding search is not configured or unavailable. These results use text matching, not semantic vector similarity.",
    results: data || [],
  });
}