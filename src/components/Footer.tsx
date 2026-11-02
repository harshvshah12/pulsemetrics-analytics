import React from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-indigo-950/70 bg-[#050811] text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-white text-base">PulseMetrics Cloud Analytics</span>
          </div>
          <p className="text-slate-400 max-w-sm text-xs leading-relaxed">
            Distributed edge observability platform with sub-15ms global latency, live stream logs, and automated vector indexing.
          </p>
          <div className="text-xs text-slate-500 pt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>All 48 Edge Clusters Operational (99.999% SLA)</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Product</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/" className="hover:text-white transition-colors">Real-time Telemetry</Link></li>
            <li><Link href="/explore" className="hover:text-white transition-colors">Distributed Pipeline</Link></li>
            <li><Link href="/dashboard" className="hover:text-white transition-colors">Console & API Keys</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">System Stack</h4>
          <ul className="space-y-2 text-xs text-slate-500">
            <li>Runtime: Next.js 15 App Router Edge</li>
            <li>Latency: Sub-15ms p95 Global</li>
            <li>Security: mTLS & Automated TLS 1.3</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-indigo-950/60 max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <p>© {new Date().getFullYear()} PulseMetrics Cloud Analytics. Distributed Cloud Infrastructure.</p>
        <p className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Deployed autonomously via VoxBuild AI</span>
        </p>
      </div>
    </footer>
  );
}
