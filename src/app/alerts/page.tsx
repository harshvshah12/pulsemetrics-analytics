"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, Pause, Plus, Trash2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type Rule = {
  id: string; name: string; metric: string; operator: string; threshold: number;
  window_minutes: number; cooldown_minutes: number; enabled: boolean; last_triggered_at?: string | null;
};
type AlertEvent = {
  id: string; rule_name: string; metric: string; observed_value: number;
  threshold: number; triggered_at: string;
};

export default function AlertsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [history, setHistory] = useState<AlertEvent[]>([]);
  const [name, setName] = useState("High API error rate");
  const [metric, setMetric] = useState("error_rate");
  const [threshold, setThreshold] = useState("5");
  const [windowMinutes, setWindowMinutes] = useState("5");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/v1/alerts/rules", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Alert rules could not be loaded.");
      setRules(payload.rules || []);
      setHistory(payload.history || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Alerts are unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void Promise.resolve().then(load); }, []);

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, metric, threshold: Number(threshold), window_minutes: Number(windowMinutes) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Rule could not be created.");
      setRules((current) => [payload.rule, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rule could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRule(rule: Rule) {
    const response = await fetch("/api/v1/alerts/rules/" + rule.id, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || "Could not update rule."); return; }
    setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item));
  }

  async function deleteRule(rule: Rule) {
    if (!window.confirm("Delete this alert rule? Its historical alerts will be retained.")) return;
    const response = await fetch("/api/v1/alerts/rules/" + rule.id, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || "Could not delete rule."); return; }
    setRules((current) => current.filter((item) => item.id !== rule.id));
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#060a14]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-400 font-semibold">Reliability</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2">Alert management</h1>
          <p className="text-sm text-slate-400 mt-2">Threshold rules are evaluated against persisted telemetry when events are ingested.</p>
        </div>
        {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 p-4 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <section className="rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
            <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-cyan-400" /><h2 className="font-semibold text-white">Create threshold rule</h2></div>
            <form onSubmit={createRule} className="mt-5 space-y-4">
              <label className="block text-xs text-slate-400">Rule name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" /></label>
              <label className="block text-xs text-slate-400">Metric<select value={metric} onChange={(event) => setMetric(event.target.value)} className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white">
                <option value="error_rate">Error rate (%)</option><option value="p95_latency_ms">p95 latency (ms)</option><option value="error_count">Error count</option>
              </select></label>
              <label className="block text-xs text-slate-400">Trigger threshold<input type="number" min="0" step="any" required value={threshold} onChange={(event) => setThreshold(event.target.value)} className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" /></label>
              <label className="block text-xs text-slate-400">Evaluation window<select value={windowMinutes} onChange={(event) => setWindowMinutes(event.target.value)} className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"><option value="1">1 minute</option><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="60">1 hour</option></select></label>
              <p className="text-[11px] text-slate-500">Each rule has a 15-minute notification cooldown. External delivery is not configured in this release.</p>
              <button disabled={busy} className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5">{busy ? "Saving…" : "Create alert rule"}</button>
            </form>
          </section>
          <section className="xl:col-span-2 rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Workspace rules</h2><span className="text-xs text-slate-500">{rules.length} rules</span></div>
            {loading ? <p className="text-sm text-slate-500 py-10">Loading rules…</p> : rules.length ? <div className="mt-4 space-y-3">
              {rules.map((rule) => <div key={rule.id} className="rounded-xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div><div className="flex items-center gap-2"><BellRing className="w-4 h-4 text-cyan-400" /><p className="font-medium text-white text-sm">{rule.name}</p></div>
                  <p className="text-xs text-slate-500 mt-2">{rule.metric} {rule.operator} {rule.threshold} · {rule.window_minutes} min window</p>
                  {rule.last_triggered_at && <p className="text-[11px] text-slate-600 mt-1">Last triggered {new Date(rule.last_triggered_at).toLocaleString()}</p>}
                </div>
                <div className="flex items-center gap-2"><span className={"text-[10px] px-2 py-1 rounded-md " + (rule.enabled ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400")}>{rule.enabled ? "Enabled" : "Paused"}</span>
                  <button onClick={() => void toggleRule(rule)} aria-label={rule.enabled ? "Pause rule" : "Enable rule"} className="p-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white"><Pause className="w-4 h-4" /></button>
                  <button onClick={() => void deleteRule(rule)} aria-label="Delete rule" className="p-2 rounded-lg border border-slate-800 text-rose-300 hover:text-rose-200"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>)}
            </div> : <div className="py-12 text-center"><CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" /><p className="text-sm text-slate-300 mt-3">No alert rules yet</p><p className="text-xs text-slate-500 mt-1">Create a threshold to start watching telemetry.</p></div>}
          </section>
        </div>
        <section className="rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Recent alert history</h2><span className="text-xs text-slate-500">{history.length} recent</span></div>
          {history.length ? <div className="mt-4 divide-y divide-indigo-950/70">
            {history.map((alert) => <div key={alert.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><p className="text-sm text-white">{alert.rule_name}</p><p className="text-xs text-slate-500 mt-1">{alert.metric} observed {Number(alert.observed_value).toFixed(2)} · threshold {alert.threshold}</p></div><time className="text-xs text-slate-500">{new Date(alert.triggered_at).toLocaleString()}</time></div>)}
          </div> : <p className="text-sm text-slate-500 py-8">No alerts have triggered. Rules are evaluated on new ingestion requests.</p>}
        </section>
        <p className="text-xs text-slate-600">Alert evaluation is ingestion-driven in this release. Scheduled checks during quiet periods and external email/webhook delivery are not enabled yet. <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300">Return to telemetry</Link>.</p>
      </main>
      <Footer />
    </div>
  );
}