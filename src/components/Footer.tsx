import React from "react";
import Link from "next/link";
import { Activity, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-indigo-950/70 bg-[#050811] text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-400" /><span className="font-bold text-white text-base">PulseMetrics Cloud Analytics</span></div>
          <p className="text-slate-400 max-w-sm text-xs leading-relaxed">Workspace-based telemetry ingestion, operational analytics, log investigation and threshold alerting for application teams.</p>
          <div className="text-xs text-slate-500 pt-2 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /><span>Metrics are calculated from persisted telemetry. Unconfigured services are identified explicitly.</span></div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Product</h4>
          <ul className="space-y-2 text-xs"><li><Link href="/dashboard" className="hover:text-white">Telemetry console</Link></li><li><Link href="/search" className="hover:text-white">Event search</Link></li><li><Link href="/alerts" className="hover:text-white">Alert management</Link></li><li><Link href="/explore" className="hover:text-white">Architecture</Link></li></ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Developer resources</h4>
          <ul className="space-y-2 text-xs"><li><Link href="/explore" className="hover:text-white">Getting started</Link></li><li><Link href="/login" className="hover:text-white">Workspace access</Link></li><li><a href="https://github.com/harshvshah12/pulsemetrics-analytics" target="_blank" rel="noreferrer" className="hover:text-white">Source repository</a></li></ul>
        </div>
      </div>
      <div className="border-t border-indigo-950/60 max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <p>© {new Date().getFullYear()} PulseMetrics Cloud Analytics.</p>
        <p>Built with Next.js, Supabase and PostgreSQL.</p>
      </div>
    </footer>
  );
}