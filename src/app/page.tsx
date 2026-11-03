import Link from "next/link";
import { Activity, ArrowRight, BellRing, Database, KeyRound, Search, ShieldCheck, Zap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const capabilities = [
  { icon: Database, title: "Durable telemetry ingestion", description: "Accept single events or batches through a scoped API key. Validate and persist each event in a workspace-isolated Postgres database." },
  { icon: Activity, title: "Live observability", description: "Track request volume, error rates, p50/p95/p99 latency, service breakdowns and recent events from your stored telemetry." },
  { icon: Search, title: "Log investigation", description: "Filter by service, severity and message. Enable vector embeddings for similarity search, with keyword search clearly identified as a fallback." },
  { icon: BellRing, title: "Threshold alerts", description: "Define error-rate, error-count and p95 latency thresholds. Inspect alert history and cooldown-protected rule triggers." },
  { icon: KeyRound, title: "API key controls", description: "Create scoped ingestion credentials, reveal each secret once, track last use and revoke compromised keys." },
  { icon: ShieldCheck, title: "Workspace isolation", description: "Keep workspace records separated with server-side authorization, API scopes and PostgreSQL row-level security." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#060a14]">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-indigo-950/70">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 left-1/4 w-[600px] h-[450px] rounded-full bg-cyan-500/10 blur-[130px]" />
            <div className="absolute top-20 right-0 w-[440px] h-[360px] rounded-full bg-indigo-600/10 blur-[130px]" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 text-xs font-semibold text-cyan-300">
              <Activity className="w-3.5 h-3.5" /> Cloud observability for application teams
            </div>
            <h1 className="mt-7 text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.08]">
              Understand every event.
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400">Operate with confidence.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              PulseMetrics collects application telemetry, turns persisted events into useful performance analytics, and helps engineering teams investigate incidents before they become bigger problems.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/10 hover:from-cyan-500 hover:to-indigo-500">
                Open your workspace <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/explore" className="inline-flex items-center gap-2 rounded-xl border border-indigo-900 bg-[#090f20] px-6 py-3 text-sm font-semibold text-slate-200 hover:text-white">
                Explore architecture
              </Link>
            </div>
            <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-indigo-950 bg-[#080d1a]/90 p-5 text-left shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3 border-b border-indigo-950 pb-3">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /><span className="text-xs font-semibold text-slate-300">Telemetry ingestion quickstart</span></div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">HTTP API</span>
              </div>
              <pre className="mt-4 overflow-x-auto text-xs sm:text-sm leading-6 text-cyan-100"><code>{'curl -X POST "$PULSEMETRICS_URL/api/v1/telemetry/ingest" \\\n  -H "Authorization: Bearer $PULSEMETRICS_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{ "service": "checkout-api", "event_name": "payment.authorized", "severity": "info", "status_code": 200, "latency_ms": 84 }\''}</code></pre>
              <p className="text-[11px] text-slate-500 mt-3">Events appear after your workspace database and ingestion key are configured. Empty workspaces show empty states, never fabricated production counters.</p>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-400 font-semibold">Platform capabilities</p>
            <h2 className="text-3xl sm:text-4xl text-white font-bold mt-3">From raw events to operational clarity</h2>
            <p className="text-sm text-slate-400 mt-3">A practical observability workflow with real persisted data, scoped access and clear provider status.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {capabilities.map((item) => <article key={item.title} className="rounded-2xl border border-indigo-950 bg-[#090f20] p-6 hover:border-cyan-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl border border-cyan-500/20 bg-cyan-500/10 grid place-items-center"><item.icon className="w-5 h-5 text-cyan-400" /></div>
              <h3 className="mt-5 font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.description}</p>
            </article>)}
          </div>
        </section>

        <section className="border-y border-indigo-950 bg-[#040710]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div><div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider"><Zap className="w-4 h-4" /> Built for measurable operations</div><h2 className="text-2xl font-bold text-white mt-3">Start with your first real telemetry event.</h2><p className="text-sm text-slate-400 mt-2">Create a workspace, issue an API key and connect an application.</p></div>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-3 text-sm font-semibold text-white shrink-0">Get started <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}