# PulseMetrics API guide

Base URL: `https://YOUR-PULSEMETRICS-DOMAIN`

Create API keys in the signed-in workspace console. A token is returned once in the create response. Store it in your application's secret manager; PulseMetrics stores only the SHA-256 digest.

## 1. Ingest telemetry

Endpoint: `POST /api/v1/telemetry/ingest`

Required scope: `telemetry:write`

Single event example:

~~~bash
curl -X POST "$PULSEMETRICS_URL/api/v1/telemetry/ingest" \
  -H "Authorization: Bearer $PULSEMETRICS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "checkout-api",
    "event_name": "payment.authorized",
    "message": "Payment authorization completed",
    "severity": "info",
    "status_code": 200,
    "latency_ms": 84,
    "region": "bom1",
    "attributes": {
      "environment": "staging",
      "provider": "test-gateway"
    }
  }'
~~~

Batch example:

~~~json
{
  "events": [
    {
      "service": "checkout-api",
      "event_name": "payment.authorized",
      "severity": "info",
      "status_code": 200,
      "latency_ms": 84
    },
    {
      "service": "checkout-api",
      "event_name": "payment.declined",
      "message": "The test gateway declined this transaction",
      "severity": "warn",
      "status_code": 402,
      "latency_ms": 96
    }
  ]
}
~~~

A batch can contain 1–100 events. The complete HTTP request body is limited to 1 MB. Every event must include a service name. Supported severity values are `debug`, `info`, `warn`, `error`, and `critical`.

Successful response (HTTP 202):

~~~json
{
  "status": "accepted",
  "requestId": "generated-request-id",
  "accepted": 2,
  "rejected": 0,
  "indexed": 0,
  "searchMode": "keyword_fallback",
  "receivedAt": "2026-11-03T09:30:00.000Z"
}
~~~

The indexed count is zero when no embedding provider is configured. A stored event is not rejected merely because optional embedding indexing fails.

## 2. Optional HMAC request signatures

API-key authentication is required. HMAC signatures add body-integrity and timestamp verification.

Headers:
- `x-pulse-timestamp`: Unix epoch seconds.
- `x-pulse-signature`: 64-character hex HMAC-SHA256 digest.

The signing key is the secret portion after the dot in your API token. The signed message is the exact string `<timestamp>.<raw-request-body>`. The timestamp must be within five minutes of the server clock. Send both signature headers or neither.

Example (bash):

~~~bash
TIMESTAMP=$(date +%s)
BODY='{"service":"checkout-api","event_name":"health.check","severity":"info","status_code":200}'
API_SECRET=$(echo "$PULSEMETRICS_API_KEY" | rev | cut -d. -f1 | rev)
SIGNATURE=$(printf '%s' "$TIMESTAMP.$BODY" | openssl dgst -sha256 -hmac "$API_SECRET" -hex | awk '{print $NF}')

curl -X POST "$PULSEMETRICS_URL/api/v1/telemetry/ingest" \
  -H "Authorization: Bearer $PULSEMETRICS_API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-pulse-timestamp: $TIMESTAMP" \
  -H "x-pulse-signature: $SIGNATURE" \
  --data-binary "$BODY"
~~~

## 3. Python integration

~~~python
import os
import requests

url = os.environ["PULSEMETRICS_URL"].rstrip("/")
api_key = os.environ["PULSEMETRICS_API_KEY"]

event = {
    "service": "orders-api",
    "event_name": "order.created",
    "message": "Order persisted",
    "severity": "info",
    "status_code": 201,
    "latency_ms": 42.5,
    "attributes": {"environment": "production"},
}

response = requests.post(
    f"{url}/api/v1/telemetry/ingest",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    },
    json=event,
    timeout=10,
)
response.raise_for_status()
print(response.json())
~~~

Install the client with `python -m pip install requests`. Do not hard-code the API token in source code or commit it to version control.

## 4. Read telemetry

Endpoint: `GET /api/v1/telemetry/events`

Use either the signed-in user's session or a key with `telemetry:read` scope. Query parameters:
- `range`: `1h`, `24h`, `7d`, or `30d`.
- `limit`: 1–100, default 50.
- `service`: exact service name.
- `severity`: supported severity value.
- `status`: three-digit HTTP status code.
- `q`: text filter for message.

~~~bash
curl "$PULSEMETRICS_URL/api/v1/telemetry/events?range=24h&service=checkout-api&severity=error&limit=25" \
  -H "Authorization: Bearer $PULSEMETRICS_READ_KEY"
~~~

## 5. Analytics and anomaly signals

- `GET /api/v1/analytics/summary?range=24h` returns event totals, error counts/rates, latency percentiles, series, top services, regions, and current-month quota consumption.
- `GET /api/v1/analytics/anomalies` compares the current five-minute event/error counts with twelve prior five-minute buckets.

Anomaly status is `insufficient_baseline` until the baseline contains at least ten events. The detector is statistical, not a trained machine-learning model.

## 6. Search

Endpoint: `POST /api/v1/search/semantic`

~~~bash
curl -X POST "$PULSEMETRICS_URL/api/v1/search/semantic" \
  -H "Authorization: Bearer $PULSEMETRICS_READ_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"payment authorization failures"}'
~~~

The response includes a `mode`:
- `semantic`: embedding-based pgvector similarity search was used.
- `keyword_fallback`: embeddings are not configured or are unavailable; results use text matching and must not be interpreted as semantic similarity.

The bundled SQL schema uses 1536-dimensional vectors. Configure the embedding provider with a model that returns exactly that dimension.

## 7. API key management and alerts

API key management (workspace owner/admin session):
- `GET /api/v1/api-keys`
- `POST /api/v1/api-keys` with `{"label":"payments service","scope":"write"}` or `{"label":"analytics client","scope":"read"}`
- `DELETE /api/v1/api-keys/{id}`

Alert management (workspace session; create/update/delete require owner/admin):
- `GET /api/v1/alerts/rules`
- `POST /api/v1/alerts/rules`
- `PATCH /api/v1/alerts/rules/{id}`
- `DELETE /api/v1/alerts/rules/{id}`
- `GET /api/v1/alerts/history`

Supported alert metrics are `error_rate` (percentage), `error_count` and `p95_latency_ms`. Rules are checked during ingestion and use cooldown suppression. Scheduled alert checks and outbound email/webhook delivery are not configured in this release.

## 8. Errors and limits

| HTTP status | Meaning |
| --- | --- |
| 202 | Events accepted and persisted |
| 400 | Invalid JSON or event fields |
| 401 | Missing, invalid, revoked key or invalid HMAC |
| 403 | Key scope or workspace permission denied |
| 413 | Request body larger than 1 MB |
| 429 | Per-key request limit or monthly quota exceeded |
| 503 | Database, quota RPC or required service not configured |

Default ingestion limits: 100 events per request, 1 MB per request, 120 requests per minute per API key, and the workspace's configured monthly event quota.