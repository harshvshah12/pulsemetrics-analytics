"use client";

import { useState, type FormEvent } from "react";
import { Search, Sparkles, AlertCircle, Clock3 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type SearchResult = {
  event_id?: string; id?: string; service: string; event_name?: string | null; message?: string | null;
  severity: string; status_code?: number | null; latency_ms?: number | null; occurred_at: string;
  similarity?: number;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [mode, setMode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError("");
    setResults([]);
    try {
      const response = await fetch("/api/v1/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Search failed.");
      setResults(payload.results || []);
      setMode(payload.mode || "keyword_fallback");
      setNote(payload.note || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#060a14]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-400 font-semibold">Investigation</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2">Search telemetry</h1>
        <p className="text-sm text-slate-400 mt-2">Describe an incident or search for a service, error message, or event.</p>
        <form onSubmit={search} className="mt-8 rounded-2xl border border-indigo-950 bg-[#090f20] p-3 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 px-3"><Search className="w-5 h-5 text-slate-500 shrink-0" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. payment authorization failures" className="w-full bg-transparent text-white text-sm outline-none py-2" /></div>
          <button disabled={busy} className="rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-semibold px-5 py-3">{busy ? "Searching…" : "Search events"}</button>
        </form>
        {error && <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 p-4 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        {mode && <div className="mt-5 rounded-xl border border-indigo-950 bg-[#090f20] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="w-4 h-4 text-cyan-400" />{mode === "semantic" ? "Vector similarity results" : "Keyword search results"}</div>
          <p className="text-xs text-slate-400 mt-1">{note}</p>
        </div>}
        {mode && <div className="mt-4 space-y-3">
          {results.length ? results.map((result) => <article key={result.event_id || result.id} className="rounded-2xl border border-indigo-950 bg-[#090f20] p-5">
            <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-white text-sm">{result.service}</span><span className={"text-[10px] uppercase px-2 py-1 rounded-md " + (result.severity === "error" || result.severity === "critical" ? "bg-rose-500/10 text-rose-300" : "bg-cyan-500/10 text-cyan-300")}>{result.severity}</span>{result.status_code && <span className="text-xs text-slate-500">HTTP {result.status_code}</span>}</div>
            <p className="text-sm text-slate-300 mt-3">{result.message || result.event_name || "Telemetry event"}</p>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{new Date(result.occurred_at).toLocaleString()}</span>{result.latency_ms != null && <span>{result.latency_ms.toFixed(1)}ms</span>}{result.similarity != null && <span>Similarity {(result.similarity * 100).toFixed(1)}%</span>}</div>
          </article>) : <p className="text-sm text-slate-500 py-10 text-center">No matching events found for this query.</p>}
        </div>}
      </main>
      <Footer />
    </div>
  );
}