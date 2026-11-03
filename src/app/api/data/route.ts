import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "deprecated",
    message: "This placeholder endpoint has been retired. Use the persisted, authenticated PulseMetrics v1 APIs.",
    endpoints: [
      "/api/health",
      "/api/v1/telemetry/ingest",
      "/api/v1/telemetry/events",
      "/api/v1/analytics/summary",
      "/api/v1/analytics/anomalies",
      "/api/v1/api-keys",
      "/api/v1/alerts/rules",
      "/api/v1/search/semantic"
    ]
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}