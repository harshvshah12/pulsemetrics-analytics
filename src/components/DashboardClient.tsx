"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Check, Copy, KeyRound, RefreshCw, Server, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type EventRow = {
  id: string;
  service: string;
  event_name?: string | null;
  message?: string | null;
  severity: string;
  status_code?: number | null;
  latency_ms?: number | null;
  received_at: string;
  region?: string | null;
};
type Metrics = {
  totalEvents: number;
  errorCount: number;
  errorRate: number;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  series: { bucket: string; events: number; errors: number }[];
  topServices: { service: string; events: number }[];
  regions: { region: string; events: number }[];
};
type ApiKey = { id: string; key_prefix: string; label: string; scopes: string[]; created_at: string; last_used_at?: string | null; revoked_at?: string | null };
type Anomaly = { status: string; eventAnomaly?: boolean; errorAnomaly?: boolean; currentEvents?: number; baselineEvents?: number; averageEventsPerWindow?: number; currentErrors?: number; averageErrorsPerWindow?: number };

const EMPTY_METRICS: Metrics = {
  totalEvents: 0, errorCount: 0, errorRate: 0, p50LatencyMs: 0, p95LatencyMs: 0,
  p99LatencyMs: null, series: [], topServices: [], regions: [],
};

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatLatency(value: number | null) {
  return value == null ? "—" : value.toFixed(1) + " ms";
}

export function DashboardClient({ workspaceId, workspaceName, role }: { workspaceId: string; workspaceName: string; role: string }) {
  const [range, setRange] = useState("24h");
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState({ used: 0, quota: 1000000, remaining: 1000000, percent: 0 });
  const [anomaly, setAnomaly] = useState<Anomaly>({ status: "loading" });
  const [connection, setConnection] = useState("CONNECTING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("Production ingestion");
  const [scope, setScope] = useState("write");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [keyError, setKeyError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [analyticsResponse, eventsResponse, keysResponse, anomalyResponse] = await Promise.all([
        fetch("/api/v1/analytics/summary?range=" + range, { cache: "no-store" }),
        fetch("/api/v1/telemetry/events?range=" + range + "&limit=50", { cache: "no-store" }),
        fetch("/api/v1/api-keys", { cache: "no-store" }),
        fetch("/api/v1/analytics/anomalies", { cache: "no-store" }),
      ]);
      const analytics = await analyticsResponse.json();
      const eventPayload = await eventsResponse.json();
      const keyPayload = await keysResponse.json();
      const anomalyPayload = await anomalyResponse.json();
      if (!analyticsResponse.ok) throw new Error(analytics.error || "Analytics could not be loaded.");
      if (!eventsResponse.ok) throw new Error(eventPayload.error || "Telemetry events could not be loaded.");
      setMetrics({ ...EMPTY_METRICS, ...(analytics.summary || {}) });
      setUsage(analytics.usage || { used: 0, quota: 1000000, remaining: 1000000, percent: 0 });
      setEvents(eventPayload.events || []);
      setAnomaly(anomalyResponse.ok ? (anomalyPayload.anomaly || { status: "insufficient_baseline" }) : { status: "unavailable" });
      if (keysResponse.ok) setKeys(keyPayload.keys || []);
      else if (keysResponse.status !== 403) setKeyError(keyPayload.error || "API keys could not be loaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createBrowserSupabaseClient>["channel"]> | null = null;
    let supabase: ReturnType<typeof createBrowserSupabaseClient> | null = null;
    try {
      supabase = createBrowserSupabaseClient();
      channel = supabase.channel("pulsemetrics-events-" + workspaceId)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "telemetry_events",
          filter: "workspace_id=eq." + workspaceId,
        }, (payload) => {
          const next = payload.new as EventRow;
          setEvents((current) => [next, ...current.filter((event) => event.id !== next.id)].slice(0, 50));
          setMetrics((current) => ({ ...current, totalEvents: current.totalEvents + 1 }));
        })
        .subscribe((status) => {
          setConnection(status === "SUBSCRIBED" ? "LIVE" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "DISCONNECTED" : "CONNECTING");
        });
    } catch {
      setConnection("UNAVAILABLE");
    }
    return () => {
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  async function createKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setKeyError("");
    setNewToken("");
    try {
      const response = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, scope }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create API key.");
      setNewToken(payload.token);
      setKeys((current) => [payload.key, ...current]);
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "Could not create API key.");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this API key? Ingestion using it will stop immediately.")) return;
    const response = await fetch("/api/v1/api-keys/" + id, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setKeyError(payload.error || "Could not revoke key.");
      return;
    }
    setKeys((current) => current.map((key) => key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key));
  }

  async function copyToken() {
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const activeKeys = keys.filter((key) => !key.revoked_at).length;
  const maxEvents = Math.max(1, ...metrics.series.map((point) => point.events));

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-400 font-semibold">Workspace / {workspaceName}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">Telemetry overview</h1>
          <p className="text-sm text-slate-400 mt-2">Actual events persisted by your workspace. Nothing is generated in the browser.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={"inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold " + (connection === "LIVE" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200")}>
            {connection === "LIVE" ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {connection === "LIVE" ? "Realtime connected" : connection === "UNAVAILABLE" ? "Realtime unconfigured" : connection.toLowerCase()}
          </span>
          <select value={range} onChange={(event) => setRange(event.target.value)} className="bg-[#090f20] border border-indigo-950 rounded-xl px-3 py-2 text-sm text-white">
            <option value="1h">Last hour</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option>
          </select>
          <button onClick={() => void loadDashboard()} className="inline-flex items-center gap-2 rounded-xl border border-indigo-950 bg-[#090f20] px-3 py-2 text-sm text-slate-200 hover:border-cyan-500/40"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      {error && <div role="alert" className="flex gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-sm"><AlertTriangle className="w-5 h-5 shrink-0" />{error}</div>}

      <section className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: "Events received", value: formatNumber(metrics.totalEvents), icon: Activity, hint: range + " · stored records" },
          { label: "Error events", value: formatNumber(metrics.errorCount), icon: ShieldAlert, hint: metrics.totalEvents ? metrics.errorRate.toFixed(2) + "% of events" : "No data for this period" },
          { label: "p95 latency", value: formatLatency(metrics.p95LatencyMs), icon: Server, hint: "Based on recorded latency_ms" },
          { label: "Monthly ingestion", value: formatNumber(usage.used) + " / " + formatNumber(usage.quota), icon: KeyRound, hint: usage.percent.toFixed(1) + "% of configured quota" },
          { label: "Active API keys", value: role === "owner" || role === "admin" ? formatNumber(activeKeys) : "Restricted", icon: KeyRound, hint: role === "owner" || role === "admin" ? "Workspace credentials" : "Admin access required" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
            <div className="flex justify-between items-center text-slate-400 text-xs"><span>{item.label}</span><item.icon className="w-4 h-4 text-cyan-400" /></div>
            <div className="mt-3 text-2xl font-bold text-white">{loading ? "…" : item.value}</div>
            <p className="mt-1 text-[11px] text-slate-500">{item.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="font-semibold text-white">Event volume</h2><p className="text-xs text-slate-500 mt-1">Aggregated from persisted telemetry</p></div>
            <span className="text-xs text-slate-500">p50 {formatLatency(metrics.p50LatencyMs)} · p99 {formatLatency(metrics.p99LatencyMs)}</span>
          </div>
          {metrics.series.length ? <div className="mt-6 flex items-end gap-2 h-44">
            {metrics.series.map((point) => <div key={point.bucket} title={formatNumber(point.events) + " events"} className="flex-1 h-full flex flex-col justify-end gap-1">
              <div className="w-full rounded-t-md bg-cyan-500/80" style={{ height: Math.max(2, point.events / maxEvents * 100) + "%" }} />
              <div className="w-full rounded-b-md bg-rose-500/70" style={{ height: Math.max(0, point.errors / maxEvents * 100) + "%" }} />
            </div>)}
          </div> : <div className="mt-6 h-44 rounded-xl border border-dashed border-indigo-950 flex items-center justify-center text-sm text-slate-500">No telemetry has been received in this period.</div>}
          <div className="flex gap-4 mt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><i className="w-2 h-2 rounded-full bg-cyan-400" />Events</span><span className="inline-flex items-center gap-2"><i className="w-2 h-2 rounded-full bg-rose-400" />Errors</span></div>
        </div>
        <div className="rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
          <h2 className="font-semibold text-white">Top services</h2>
          <p className="text-xs text-slate-500 mt-1">By event volume</p>
          <div className="mt-5 space-y-4">
            {metrics.topServices.length ? metrics.topServices.map((service) => <div key={service.service}>
              <div className="flex justify-between gap-3 text-xs"><span className="text-slate-300 truncate">{service.service}</span><span className="text-slate-500">{formatNumber(service.events)}</span></div>
              <div className="h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500" style={{ width: (service.events / Math.max(1, metrics.topServices[0].events) * 100) + "%" }} /></div>
            </div>) : <p className="text-sm text-slate-500">Service breakdown appears after the first event arrives.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Observed regions</h2><p className="text-xs text-slate-500 mt-1">Region metadata supplied by events or hosting request headers</p></div><span className="text-xs text-slate-500">{metrics.regions.length} regions</span></div>
        {metrics.regions.length ? <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {metrics.regions.map((region) => <div key={region.region} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><p className="text-sm font-semibold text-white">{region.region}</p><p className="text-xs text-slate-500 mt-1">{formatNumber(region.events)} events</p></div>)}
        </div> : <p className="text-sm text-slate-500 mt-4">Regional breakdown appears when events include a region or the hosting platform supplies request-region metadata. No edge-node count is inferred.</p>}
      </section>

      <section className="rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Traffic anomaly signal</h2><p className="text-xs text-slate-500 mt-1">Current five-minute window versus twelve previous windows</p></div>
          <span className={"text-xs px-2.5 py-1 rounded-md " + (anomaly.status === "analyzed" && (anomaly.eventAnomaly || anomaly.errorAnomaly) ? "bg-rose-500/10 text-rose-300" : anomaly.status === "analyzed" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-200")}>{anomaly.status === "analyzed" ? (anomaly.eventAnomaly || anomaly.errorAnomaly ? "Anomaly detected" : "Within baseline") : anomaly.status === "insufficient_baseline" ? "Building baseline" : anomaly.status}</span>
        </div>
        {anomaly.status === "analyzed" ? <p className="text-sm text-slate-300 mt-4">Last window: {formatNumber(anomaly.currentEvents || 0)} events ({formatNumber(anomaly.currentErrors || 0)} errors). Baseline average: {(anomaly.averageEventsPerWindow || 0).toFixed(1)} events and {(anomaly.averageErrorsPerWindow || 0).toFixed(1)} errors per five minutes.</p> : <p className="text-sm text-slate-400 mt-4">At least ten historical events across the baseline are required before a traffic anomaly can be evaluated. No anomaly is assumed while history is insufficient.</p>}
      </section>

      <section className="rounded-2xl border border-indigo-950 bg-[#090f20] overflow-hidden">
        <div className="p-5 border-b border-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div><h2 className="font-semibold text-white">Recent telemetry</h2><p className="text-xs text-slate-500 mt-1">New inserts stream into this table when Realtime is connected.</p></div>
          <span className="text-xs text-slate-500">{events.length} displayed</span>
        </div>
        {events.length ? <div className="divide-y divide-indigo-950/70">
          {events.map((event) => <div key={event.id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{event.service}</span>
                <span className={"text-[10px] uppercase tracking-wide px-2 py-1 rounded-md " + (event.severity === "error" || event.severity === "critical" ? "bg-rose-500/10 text-rose-300" : event.severity === "warn" ? "bg-amber-500/10 text-amber-200" : "bg-cyan-500/10 text-cyan-300")}>{event.severity}</span>
                {event.status_code && <span className="text-xs text-slate-500">{event.status_code}</span>}
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate">{event.message || event.event_name || "Telemetry event"}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
              {event.latency_ms != null && <span>{event.latency_ms.toFixed(1)} ms</span>}
              {event.region && <span>{event.region}</span>}
              <time>{formatDate(event.received_at)}</time>
            </div>
          </div>)}
        </div> : <div className="p-12 text-center"><Activity className="w-8 h-8 text-slate-600 mx-auto" /><p className="text-sm text-slate-300 mt-3">Your event stream is empty</p><p className="text-xs text-slate-500 mt-1">Create an ingestion key below and send your first event.</p></div>}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
          <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-cyan-400" /><h2 className="font-semibold text-white">Create ingestion key</h2></div>
          {role === "owner" || role === "admin" ? <form onSubmit={createKey} className="mt-5 space-y-3">
            <label className="block text-xs text-slate-400">Key label<input value={label} onChange={(event) => setLabel(event.target.value)} required maxLength={80} className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" /></label>
            <label className="block text-xs text-slate-400">Scope<select value={scope} onChange={(event) => setScope(event.target.value)} className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"><option value="write">Write telemetry only</option><option value="read">Read telemetry</option></select></label>
            <button disabled={creating} className="rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5">{creating ? "Creating…" : "Generate API key"}</button>
          </form> : <p className="text-sm text-slate-500 mt-4">Workspace administrator permission is required to manage keys.</p>}
          {keyError && <p className="text-xs text-rose-300 mt-3">{keyError}</p>}
          {newToken && <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs font-semibold text-emerald-200">Copy this key now. It will not be shown again.</p>
            <code className="block break-all text-xs text-emerald-100 mt-2">{newToken}</code>
            <button onClick={() => void copyToken()} className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-200 hover:text-white">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? "Copied" : "Copy key"}</button>
            <p className="text-xs text-emerald-200/70 mt-2">The key is stored as a digest; the plaintext value cannot be recovered later.</p>
          </div>}
        </div>

        <div className="rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Workspace API keys</h2><span className="text-xs text-slate-500">{keys.length} total</span></div>
          <div className="mt-4 space-y-3">
            {keys.length ? keys.map((key) => <div key={key.id} className="rounded-xl border border-slate-800 p-3">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-white truncate">{key.label}</p><code className="text-xs text-slate-500">{key.key_prefix}…</code></div>
                <span className={"text-[10px] px-2 py-1 rounded-md " + (key.revoked_at ? "bg-slate-800 text-slate-400" : "bg-emerald-500/10 text-emerald-300")}>{key.revoked_at ? "Revoked" : "Active"}</span>
              </div>
              <div className="flex justify-between items-center mt-3"><span className="text-[11px] text-slate-500">{key.scopes.join(", ")} · {key.last_used_at ? "Used " + formatDate(key.last_used_at) : "Not used yet"}</span>
                {!key.revoked_at && (role === "owner" || role === "admin") && <button onClick={() => void revokeKey(key.id)} className="text-xs text-rose-300 hover:text-rose-200">Revoke</button>}
              </div>
            </div>) : <p className="text-sm text-slate-500">No API keys created yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}