import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Activity, Database, Globe2, KeyRound, Search, ShieldCheck, Zap } from "lucide-react";

const layers = [
  { icon: Zap, title: "Ingestion gateway", description: "Node.js route handlers validate event batches, check scoped API credentials, verify optional HMAC signatures and persist accepted records." },
  { icon: Database, title: "PostgreSQL event store", description: "Supabase Postgres stores telemetry with workspace identifiers, indexed timestamps, event severity, service names, latency and JSON attributes." },
  { icon: Activity, title: "Analytics and streaming", description: "Database-side aggregates calculate counts, error rate and latency percentiles. Supabase Realtime broadcasts row inserts to authorized workspace clients." },
  { icon: Search, title: "Search and vector index", description: "Keyword search is always available. When an embedding provider and pgvector schema are configured, events are indexed for similarity search." },
  { icon: ShieldCheck, title: "Workspace security", description: "Supabase Auth verifies sessions. Workspace membership is checked server-side and row-level security protects user-facing tables." },
  { icon: KeyRound, title: "Alert evaluation", description: "Ingestion invokes SQL threshold rules for error rates, error counts and p95 latency with per-rule cooldowns and persisted alert history." },
];

export default function CapabilitiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#060a14]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-400 font-semibold">Architecture</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-3">A measurable telemetry pipeline</h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mt-4">PulseMetrics is structured as a workspace-based observability application. Application events enter through an authenticated API, are stored in Postgres, and drive analytics, investigation and threshold alerts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-10">
          {layers.map((item, index) => <article key={item.title} className="rounded-2xl border border-indigo-950 bg-[#090f20] p-6">
            <div className="flex items-center justify-between"><div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 grid place-items-center"><item.icon className="w-5 h-5" /></div><span className="text-xs text-slate-600 font-mono">0{index + 1}</span></div>
            <h2 className="text-lg font-semibold text-white mt-5">{item.title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed mt-2">{item.description}</p>
          </article>)}
        </div>

        <section className="mt-8 rounded-2xl border border-indigo-950 bg-[#090f20] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider"><Globe2 className="w-4 h-4" /> Deployment and provider boundaries</div>
          <h2 className="text-xl font-semibold text-white mt-3">No imaginary infrastructure counters</h2>
          <p className="text-sm text-slate-400 leading-relaxed mt-3 max-w-4xl">The application can be deployed on Vercel, but that does not mean PulseMetrics owns a 128-node edge fleet, controls BGP Anycast routing, or provides a 99.999% SLA. The ingestion API records a hosting region only when the hosting platform includes request metadata. Database readiness and embedding availability are reported from actual configuration and connectivity checks.</p>
          <div className="flex flex-wrap gap-3 mt-6"><Link href="/dashboard" className="rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2.5">Open telemetry console</Link><Link href="/search" className="rounded-xl border border-slate-700 text-slate-200 hover:text-white px-4 py-2.5 text-sm">Search events</Link></div>
        </section>
      </main>
      <Footer />
    </div>
  );
}