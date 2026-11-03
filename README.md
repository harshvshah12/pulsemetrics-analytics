# PulseMetrics Cloud Analytics

PulseMetrics is a workspace-based observability application for collecting application telemetry, inspecting service performance, searching operational events, and managing threshold alerts.

The current implementation replaces the original static dashboard with authenticated APIs and persisted Postgres telemetry. Product metrics are calculated from stored records; empty installations show empty states rather than invented production counters.

## Stack

- Next.js 15 App Router, React 19, TypeScript and Tailwind CSS
- Supabase Auth with cookie-based server sessions
- PostgreSQL with workspace-level Row Level Security
- Supabase Realtime for event inserts
- Zod validation and scoped API keys
- Optional pgvector semantic search through an OpenAI-compatible embeddings API
- Vercel deployment

## Quick start

1. Create a **dedicated Supabase project for PulseMetrics**. Do not reuse a database belonging to another application.
2. Open the Supabase SQL Editor and apply the complete contents of `supabase/schema.sql`.
3. Enable Email/Password in Supabase Authentication. Add your local and production callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-DOMAIN/auth/callback`
4. Copy `.env.example` to `.env.local` and set the variables below.
5. Install dependencies and run the development server.

~~~bash
npm install
cp .env.example .env.local
npm run dev
~~~

Required variables:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (or legacy anon key) |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key (or legacy service_role key) |

Optional semantic-search variables:

| Variable | Description |
| --- | --- |
| `EMBEDDING_API_URL` | OpenAI-compatible API base URL, default `https://api.openai.com/v1` |
| `EMBEDDING_API_KEY` | Server-only embedding provider key |
| `EMBEDDING_MODEL` | Embedding model identifier, default `text-embedding-3-small` |
| `EMBEDDING_DIMENSIONS` | Must be 1536 for the bundled pgvector schema |

The service-role/secret key and embedding API key must never use the `NEXT_PUBLIC_` prefix. The browser receives only the publishable key. Keep `.env.local` out of version control.

## First use

1. Open `/login` and create an account.
2. Confirm the email if confirmation is enabled.
3. Sign in. The database trigger creates a personal workspace and owner membership for a new Auth user.
4. Open the telemetry console and create an API key with the required scope.
5. Copy the token when it is displayed. It is returned once; only its SHA-256 digest is stored.
6. Send a test event using the API examples in [docs/API.md](docs/API.md).

## API overview

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/api/health` | Public readiness status |
| POST | `/api/v1/telemetry/ingest` | API key with `telemetry:write` |
| GET | `/api/v1/telemetry/events` | Session or `telemetry:read` key |
| GET | `/api/v1/analytics/summary` | Session or `telemetry:read` key |
| GET | `/api/v1/analytics/anomalies` | Session or `telemetry:read` key |
| POST | `/api/v1/search/semantic` | Session or `telemetry:read` key |
| GET/POST | `/api/v1/api-keys` | Workspace admin session |
| DELETE | `/api/v1/api-keys/:id` | Workspace admin session |
| GET/POST | `/api/v1/alerts/rules` | Session; admin required to create |
| PATCH/DELETE | `/api/v1/alerts/rules/:id` | Workspace admin session |
| GET | `/api/v1/alerts/history` | Workspace session |

Full request/response examples, signature calculation and Python usage are in [docs/API.md](docs/API.md).

## How the main features work

- **Ingestion:** single events and batches (up to 100 events) are validated, authenticated and stored in Postgres.
- **API credentials:** secrets use random bytes, are shown once and stored as SHA-256 digests. Keys have read or write scopes, revocation and per-key throttling.
- **HMAC:** optional request signatures use HMAC-SHA256 over the timestamp and exact raw request body. If either signature header is sent, both are required and the timestamp must be within five minutes.
- **Realtime:** the browser subscribes to workspace-filtered Postgres Changes for new telemetry rows.
- **Analytics:** event counts, errors, error rate and p50/p95/p99 latency are database aggregates over stored events.
- **Vector search:** when a compatible provider is configured, incoming events receive 1536-dimensional embeddings and search uses pgvector similarity. Without a provider, the app explicitly reports keyword fallback.
- **Alerts:** threshold rules monitor error rate, error count and p95 latency over a rolling window. Evaluation currently runs when telemetry is ingested and uses a per-rule cooldown.
- **Anomaly signal:** current five-minute traffic is compared with twelve previous five-minute windows. The feature reports insufficient baseline until there are enough persisted events.

## Deployment

Configure the required variables in the Vercel project for both Preview and Production, then deploy the branch. Set the Supabase Auth Site URL and redirect allow-list to the matching Vercel/custom domains.

The Vercel deployment does not itself provide a 128-node edge fleet, BGP Anycast routing, or a contractual uptime SLA. Region labels are shown only when request metadata is provided by the host or by the event producer. Health status reflects actual configuration and database connectivity.

## Current scope and limitations

- External email and webhook notification delivery is not enabled.
- Alert evaluation is ingestion-driven; scheduled evaluations during quiet periods are not configured.
- Anomaly detection is statistical and baseline-based, not a trained ML model.
- Embedding provider setup is optional; keyword search remains available without it.
- Workspace member invitation and billing management are not part of this release.

## Quality checks

~~~bash
npm run typecheck
npm run lint
npm run build
~~~

Database setup and API-level verification also require an active dedicated Supabase project.