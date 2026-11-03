# PulseMetrics Cloud Analytics — Product Requirements Document

**Version:** 1.0  
**Status:** Approved implementation baseline  
**Date:** 2026-11-03  
**Repository:** https://github.com/harshvshah12/pulsemetrics-analytics  
**Production URL:** https://pulsemetrics-analytics.vercel.app/

## 1. Product summary

PulseMetrics is a multi-tenant cloud observability application for collecting application telemetry, exploring service performance, searching operational events, and managing alert rules. It must replace the current static dashboard and browser-generated demo log stream with authenticated, persisted, measurable workflows.

The product will be honest about its operating footprint: Vercel deployment and observed request regions do not imply ownership of a global edge fleet, BGP Anycast network, or a contractual SLA. All metrics must be calculated from stored events and real health checks. Empty installations must display an onboarding or no-data state rather than invented production numbers.

## 2. Problem statement

The current app is predominantly a presentation layer. Its homepage generates fake log rows in the browser, the API-token modal displays a hard-coded token, the dashboard shows static values, the only data API returns a static capability list, and the capability page describes infrastructure that is not backed by deployed services.

This prevents developers from using the product to send events, investigate incidents, understand performance, or manage access safely.

## 3. Goals

1. Accept single and batched telemetry events from external applications through a documented HTTP API.
2. Authenticate ingestion requests with one-time-issued API credentials, scoped permissions, hashed secret storage, timestamp checks, and optional HMAC-SHA256 request signatures.
3. Persist events in PostgreSQL with tenant/workspace isolation and Row Level Security.
4. Display real-time event activity, event counts, request throughput, error rate, latency percentiles, service distribution, and regional observations.
5. Provide historical analytics over selectable time windows.
6. Support natural-language/similarity search over indexed event descriptions when an embedding provider is configured, with a transparent keyword-search fallback when it is not.
7. Let workspace members create, pause, edit, and inspect alert rules and their event history.
8. Provide health/readiness checks and show honest states for unavailable or unconfigured infrastructure.
9. Replace static dashboard cards, token generation, and rotating fake logs with working product flows.
10. Provide documentation, environment templates, schema/bootstrap SQL, and automated quality checks.

## 4. Non-goals for the first release

- Claiming or provisioning 128 physical edge nodes or global BGP Anycast routing.
- Claiming an uptime SLA or sub-15ms global latency without measured evidence.
- Replacing a full distributed tracing system or APM suite.
- Operating a globally distributed stream-processing cluster.
- Building a paid billing/checkout system.
- Storing plaintext API keys or exposing service-role credentials to the browser.
- Automatically sending notifications to arbitrary destinations without SSRF-safe delivery controls.

## 5. Personas and primary workflows

### Persona A — Application developer
1. Creates a workspace and an ingestion key.
2. Copies an SDK/cURL example.
3. Sends test events to the ingestion endpoint.
4. Sees accepted events appear in the event feed and dashboard.

### Persona B — SRE / DevOps engineer
1. Reviews request volume, error rates, latency percentiles, and service breakdown.
2. Filters events by time range, service, status, severity, or region.
3. Searches for related failures.
4. Creates alert rules and inspects triggered alert history.

### Persona C — Workspace administrator
1. Signs in.
2. Manages workspace API keys and their scopes.
3. Revokes compromised keys.
4. Reviews usage and service health.

## 6. Functional requirements

### FR-01 — Authentication and tenant isolation
- Use Supabase Auth with server-side cookie sessions.
- Unauthenticated visitors can view the product introduction and documentation, but not workspace data or management actions.
- A signed-in user must belong to a workspace before accessing its data.
- Every tenant-owned record has a workspace identifier.
- Enforce workspace membership through PostgreSQL RLS policies; do not trust user-supplied workspace identifiers without membership checks.

### FR-02 — API key lifecycle
- Generate cryptographically random API secrets with a non-guessable public identifier.
- Show the complete secret once at creation; never store or retrieve it in plaintext.
- Store a SHA-256 digest, prefix, label, scope set, creator, timestamps, last-used time, and revoked state.
- Support ingestion-only and read-only scopes; reject missing or insufficient scopes.
- Allow revocation and make it effective on the next request.
- Never expose the digest or secret through browser-visible queries.

### FR-03 — Telemetry ingestion
- Endpoint: `POST /api/v1/telemetry/ingest`.
- Accept one event or a batch of up to 100 events.
- Validate JSON size, event count, timestamp, service name, severity, status code, latency, and bounded attributes.
- Return a request identifier, accepted count, rejected count, and per-item validation errors where appropriate.
- Authenticate with `Authorization: Bearer <api-key>` or `x-api-key`.
- Support signed requests using `x-pulse-timestamp` and `x-pulse-signature`; reject stale timestamps and invalid signatures when signature headers are supplied. The signing secret is the random key secret, which is not persisted.
- Enforce rate and monthly usage limits using persisted usage records/atomic database operations.
- Record server-observed request region when available; do not infer or fabricate edge nodes.

### FR-04 — Event model and retention
Each event may include:
- id, workspace_id, occurred_at, received_at
- service, event_name, message, severity
- status_code, latency_ms, region
- attributes (bounded JSON object)
- source/request correlation identifiers where supplied

Use indexes for workspace/time, workspace/service/time, severity/time, and status code. Do not retain unnecessary client IP data by default. Provide a configurable retention setting in a later milestone; the first release documents the initial retention policy.

### FR-05 — Live event feed
- Subscribe to persisted event inserts using Supabase Realtime (or a server-side SSE relay if the deployment model requires it).
- Scope subscriptions to the active workspace.
- Show connection state, pause/resume, service/severity filters, and event details.
- A disconnected stream must show a disconnected/reconnecting state rather than continuing to animate fake data.

### FR-06 — Analytics
- Calculate totals from stored events for selectable periods (1h, 24h, 7d, 30d).
- Include event throughput, error count/rate, p50/p95/p99 latency, status-code distribution, severity distribution, top services, and observed regions.
- Handle empty datasets without misleading percentages or zero-latency claims.
- Use database-side aggregation for bounded queries.

### FR-07 — Search and vector indexing
- Provide structured keyword filtering immediately.
- When an embedding provider is configured, create vector embeddings for event text and store them in pgvector.
- Provide semantic similarity search over a tenant's events with workspace checks and bounded result counts.
- Provider credentials must remain server-side.
- When embedding credentials are absent or indexing is pending, label semantic search as unavailable and offer keyword search. Do not label keyword matching as vector or semantic AI search.
- Make embedding model and vector dimensions explicit and consistent with the database schema.

### FR-08 — Alerts and anomaly signals
- Allow workspace users with management permission to create, edit, enable/disable, and delete threshold rules.
- Initial conditions: event error rate, latency threshold, and severity/error event count over a time window.
- Evaluate rules against persisted events or the ingestion transaction; prevent repeated duplicate alerts within a cooldown window.
- Record alert state, trigger time, observed value, threshold, and related event/service.
- Provide a workspace alert history.
- Implement a transparent statistical anomaly signal (moving baseline) only after sufficient historical samples exist; otherwise report insufficient baseline data.
- External email/webhook delivery is an optional integration and must be disabled until its provider and safe destination validation are configured.

### FR-09 — Cloud console
- Show API keys with prefix, label, scopes, created date, last-used date, and status.
- Show actual event usage for the current month and configured quota.
- Include API key creation, one-time display, copy, revoke, and usage views.
- Show actual database/stream/embedding-provider readiness and observed request-region counts.
- Do not display hard-coded production, SLA, 48.2M, 128 nodes, or uptime claims.

### FR-10 — Health and readiness
- Public liveness route: `GET /api/health`.
- Readiness route reports database connectivity and required configuration without returning credentials.
- Differentiate healthy, degraded, and not-configured states.
- Include request region/deployment metadata only when supplied by the hosting runtime.

## 7. External API contract

### Ingest event
`POST /api/v1/telemetry/ingest`

Example:
```json
{
  "service": "checkout-api",
  "event_name": "payment.authorized",
  "message": "Payment authorization completed",
  "severity": "info",
  "status_code": 200,
  "latency_ms": 84,
  "occurred_at": "2026-11-03T09:30:00.000Z",
  "region": "bom1",
  "attributes": { "provider": "test-gateway", "environment": "staging" }
}
```

A batch is `{ "events": [ ... ] }` with a maximum of 100 records.

### Analytics
`GET /api/v1/analytics/summary?range=24h` — authenticated workspace session, workspace-scoped aggregate results.

### Event search
`GET /api/v1/telemetry/events?range=24h&service=checkout-api&severity=error&limit=50` — authenticated workspace session.

### Semantic search
`POST /api/v1/search/semantic` — authenticated workspace session; provider-enabled similarity search or clearly labelled keyword fallback.

### API keys
`GET/POST /api/v1/api-keys`, `DELETE /api/v1/api-keys/:id` — authenticated workspace session and management permission.

### Alert rules
`GET/POST /api/v1/alerts/rules`, `PATCH/DELETE /api/v1/alerts/rules/:id`; `GET /api/v1/alerts/history`.

## 8. Data architecture

Primary store: PostgreSQL on Supabase. Proposed tables:
- `workspaces`
- `workspace_members`
- `api_keys`
- `telemetry_events`
- `event_embeddings` (pgvector, provider/model-specific)
- `alert_rules`
- `alert_events`
- `ingestion_usage` (or atomic quota counters)

Use indexes and RLS for all tenant-owned tables. API keys are server-only rows. User-facing views must exclude secret hashes and use invoker security. Public Data API access is limited to the minimum required roles. Privileged server operations use a server-only service-role credential.

## 9. Security and privacy requirements

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, embedding secrets, or API-key digests in client bundles or API responses.
- Enforce RLS on every exposed tenant table.
- Resolve user identity from verified Supabase server sessions, not client-supplied IDs.
- Hash API key secrets and use constant-time comparison where applicable.
- Verify HMAC signatures over the exact raw request body and a bounded timestamp window.
- Limit request size, batch size, query range, and result count.
- Use parameterized SQL/RPC; never interpolate user-controlled SQL.
- Avoid logging credentials or full authorization headers.
- Apply secure defaults and return generic authentication errors.
- Document environment setup and key rotation.

## 10. UX and design

- Preserve the existing dark obsidian / navy interface with cyan, indigo, and emerald accents.
- Use accessible keyboard-operable controls, labelled forms, loading states, empty states, and actionable error states.
- The dashboard should emphasize useful metrics and real event activity rather than decorative infrastructure counters.
- Clearly distinguish live data, historical data, demo fixtures, and unconfigured providers.
- Provide a developer quickstart with cURL and Python examples.

## 11. Acceptance criteria

The first production-ready release is accepted only when:
1. A new user can authenticate and reach a workspace without accessing another tenant's records.
2. A user can create and revoke an API key; the complete token is shown only once.
3. A correctly authenticated single event and batch are persisted.
4. Missing, revoked, expired-signature, and invalid-signature requests are rejected.
5. Persisted event inserts become visible in the live feed without full-page refresh.
6. Dashboard metrics and historical charts are computed from database records.
7. Workspace filtering and RLS prevent cross-tenant data reads.
8. Search reports whether vector indexing is available and never claims keyword fallback is semantic AI.
9. Alert rules can be managed and triggered alert history is stored.
10. Health endpoints report real configuration and database readiness.
11. CI passes type checking, linting, and production build.
12. Setup instructions explain database initialization, Vercel environment variables, and any optional embedding/notification integrations.

## 12. Implementation phases

### Phase 0 — Product definition
- Commit this PRD before application implementation.
- Keep the existing public landing page and reframe unsupported claims.

### Phase 1 — Foundation
- Add typed environment validation, Supabase browser/server clients, auth/session handling, workspace bootstrap, SQL bootstrap schema, and secure server-only database helpers.
- Add setup documentation and environment example.

### Phase 2 — Ingestion and API security
- Implement event validation, API-key issue/list/revoke, HMAC verification, ingestion quotas, and event persistence.
- Add health/readiness endpoints and tests.

### Phase 3 — Product console
- Replace fake homepage stream with actual persisted Realtime events.
- Implement analytics APIs and dashboard cards/charts.
- Add event filters, event details, and workspace key management.

### Phase 4 — Intelligence and alerts
- Add vector schema and provider adapter, semantic search and explicit keyword fallback.
- Add threshold rules, anomaly baseline checks, and alert history.

### Phase 5 — Release hardening
- Add sample integration snippets, API documentation, CI checks, security notes, and deployment verification.
- Verify preview and production only after required database/provider configuration is present.

## 13. External configuration and rollout dependencies

Required for a live deployment:
- Active Supabase project dedicated to PulseMetrics.
- `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL` for server-only use).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / publishable key.
- `SUPABASE_SERVICE_ROLE_KEY` (server-only).
- `API_KEY_PEPPER` if the final implementation uses a server-side key pepper; it must be generated and kept private.
- Supabase schema/bootstrap SQL applied and Auth redirect URLs configured.
- Vercel team/project access for environment and deployment verification.

Optional:
- Embedding provider endpoint/model/API key for vector semantic search.
- Notification provider credentials for email or webhook delivery.

No production secrets are committed to Git. A Vercel deployment without the database variables must render a clear configuration-required state and must not fall back to fake data.

## 14. Success metrics

- Valid ingestion acceptance rate and rejected-event reasons.
- Time from persisted event insert to dashboard visibility.
- p50/p95/p99 event-processing and query latency measured from actual requests.
- Percentage of workspaces with configured alert rules.
- Search latency and semantic-index coverage when embeddings are enabled.
- Zero cross-workspace reads in automated authorization tests.
